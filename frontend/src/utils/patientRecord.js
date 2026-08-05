import { getMyTreatmentApi } from '../api/portal.js'

/**
 * Ensures the patient record exists for the logged in patient and returns it.
 */
export async function ensurePatientForUser() {
  try {
    const res = await getMyTreatmentApi()
    return res.patient || null
  } catch (err) {
    console.error('Failed to get patient record:', err)
    return null
  }
}
