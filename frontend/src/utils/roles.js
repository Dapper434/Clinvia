const HOSPITAL_ROLES = new Set(['nurse', 'admin', 'viewer', 'hospital'])

export function isHospitalRole(role) {
  return HOSPITAL_ROLES.has(role)
}

export function isPatientRole(role) {
  return role === 'patient'
}

export function isAdminRole(role) {
  return role === 'admin'
}

export function homePathForRole(role) {
  if (isPatientRole(role)) return '/my-treatment'
  if (isAdminRole(role)) return '/admin/dashboard'
  return '/dashboard'
}

export function roleLabel(role) {
  if (role === 'patient') return 'Patient'
  if (role === 'admin') return 'Administrator'
  if (role === 'hospital') return 'Hospital staff'
  return role ?? 'User'
}
