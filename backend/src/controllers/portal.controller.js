import { query } from '../config/db.js'

export async function getMyTreatment(req, res, next) {
  try {
    const userId = req.user.id

    // Find linked patient record
    let pRes = await query('SELECT * FROM patients WHERE user_id = $1 LIMIT 1', [userId])

    // If no patient record exists yet, auto-create one with fallback defaults
    if (pRes.rows.length === 0) {
      const userRes = await query('SELECT email, full_name FROM users WHERE id = $1', [userId])
      const u = userRes.rows[0]
      const defaultName = u?.full_name || u?.email?.split('@')[0] || 'Patient'

      const created = await query(
        `INSERT INTO patients (
          user_id, name, tb_type, regimen, treatment_start, status
        ) VALUES ($1, $2, 'pulmonary', 'HRZE', CURRENT_DATE, 'active')
        RETURNING *`,
        [userId, defaultName]
      )
      pRes = created
    }

    const patient = pRes.rows[0]

    // Fetch dose logs
    const logsRes = await query(
      'SELECT * FROM dose_logs WHERE patient_id = $1 ORDER BY date ASC',
      [patient.id]
    )

    res.json({
      patient,
      doseLogs: logsRes.rows,
    })
  } catch (err) {
    next(err)
  }
}

export async function logMyDose(req, res, next) {
  try {
    const userId = req.user.id
    const { date, taken, notes } = req.body

    const logDate = date || new Date().toISOString().slice(0, 10)

    // Find patient record
    const pRes = await query('SELECT id FROM patients WHERE user_id = $1 LIMIT 1', [userId])
    if (pRes.rows.length === 0) {
      return res.status(404).json({ error: 'No patient record linked to your account' })
    }

    const patientId = pRes.rows[0].id

    const result = await query(
      `INSERT INTO dose_logs (patient_id, date, taken, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (patient_id, date)
       DO UPDATE SET
         taken = EXCLUDED.taken,
         notes = COALESCE(EXCLUDED.notes, dose_logs.notes),
         logged_by = EXCLUDED.logged_by
       RETURNING *`,
      [patientId, logDate, Boolean(taken), notes || null, userId]
    )

    res.json({ message: 'Dose logged successfully', data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}
