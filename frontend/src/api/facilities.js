import { apiClient } from './client.js'

export async function getFacilitiesApi() {
  return apiClient('/api/facilities')
}

export async function createFacilityApi(facilityData) {
  return apiClient('/api/facilities', {
    method: 'POST',
    body: facilityData,
  })
}
