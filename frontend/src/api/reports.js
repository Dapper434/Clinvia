import { apiClient } from './client.js'

export async function getReportsApi(filters = {}) {
  const query = new URLSearchParams()
  if (filters.year && filters.year !== 'all') query.set('year', filters.year)
  if (filters.tb_type && filters.tb_type !== 'all') query.set('tb_type', filters.tb_type)
  if (filters.status && filters.status !== 'all') query.set('status', filters.status)
  if (filters.facility && filters.facility !== 'all') query.set('facility', filters.facility)

  const queryString = query.toString()
  return apiClient(`/api/reports${queryString ? `?${queryString}` : ''}`)
}
