import { apiClient, removeToken, setToken } from './client.js'

const LOGIN_PATHS = { hospital: '/api/auth/login/hospital', patient: '/api/auth/login/patient' }

function keepToken(res) {
  if (res.token) setToken(res.token)
  return res
}

export async function loginApi(portal, email, password) {
  return keepToken(await apiClient(LOGIN_PATHS[portal], { method: 'POST', body: { email, password } }))
}

export async function registerPatientApi(body) {
  return keepToken(await apiClient('/api/auth/register/patient', { method: 'POST', body }))
}

export async function registerHospitalApi(body) {
  return keepToken(await apiClient('/api/hospitals/register', { method: 'POST', body }))
}

export const getMeApi = () => apiClient('/api/auth/me')
export const whichHospitalApi = (email) => apiClient(`/api/auth/domain?email=${encodeURIComponent(email)}`)
export const changePasswordApi = (current, next) =>
  apiClient('/api/auth/password', { method: 'POST', body: { current, new: next } })
export const hospitalLevelsApi = () => apiClient('/api/hospitals/levels')

export function logoutApi() {
  removeToken()
}
