import { apiClient } from './client.js'

export async function getMyTreatmentApi() {
  return apiClient('/api/patient-portal/my-treatment')
}

export async function logMyDoseApi(doseData) {
  return apiClient('/api/patient-portal/log-dose', {
    method: 'POST',
    body: doseData,
  })
}
