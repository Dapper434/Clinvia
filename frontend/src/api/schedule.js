import { apiClient } from './client.js'
import { q } from './hospital.js'

export const dayScheduleApi = (date, doctor) => apiClient(`/api/appointments${q({ date, doctor })}`)
export const weekApi = (start, doctor) => apiClient(`/api/appointments/week${q({ start, doctor })}`)
export const slotsApi = (doctor, date) => apiClient(`/api/appointments/slots${q({ doctor, date })}`)
export const bookApi = (body) => apiClient('/api/appointments', { method: 'POST', body })
export const setAppointmentStatusApi = (id, status) =>
  apiClient(`/api/appointments/${id}`, { method: 'PATCH', body: { status } })

export const queueApi = () => apiClient('/api/visits')
export const addWalkInApi = (body) => apiClient('/api/visits', { method: 'POST', body })
export const callInApi = (id, doctorCode) =>
  apiClient(`/api/visits/${id}`, { method: 'PATCH', body: { action: 'call', doctorCode } })
export const finishVisitApi = (id) => apiClient(`/api/visits/${id}`, { method: 'PATCH', body: { action: 'finish' } })
