import { query } from '../config/db.js'

export async function getContacts(req, res, next) {
  try {
    const { source_patient_id } = req.query
    let sql = 'SELECT * FROM contacts'
    const params = []

    if (source_patient_id) {
      params.push(source_patient_id)
      sql += ' WHERE source_patient_id = $1'
    }

    sql += ' ORDER BY name ASC'

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
}

export async function createContact(req, res, next) {
  try {
    const { source_patient_id, name, age, relationship, phone, screened, screen_result, screened_date } = req.body

    if (!source_patient_id || !name) {
      return res.status(400).json({ error: 'Source patient ID and contact name are required' })
    }

    const parsedAge = age === '' || age == null ? null : parseInt(age, 10)

    const result = await query(
      `INSERT INTO contacts (
        source_patient_id, name, age, relationship, phone, screened, screen_result, screened_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        source_patient_id,
        name.trim(),
        parsedAge,
        relationship || 'other',
        phone || null,
        Boolean(screened),
        screen_result || null,
        screened_date || null,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    next(err)
  }
}

export async function updateContact(req, res, next) {
  try {
    const { id } = req.params
    const { name, age, relationship, phone, screened, screen_result, screened_date } = req.body

    const parsedAge = age === '' || age == null ? null : parseInt(age, 10)

    const result = await query(
      `UPDATE contacts SET
        name = COALESCE($1, name),
        age = $2,
        relationship = COALESCE($3, relationship),
        phone = $4,
        screened = COALESCE($5, screened),
        screen_result = $6,
        screened_date = $7
       WHERE id = $8
       RETURNING *`,
      [
        name,
        parsedAge,
        relationship,
        phone,
        screened !== undefined ? Boolean(screened) : null,
        screen_result,
        screened_date,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
}
