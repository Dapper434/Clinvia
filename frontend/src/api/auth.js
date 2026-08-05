import { apiClient, setToken, removeToken } from './client.js'

export async function loginApi(email, password) {
  const res = await apiClient('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  if (res.token) {
    setToken(res.token)
  }
  return res
}

export async function registerHospitalApi(email, password, fullName) {
  const res = await apiClient('/api/auth/register/hospital', {
    method: 'POST',
    body: { email, password, fullName },
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
