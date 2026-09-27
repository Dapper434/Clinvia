import { apiClient } from './client.js'
import { q } from './hospital.js'

export const escalationsApi = (params) => apiClient(`/api/escalations${q(params || {})}`)
export const acknowledgeEscalationApi = (id, note) => apiClient(`/api/escalations/${id}`, { method: 'PATCH', body: { note } })
