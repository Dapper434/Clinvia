import { supabase } from './supabaseClient.js'

/** Ensure a patients row exists for a patient-role auth user. */
export async function ensurePatientRecord(userId, fields) {
  const { data: existing, error: fetchErr } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchErr) return { error: fetchErr }
  if (existing) return { patientId: existing.id }

  const { data, error } = await supabase
    .from('patients')
    .insert([{ ...fields, user_id: userId }])
    .select('id')
    .single()
  if (error) return { error }
  return { patientId: data.id }
}

/** Link an existing hospital-registered patient to this auth user. */
export async function linkPatientRecord(userId, hospitalPatientId) {
  // Unlink any self-created portal row so user_id unique constraint allows clinic link
  await supabase.from('patients').update({ user_id: null }).eq('user_id', userId).neq('id', hospitalPatientId)

  const { data, error } = await supabase
    .from('patients')
    .update({ user_id: userId })
    .eq('id', hospitalPatientId)
    .is('user_id', null)
    .select('id')
    .maybeSingle()
  if (error) return { error }
  if (!data) {
    return {
      error: {
        message:
          'Patient ID not found or already linked. Check the ID on your clinic profile, or ask staff to register you first.',
      },
    }
  }
  return { patientId: data.id }
}
