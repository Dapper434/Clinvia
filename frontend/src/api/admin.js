import { apiClient } from './client.js'

export async function getStaffApi() {
  return apiClient('/api/admin/staff')
}

export async function createStaffApi(staffData) {
  return apiClient('/api/admin/staff', {
    method: 'POST',
    body: staffData,
  })
}

export async function getAdminDashboardApi() {
  return apiClient('/api/admin/dashboard')
}
