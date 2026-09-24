import { apiClient } from './client.js'
import { q } from './hospital.js'

export const getMyTreatmentApi = () => apiClient('/api/patient-portal/my-treatment')
export const logMyDoseApi = (body) => apiClient('/api/patient-portal/log-dose', { method: 'POST', body })
export const linkMyRecordApi = (code) => apiClient('/api/patient-portal/link', { method: 'POST', body: { code } })
export const mySlotsApi = (doctor, date) => apiClient(`/api/patient-portal/slots${q({ doctor, date })}`)
export const bookMyAppointmentApi = (body) => apiClient('/api/patient-portal/appointments', { method: 'POST', body })
export const cancelMyAppointmentApi = (id) =>
  apiClient(`/api/patient-portal/appointments/${id}`, { method: 'PATCH', body: { status: 'cancelled' } })

export function uploadMyFileApi(file, type) {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  return apiClient('/api/patient-portal/files', { method: 'POST', body: form })
}
