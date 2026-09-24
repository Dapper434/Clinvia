export const STAFF_ROLES = ['network_admin', 'admin', 'executive', 'doctor', 'clinician', 'nurse', 'receptionist']

const LABELS = {
  network_admin: 'Network administrator',
  admin: 'Administrator',
  executive: 'Executive',
  doctor: 'Doctor',
  clinician: 'Clinician',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  patient: 'Patient',
}

// Roles a hospital administrator can give an account, in the order the form lists them.
export const ASSIGNABLE_ROLES = ['doctor', 'clinician', 'nurse', 'receptionist', 'executive', 'admin']

export function isHospitalRole(role) {
  return STAFF_ROLES.includes(role)
}

export function isPatientRole(role) {
  return role === 'patient'
}

export function isAdminRole(role) {
  return role === 'admin' || role === 'network_admin'
}

export function homePathForRole(role) {
  if (isPatientRole(role)) return '/my-treatment'
  if (role === 'network_admin') return '/network'
  return '/dashboard'
}

export function roleLabel(role) {
  return LABELS[role] ?? 'User'
}
