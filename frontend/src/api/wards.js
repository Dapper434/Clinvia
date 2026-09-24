import { apiClient } from './client.js'

export const admissionsApi = () => apiClient('/api/admissions')
export const admitApi = (body) => apiClient('/api/admissions', { method: 'POST', body })
export const dischargeApi = (id) => apiClient(`/api/admissions/${id}/discharge`, { method: 'PATCH' })
export const setBedStatusApi = (id, status) => apiClient(`/api/beds/${id}`, { method: 'PATCH', body: { status } })
export const addWardApi = (body) => apiClient('/api/wards', { method: 'POST', body })
export const updateWardApi = (id, body) => apiClient(`/api/wards/${id}`, { method: 'PATCH', body })
