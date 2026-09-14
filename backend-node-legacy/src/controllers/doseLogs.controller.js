import { query } from '../config/db.js'
import { isHospitalRole } from '../middleware/auth.js'

async function getOwnPatientId(userId) {
  const res = await query('SELECT id FROM patients WHERE user_id = $1 LIMIT 1', [userId])
  return res.rows[0]?.id || null
}

export async function getDoseLogs(req, res, next) {
  try {
    const { date, start_date, end_date } = req.query
    let { patient_id } = req.query

    if (req.user.role === 'patient') {
      const ownPatientId = await getOwnPatientId(req.user.id)
      if (!ownPatientId) {
        return res.status(404).json({ error: 'No patient record linked to your account' })
      }
      if (patient_id && patient_id !== ownPatientId) {
        return res.status(403).json({ error: 'You may only view your own dose logs' })
      }
      patient_id = ownPatientId
    } else if (!isHospitalRole(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    let sql = 'SELECT * FROM dose_logs WHERE 1=1'
    const params = []

    if (patient_id) {
      params.push(patient_id)
      sql += ` AND patient_id = $${params.length}`
    }

    if (date) {
      params.push(date)
      sql += ` AND date = $${params.length}`
    }

    if (start_date) {
      params.push(start_date)
      sql += ` AND date >= $${params.length}`
    }

    if (end_date) {
      params.push(end_date)
      sql += ` AND date <= $${params.length}`
    }

    sql += ' ORDER BY date ASC'

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
}

export async function upsertDoseLog(req, res, next) {
  try {
    const loggedBy = req.user?.id || null
    const payload = req.body

    // Handle single object or array of rows
    const rows = Array.isArray(payload) ? payload : [payload]

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No dose logs provided' })
    }

    let ownPatientId = null
    if (req.user.role === 'patient') {
      ownPatientId = await getOwnPatientId(req.user.id)
      if (!ownPatientId) {
        return res.status(404).json({ error: 'No patient record linked to your account' })
      }
    } else if (!isHospitalRole(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const results = []

    for (const row of rows) {
      // Patients may only ever write their own dose log, regardless of what the request body claims.
      const patient_id = ownPatientId || row.patient_id
      const { date, taken, notes } = row
      if (!patient_id || !date) {
        continue
      }

      const resRow = await query(
        `INSERT INTO dose_logs (patient_id, date, taken, notes, logged_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (patient_id, date)
         DO UPDATE SET
           taken = EXCLUDED.taken,
           notes = COALESCE(EXCLUDED.notes, dose_logs.notes),
           logged_by = EXCLUDED.logged_by
         RETURNING *`,
        [patient_id, date, Boolean(taken), notes || null, loggedBy]
      )
      results.push(resRow.rows[0])
    }

    res.json({ message: `Successfully logged ${results.length} dose record(s)`, data: results })
  } catch (err) {
    next(err)
  }
}
