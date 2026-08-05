import bcrypt from 'bcryptjs'
import { query } from '../config/db.js'

export async function getPatients(req, res, next) {
  try {
    const { search, status, facility } = req.query

    let sql = 'SELECT * FROM patients WHERE 1=1'
    const params = []

    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND status = $${params.length}`
    }

    if (facility && facility !== 'all') {
      params.push(facility)
      sql += ` AND facility = $${params.length}`
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(phone) LIKE $${params.length} OR LOWER(regimen) LIKE $${params.length})`
    }

    sql += ' ORDER BY created_at DESC'

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
}

export async function getPatientById(req, res, next) {
  try {
    const { id } = req.params

    const pRes = await query('SELECT * FROM patients WHERE id = $1', [id])
    if (pRes.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    const patient = pRes.rows[0]

    const [logsRes, labsRes, contactsRes] = await Promise.all([
      query('SELECT * FROM dose_logs WHERE patient_id = $1 ORDER BY date ASC', [id]),
      query('SELECT * FROM lab_results WHERE patient_id = $1 ORDER BY result_date DESC', [id]),
      query('SELECT * FROM contacts WHERE source_patient_id = $1 ORDER BY name ASC', [id]),
    ])

    res.json({
      ...patient,
      doseLogs: logsRes.rows,
      labResults: labsRes.rows,
      contacts: contactsRes.rows,
    })
  } catch (err) {
    next(err)
  }
}

export async function createPatient(req, res, next) {
  try {
    const {
      name,
      age,
      gender,
      phone,
      address,
      facility,
      tb_type,
      regimen,
      treatment_start,
      status,
      mdr_flag,
      lat,
      lng,
      patientEmail,
      patientPassword,
    } = req.body

    if (!name || !treatment_start) {
      return res.status(400).json({ error: 'Patient name and treatment start date are required' })
    }

    const registeredBy = req.user?.id || null

    let userId = null

    // If patient email & password are provided, create login account
    if (patientEmail && patientPassword) {
      const emailClean = patientEmail.toLowerCase().trim()
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [emailClean])

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id
      } else {
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(patientPassword, salt)

        const userRes = await query(
          `INSERT INTO users (email, password_hash, role, full_name)
           VALUES ($1, $2, 'patient', $3)
           RETURNING id`,
          [emailClean, passwordHash, name.trim()]
        )
        userId = userRes.rows[0].id

        await query(
          `INSERT INTO profiles (id, full_name, role)
           VALUES ($1, $2, 'patient')
           ON CONFLICT (id) DO NOTHING`,
          [userId, name.trim()]
        )
      }
    }

    const parsedAge = age === '' || age == null ? null : parseInt(age, 10)
    const parsedLat = lat === '' || lat == null ? null : parseFloat(lat)
    const parsedLng = lng === '' || lng == null ? null : parseFloat(lng)

    const insertRes = await query(
      `INSERT INTO patients (
        user_id, name, age, gender, phone, address, facility,
        tb_type, regimen, treatment_start, status, mdr_flag, lat, lng, registered_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        userId,
        name.trim(),
        parsedAge,
        gender || 'male',
        phone || null,
        address || null,
        facility || null,
        tb_type || 'pulmonary',
        regimen || 'HRZE',
        treatment_start,
        status || 'active',
        Boolean(mdr_flag),
        Number.isFinite(parsedLat) ? parsedLat : null,
        Number.isFinite(parsedLng) ? parsedLng : null,
        registeredBy,
      ]
    )

    const newPatient = insertRes.rows[0]

    res.status(201).json(newPatient)
  } catch (err) {
    next(err)
  }
}

export async function updatePatient(req, res, next) {
  try {
    const { id } = req.params
    const {
      name,
      age,
      gender,
      phone,
      address,
      facility,
      tb_type,
      regimen,
      treatment_start,
      status,
      mdr_flag,
      lat,
      lng,
    } = req.body

    const parsedAge = age === '' || age == null ? null : parseInt(age, 10)
    const parsedLat = lat === '' || lat == null ? null : parseFloat(lat)
    const parsedLng = lng === '' || lng == null ? null : parseFloat(lng)

    const updateRes = await query(
      `UPDATE patients SET
        name = COALESCE($1, name),
        age = $2,
        gender = COALESCE($3, gender),
        phone = $4,
        address = $5,
        facility = $6,
        tb_type = COALESCE($7, tb_type),
        regimen = $8,
        treatment_start = COALESCE($9, treatment_start),
        status = COALESCE($10, status),
        mdr_flag = COALESCE($11, mdr_flag),
        lat = $12,
        lng = $13
       WHERE id = $14
       RETURNING *`,
      [
        name,
        parsedAge,
        gender,
        phone,
        address,
        facility,
        tb_type,
        regimen,
        treatment_start,
        status,
        mdr_flag !== undefined ? Boolean(mdr_flag) : null,
        Number.isFinite(parsedLat) ? parsedLat : null,
        Number.isFinite(parsedLng) ? parsedLng : null,
        id,
      ]
    )

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    res.json(updateRes.rows[0])
  } catch (err) {
    next(err)
  }
}

export async function deletePatient(req, res, next) {
  try {
    const { id } = req.params
    const result = await query('DELETE FROM patients WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }
    res.json({ message: 'Patient deleted successfully', id })
  } catch (err) {
    next(err)
  }
}
