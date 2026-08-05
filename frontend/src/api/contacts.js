import { apiClient } from './client.js'

export async function getContactsApi(sourcePatientId) {
  const query = sourcePatientId ? `?source_patient_id=${sourcePatientId}` : ''
  return apiClient(`/api/contacts${query}`)
}

export async function createContactApi(contactData) {
  return apiClient('/api/contacts', {
    method: 'POST',
    body: contactData,
  })
}

export async function updateContactApi(id, updates) {
  return apiClient(`/api/contacts/${id}`, {
    method: 'PATCH',
    body: updates,
  })
}
