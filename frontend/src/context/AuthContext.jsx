import { useCallback, useEffect, useState } from 'react'
import { getScope, getToken, removeToken, setScope as storeScope } from '../api/client.js'
import { getMeApi, loginApi, logoutApi, registerHospitalApi, registerPatientApi } from '../api/auth.js'
import { isAdminRole, isHospitalRole, isPatientRole } from '../utils/roles.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, permissions: [], patientCode: null })
  const [loading, setLoading] = useState(true)
  const [scope, setScopeState] = useState(getScope())

  const apply = useCallback((data) => {
    setSession({
      user: data?.user ?? null,
      permissions: data?.permissions ?? [],
      patientCode: data?.patientCode ?? null,
    })
  }, [])

  const refresh = useCallback(async () => {
    try {
      if (!getToken()) {
        apply(null)
        return
      }
      apply(await getMeApi())
    } catch {
      removeToken()
      apply(null)
    } finally {
      setLoading(false)
    }
  }, [apply])

  useEffect(() => {
    // Deferred so the first state updates happen on a microtask (react-hooks/set-state-in-effect).
    Promise.resolve().then(refresh)
  }, [refresh])

  const signIn = async (portal, email, password) => {
    storeScope(null)
    setScopeState('all')
    const data = await loginApi(portal, email, password)
    apply(data)
    return data
  }

  const signUpPatient = async (body) => {
    const data = await registerPatientApi(body)
    apply(data)
    return data
  }

  const registerHospital = async (body) => {
    storeScope(null)
    const data = await registerHospitalApi(body)
    apply(data)
    return data
  }

  const signOut = () => {
    logoutApi()
    setScopeState('all')
    apply(null)
  }

  const setScope = (slug) => {
    storeScope(slug)
    setScopeState(slug || 'all')
  }

  const role = session.user?.role ?? null
  const can = useCallback((capability) => session.permissions.includes(capability), [session.permissions])

  const value = {
    user: session.user,
    role,
    permissions: session.permissions,
    can,
    patientCode: session.patientCode,
    isHospital: isHospitalRole(role),
    isPatient: isPatientRole(role),
    isAdmin: isAdminRole(role),
    isNetwork: role === 'network_admin',
    scope: role === 'network_admin' ? scope : session.user?.hospital?.slug ?? 'all',
    setScope,
    loading,
    signIn,
    signUpPatient,
    registerHospital,
    signOut,
    refreshProfile: refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
