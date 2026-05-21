import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import { isHospitalRole, isPatientRole } from '../utils/roles.js'
import { ensurePatientRecord, linkPatientRecord } from '../utils/patientRecord.js'

const AuthContext = createContext(null)

export { AuthContext }

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [patientId, setPatientId] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadPatientId = useCallback(async (userId, role) => {
    if (!userId || !isPatientRole(role)) {
      setPatientId(null)
      return
    }
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) {
      setPatientId(null)
      return
    }
    setPatientId(data.id)
  }, [])

  const loadProfile = useCallback(
    async (userId) => {
      if (!userId) {
        setProfile(null)
        setPatientId(null)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .maybeSingle()
      if (error || !data) {
        const meta = (await supabase.auth.getUser()).data.user?.user_metadata
        const fallbackRole = meta?.role === 'patient' ? 'patient' : 'hospital'
        const fullName = meta?.full_name ?? null
        await supabase.from('profiles').upsert(
          { id: userId, full_name: fullName, role: fallbackRole },
          { onConflict: 'id' },
        )
        setProfile({ role: fallbackRole, full_name: fullName })
        await loadPatientId(userId, fallbackRole)
        return
      }
      setProfile(data)
      await loadPatientId(userId, data.role)
    },
    [loadPatientId],
  )

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return
      setSession(s)
      setLoading(false)
      loadProfile(s?.user?.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      loadProfile(s?.user?.id)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const role = profile?.role ?? 'hospital'

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      patientId,
      isHospital: isHospitalRole(role),
      isPatient: isPatientRole(role),
      loading,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signUpHospital: (email, password, fullName) =>
        supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: 'hospital' } },
        }),
      signUpPatient: async (email, password, fullName, patientFields, linkId) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: 'patient' } },
        })
        if (error) return { error }
        const user = data.user
        if (!user) return { data, error: null }

        if (linkId?.trim()) {
          const linkResult = await linkPatientRecord(user.id, linkId.trim())
          if (linkResult.error) return { error: linkResult.error }
          return { data, patientId: linkResult.patientId }
        }

        const recordResult = await ensurePatientRecord(user.id, {
          name: patientFields.name || fullName,
          age: patientFields.age,
          gender: patientFields.gender,
          phone: patientFields.phone,
          facility: patientFields.facility,
          tb_type: patientFields.tb_type,
          regimen: patientFields.regimen,
          treatment_start: patientFields.treatment_start,
          status: 'active',
        })
        if (recordResult.error) return { error: recordResult.error }
        return { data, patientId: recordResult.patientId }
      },
      refreshPatientId: () => loadPatientId(session?.user?.id, role),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, role, patientId, loading, loadPatientId],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
