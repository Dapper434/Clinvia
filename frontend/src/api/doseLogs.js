import { apiClient } from './client.js'

export async function getDoseLogsApi(params = {}) {
  const query = new URLSearchParams()
  if (params.patient_id) query.set('patient_id', params.patient_id)
  if (params.date) query.set('date', params.date)
  if (params.start_date) query.set('start_date', params.start_date)
  if (params.end_date) query.set('end_date', params.end_date)

  const queryString = query.toString()
  return apiClient(`/api/dose-logs${queryString ? `?${queryString}` : ''}`)
}

export async function upsertDoseLogApi(log) {
  return apiClient('/api/dose-logs/upsert', {
    method: 'POST',
    body: log,
  })
}

export async function bulkUpsertDoseLogsApi(logs) {
  return apiClient('/api/dose-logs/upsert', {
    method: 'POST',
    body: logs,
  })
}

export const upsertDoseLogsApi = bulkUpsertDoseLogsApi
