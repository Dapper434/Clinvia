import { apiClient } from './client.js'

export async function getPatientsApi(params = {}) {
  const query = new URLSearchParams()
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.facility && params.facility !== 'all') query.set('facility', params.facility)
  if (params.search && params.search.trim()) query.set('search', params.search.trim())
  if (params.assignedToMe) query.set('assigned_to_me', 'true')

  const queryString = query.toString()
  return apiClient(`/api/patients${queryString ? `?${queryString}` : ''}`)
}

export async function getPatientByIdApi(id) {
  return apiClient(`/api/patients/${id}`)
}

export async function getDoctorsApi() {
  return apiClient('/api/patients/doctors')
}

export async function createPatientApi(patientData) {
  return apiClient('/api/patients', {
    method: 'POST',
    body: patientData,
  })
}

export async function updatePatientApi(id, updates) {
  return apiClient(`/api/patients/${id}`, {
    method: 'PATCH',
    body: updates,
  })
}

export async function deletePatientApi(id) {
  return apiClient(`/api/patients/${id}`, {
    method: 'DELETE',
  })
}
