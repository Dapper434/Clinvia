import { query } from '../config/db.js'

export async function getReports(req, res, next) {
  try {
    const { year, tb_type, status, facility } = req.query

    let sql = 'SELECT * FROM patients WHERE 1=1'
    const params = []

    if (tb_type && tb_type !== 'all') {
      params.push(tb_type)
      sql += ` AND tb_type = $${params.length}`
    }

    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND status = $${params.length}`
    }

    if (facility && facility !== 'all') {
      params.push(facility)
      sql += ` AND facility = $${params.length}`
    }

    if (year && year !== 'all') {
      params.push(parseInt(year, 10))
      sql += ` AND EXTRACT(YEAR FROM treatment_start) = $${params.length}`
    }

    sql += ' ORDER BY treatment_start DESC'

    const [patientsRes, doseLogsRes] = await Promise.all([
      query(sql, params),
      query('SELECT * FROM dose_logs'),
    ])

    const patients = patientsRes.rows
    const doseLogs = doseLogsRes.rows

    const logsMap = new Map()
    for (const log of doseLogs) {
      if (!logsMap.has(log.patient_id)) logsMap.set(log.patient_id, [])
      logsMap.get(log.patient_id).push(log)
    }

    // Attach calculated adherence to each patient
    const enriched = patients.map((p) => {
      const logs = logsMap.get(p.id) || []
      const takenCount = logs.filter((l) => l.taken).length
      return {
        ...p,
        dosesLogged: logs.length,
        dosesTaken: takenCount,
      }
    })

    res.json(enriched)
  } catch (err) {
    next(err)
  }
}
