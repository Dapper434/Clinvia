import { useState, useEffect, useCallback } from 'react'
import { getToken, removeToken } from '../api/client.js'
import { loginApi, registerHospitalApi, registerPatientApi, getMeApi, logoutApi } from '../api/auth.js'
import { isHospitalRole, isPatientRole } from '../utils/roles.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [patientId, setPatientId] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) {
        setUser(null)
        setProfile(null)
        setPatientId(null)
        return
      }

      const data = await getMeApi()
      setUser(data.user)
      setProfile(data.profile)
      setPatientId(data.patientId || null)
    } catch (err) {
      console.warn('Session expired or invalid, logging out:', err.message)
      removeToken()
      setUser(null)
      setProfile(null)
      setPatientId(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Defer the restore out of the synchronous effect body so the initial
    // state updates happen on a microtask (react-hooks/set-state-in-effect).
    Promise.resolve().then(fetchCurrentUser)
  }, [fetchCurrentUser])

  const signIn = async (email, password) => {
    const data = await loginApi(email, password)
    setUser(data.user)
    setProfile(data.profile)
    setPatientId(data.patientId || null)
    return data
  }

  const signUpHospital = async (email, password, fullName) => {
    const data = await registerHospitalApi(email, password, fullName)
    setUser(data.user)
    setProfile(data.profile)
    setPatientId(null)
    return data
  }

  const signUpPatient = async (email, password, fullName, patientFields, linkId) => {
    const data = await registerPatientApi(email, password, fullName, patientFields, linkId)
    setUser(data.user)
    setProfile(data.profile)
    setPatientId(data.patientId || null)
    return data
  }

  const signOut = async () => {
    logoutApi()
    setUser(null)
    setProfile(null)
    setPatientId(null)
  }

  const effectiveRole = profile?.role ?? user?.role ?? null
  const isHospital = isHospitalRole(effectiveRole)
  const isPatient = isPatientRole(effectiveRole)

  const value = {
    user,
    profile,
    role: effectiveRole,
    isHospital,
    isPatient,
    patientId,
    loading,
    signIn,
    signUpHospital,
    signUpPatient,
    signOut,
    refreshProfile: fetchCurrentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
