import { apiClient, setToken, removeToken } from './client.js'

const LOGIN_PATHS = {
  hospital: '/api/auth/login/hospital',
  patient: '/api/auth/login/patient',
}

export async function loginApi(portal, email, password) {
  const path = LOGIN_PATHS[portal]
  if (!path) {
    throw new Error(`Unknown login portal: ${portal}`)
  }
  const res = await apiClient(path, {
    method: 'POST',
    body: { email, password },
  })
  if (res.token) {
    setToken(res.token)
  }
  return res
}

export async function registerPatientApi(email, password, fullName, patientFields, linkId) {
  const res = await apiClient('/api/auth/register/patient', {
    method: 'POST',
    body: { email, password, fullName, patientFields, linkId },
  })
  if (res.token) {
    setToken(res.token)
  }
  return res
}

export async function getMeApi() {
  return apiClient('/api/auth/me')
}

export function logoutApi() {
  removeToken()
}
