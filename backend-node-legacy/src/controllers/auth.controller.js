import bcrypt from 'bcryptjs'
import { query } from '../config/db.js'
import { generateToken } from '../middleware/auth.js'

export async function registerHospital(req, res, next) {
  try {
    const { email, password, fullName } = req.body

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' })
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const userRes = await query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ($1, $2, 'hospital', $3)
       RETURNING id, email, role, full_name, created_at`,
      [email.toLowerCase().trim(), passwordHash, fullName.trim()]
    )

    const user = userRes.rows[0]

    await query(
      `INSERT INTO profiles (id, full_name, role)
       VALUES ($1, $2, 'hospital')
       ON CONFLICT (id) DO UPDATE SET full_name = $2, role = 'hospital'`,
      [user.id, user.full_name]
    )

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
      },
      profile: {
        role: user.role,
        full_name: user.full_name,
      },
      patientId: null,
    })
  } catch (err) {
    next(err)
  }
}

export async function registerPatient(req, res, next) {
  try {
    const { email, password, fullName, patientFields, linkId } = req.body

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' })
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const userRes = await query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ($1, $2, 'patient', $3)
       RETURNING id, email, role, full_name, created_at`,
      [email.toLowerCase().trim(), passwordHash, fullName.trim()]
    )

    const user = userRes.rows[0]

    await query(
      `INSERT INTO profiles (id, full_name, role)
       VALUES ($1, $2, 'patient')
       ON CONFLICT (id) DO UPDATE SET full_name = $2, role = 'patient'`,
      [user.id, user.full_name]
    )

    let patientId = null

    if (linkId && typeof linkId === 'string' && linkId.trim()) {
      const linkRes = await query(
        `UPDATE patients SET user_id = $1 WHERE id = $2 RETURNING id`,
        [user.id, linkId.trim()]
      )
      if (linkRes.rows.length > 0) {
        patientId = linkRes.rows[0].id
      }
    }

    if (!patientId) {
      const fields = patientFields || {}
      const pRes = await query(
        `INSERT INTO patients (
          user_id, name, age, gender, phone, facility, tb_type, regimen, treatment_start, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
        RETURNING id`,
        [
          user.id,
          fields.name || fullName.trim(),
          fields.age || null,
          fields.gender || 'male',
          fields.phone || null,
          fields.facility || null,
          fields.tb_type || 'pulmonary',
          fields.regimen || 'HRZE',
          fields.treatment_start || new Date().toISOString().slice(0, 10),
        ]
      )
      patientId = pRes.rows[0].id
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
      },
      profile: {
        role: user.role,
        full_name: user.full_name,
      },
      patientId,
    })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const userRes = await query(
      `SELECT id, email, password_hash, role, full_name
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    )

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = userRes.rows[0]
    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    let patientId = null
    if (user.role === 'patient') {
      const pRes = await query('SELECT id FROM patients WHERE user_id = $1 LIMIT 1', [user.id])
      if (pRes.rows.length > 0) {
        patientId = pRes.rows[0].id
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
      },
      profile: {
        role: user.role,
        full_name: user.full_name,
      },
      patientId,
    })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req, res, next) {
  try {
    const userId = req.user.id

    const userRes = await query(
      `SELECT id, email, role, full_name, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    )

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userRes.rows[0]

    let patientId = null
    if (user.role === 'patient') {
      const pRes = await query('SELECT id FROM patients WHERE user_id = $1 LIMIT 1', [user.id])
      if (pRes.rows.length > 0) {
        patientId = pRes.rows[0].id
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
      },
      profile: {
        role: user.role,
        full_name: user.full_name,
      },
      patientId,
    })
  } catch (err) {
    next(err)
  }
}
