import { apiClient } from './client.js'
import { q } from './hospital.js'

export const dosesApi = (date) => apiClient(`/api/doses${q({ date })}`)
export const saveDosesApi = (date, entries) => apiClient('/api/doses', { method: 'PUT', body: { date, entries } })
export const tbMapApi = (set) => apiClient(`/api/map/tb${q({ set })}`)
export const reportsApi = () => apiClient('/api/reports')
