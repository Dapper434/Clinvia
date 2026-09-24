import { apiClient } from './client.js'
import { q } from './hospital.js'

export const registryApi = (params) => apiClient(`/api/patients${q(params)}`)
export const lookupPatientsApi = (term) => apiClient(`/api/patients/lookup${q({ q: term })}`)
export const nextPatientCodeApi = () => apiClient('/api/patients/next-code')
export const patientRecordApi = (code) => apiClient(`/api/patients/${code}`)
export const registerPatientRecordApi = (body) => apiClient('/api/patients', { method: 'POST', body })
export const updatePatientApi = (code, body) => apiClient(`/api/patients/${code}`, { method: 'PATCH', body })
export const newLinkCodeApi = (code) => apiClient(`/api/patients/${code}/link-code`, { method: 'POST' })

export const startTbApi = (code, body) => apiClient(`/api/patients/${code}/tb`, { method: 'POST', body })
export const updateTbApi = (code, body) => apiClient(`/api/patients/${code}/tb`, { method: 'PATCH', body })
export const addLabApi = (code, body) => apiClient(`/api/patients/${code}/labs`, { method: 'POST', body })
export const updateLabApi = (id, body) => apiClient(`/api/labs/${id}`, { method: 'PATCH', body })
export const prescribeApi = (code, body) => apiClient(`/api/patients/${code}/medications`, { method: 'POST', body })
export const stopMedicationApi = (id) => apiClient(`/api/medications/${id}`, { method: 'PATCH', body: { active: false } })
export const addContactApi = (code, body) => apiClient(`/api/patients/${code}/contacts`, { method: 'POST', body })
export const screenContactApi = (id, result) =>
  apiClient(`/api/contacts/${id}`, { method: 'PATCH', body: { screen_result: result } })

export function uploadFileApi(code, file, type) {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  return apiClient(`/api/patients/${code}/files`, { method: 'POST', body: form })
}
