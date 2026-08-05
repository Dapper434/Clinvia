import { apiClient } from './client.js'

export async function getDashboardStatsApi() {
  return apiClient('/api/dashboard/stats')
}
