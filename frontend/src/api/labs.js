import { apiClient } from './client.js'

export async function getLabsApi(patientId) {
  const query = patientId ? `?patient_id=${patientId}` : ''
  return apiClient(`/api/labs${query}`)
}

export async function createLabApi(labData) {
  return apiClient('/api/labs', {
    method: 'POST',
    body: labData,
  })
}
