import { apiClient } from './client.js'

const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  return s.toString() ? `?${s}` : ''
}

export const dashboardApi = (mine) => apiClient(`/api/dashboard${mine ? '?mine=1' : ''}`)
export const badgesApi = () => apiClient('/api/badges')
export const hospitalsApi = () => apiClient('/api/hospitals')
export const hospitalOverviewApi = () => apiClient('/api/hospitals/overview')
export const updateHospitalApi = (slug, body) => apiClient(`/api/hospitals/${slug}`, { method: 'PATCH', body })
export const directoryApi = (params) => apiClient(`/api/directory${q(params)}`)

export const staffApi = () => apiClient('/api/staff')
export const staffProfileApi = (code) => apiClient(`/api/staff/${code}`)
export const doctorsApi = (bookable) => apiClient(`/api/staff/doctors${bookable ? '?bookable=1' : ''}`)
export const createStaffApi = (body) => apiClient('/api/staff', { method: 'POST', body })
export const updateStaffApi = (code, body) => apiClient(`/api/staff/${code}`, { method: 'PATCH', body })

export { q }
