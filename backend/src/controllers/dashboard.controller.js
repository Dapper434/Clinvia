import { query } from '../config/db.js'

export async function getDashboardStats(req, res, next) {
  try {
    const [patientsRes, logsRes] = await Promise.all([
      query('SELECT * FROM patients ORDER BY created_at DESC'),
      query('SELECT * FROM dose_logs ORDER BY date ASC'),
    ])

    const patients = patientsRes.rows
    const doseLogs = logsRes.rows

    // Aggregations
    const active = patients.filter((x) => x.status === 'active')

    // Logs by patient map
    const logsByPatient = new Map()
    for (const row of doseLogs) {
      if (!logsByPatient.has(row.patient_id)) logsByPatient.set(row.patient_id, [])
      logsByPatient.get(row.patient_id).push(row)
    }

    const now = new Date()
    const currentMonthPrefix = now.toISOString().slice(0, 7)
    const newThisMonth = patients.filter(
      (x) => x.created_at && new Date(x.created_at).toISOString().slice(0, 7) === currentMonthPrefix
    ).length

    let adherenceSum = 0
    let adherenceN = 0
    let highRisk = 0
    let ltfu = 0

    // Adherence calculation helper
    const calculatePct = (logs, treatmentStart) => {
      if (!treatmentStart) return 0
      const start = new Date(treatmentStart)
      start.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffDays = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1)
      const windowDays = Math.min(diffDays, 180) // 180 days standard regimen window
      if (windowDays <= 0) return 0
      const takenCount = logs.filter((l) => l.taken).length
      return Math.min(100, Math.round((takenCount / windowDays) * 100))
    }

    // LTFU check
    const checkLTFU = (logs) => {
      if (!logs.length) return true
      const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))
      const last = new Date(sorted[0].date)
      const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24))
      return diff >= 14
    }

    // Missed in last N days
    const missedInWindow = (logs, days = 3) => {
      const today = new Date()
      let missed = 0
      for (let i = 0; i < days; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        const log = logs.find((l) => l.date === dateStr)
        if (!log || !log.taken) missed++
      }
      return missed
    }

    const alerts = []

    for (const patient of active) {
      const logs = logsByPatient.get(patient.id) || []
      const pct = calculatePct(logs, patient.treatment_start)
      adherenceSum += pct
      adherenceN++
      if (pct < 80) highRisk++
      if (checkLTFU(logs)) ltfu++

      const missed = missedInWindow(logs, 3)
      if (missed > 0) {
        alerts.push({ patientId: patient.id, name: patient.name, missed })
      }
    }

    alerts.sort((a, b) => b.missed - a.missed)

    const avgAdherence = adherenceN ? Math.round(adherenceSum / adherenceN) : 0

    const outcomeCounts = { active: 0, completed: 0, lost: 0, died: 0 }
    for (const patient of patients) {
      if (outcomeCounts[patient.status] !== undefined) {
        outcomeCounts[patient.status]++
      }
    }

    // 6-month trend bar labels
    const barLabels = []
    const barValues = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleString('default', { month: 'short', year: 'numeric' })
      const prefix = d.toISOString().slice(0, 7)
      barLabels.push(monthStr)
      barValues.push(
        patients.filter((x) => x.created_at && new Date(x.created_at).toISOString().slice(0, 7) === prefix).length
      )
    }

    // 30-day compliance line
    const dayLabels = []
    const dayRatios = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleString('default', { month: 'short', day: 'numeric' })
      dayLabels.push(label)

      const rows = doseLogs.filter((r) => r.date === key)
      if (!rows.length) {
        dayRatios.push(0)
      } else {
        const taken = rows.filter((r) => r.taken).length
        dayRatios.push(Math.round((taken / rows.length) * 100))
      }
    }

    res.json({
      activeCount: active.length,
      newThisMonth,
      avgAdherence,
      highRisk,
      ltfu,
      alerts,
      outcomeCounts,
      barLabels,
      barValues,
      dayLabels,
      dayRatios,
      patients,
      doseLogs,
    })
  } catch (err) {
    next(err)
  }
}
