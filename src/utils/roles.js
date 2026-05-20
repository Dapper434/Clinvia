const HOSPITAL_ROLES = new Set(['nurse', 'admin', 'viewer', 'hospital'])

export function isHospitalRole(role) {
  return HOSPITAL_ROLES.has(role)
}

export function isPatientRole(role) {
  return role === 'patient'
}

export function homePathForRole(role) {
  return isPatientRole(role) ? '/my-treatment' : '/dashboard'
}

export function roleLabel(role) {
  if (role === 'patient') return 'Patient'
  if (role === 'hospital') return 'Hospital staff'
  return role ?? 'User'
}
