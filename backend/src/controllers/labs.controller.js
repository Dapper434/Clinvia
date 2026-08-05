import { query } from '../config/db.js'

export async function getLabs(req, res, next) {
  try {
    const { patient_id } = req.query
    let sql = 'SELECT * FROM lab_results'
    const params = []

    if (patient_id) {
      params.push(patient_id)
      sql += ' WHERE patient_id = $1'
    }

    sql += ' ORDER BY result_date DESC'

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
}

export async function createLab(req, res, next) {
  try {
    const { patient_id, test_type, result, result_date, lab_ref, notes, mdr_detected } = req.body

    if (!patient_id || !test_type || !result || !result_date) {
      return res.status(400).json({ error: 'Patient ID, test type, result, and result date are required' })
    }

    const labRes = await query(
      `INSERT INTO lab_results (patient_id, test_type, result, result_date, lab_ref, notes, mdr_detected)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [patient_id, test_type, result, result_date, lab_ref || null, notes || null, Boolean(mdr_detected)]
    )

    // If MDR detected, update patient record
    if (mdr_detected) {
      await query('UPDATE patients SET mdr_flag = TRUE WHERE id = $1', [patient_id])
    }

    res.status(201).json(labRes.rows[0])
  } catch (err) {
    next(err)
  }
}
