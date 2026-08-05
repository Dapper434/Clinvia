import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tbtrack_default_secret_development_key_32chars'

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

export function requireHospital(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const role = req.user.role || 'hospital'
  const hospitalRoles = ['hospital', 'nurse', 'admin', 'viewer']
  if (!hospitalRoles.includes(role)) {
    return res.status(403).json({ error: 'Hospital staff access required' })
  }
  next()
}

export function requirePatient(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Patient access required' })
  }
  next()
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
  } catch {
    // Ignore invalid token in optional auth
  }
  next()
}
