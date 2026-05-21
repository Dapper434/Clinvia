import { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathForRole } from "../utils/roles";
import { Activity } from "react";


export default function Login() {
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const {user, role, signIn, loading} = useAuth()
    const navigate = useNavigate()
    const [busy, setBusy] = useState(false)

    useEffect(() => {
      if (user) navigate(homePathForRole(role), { replace: true})
    }, [user, role, navigate])

    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Loading...</p>

        </div>
      )
    }

    async function handleSubmit(e) {
      e.preventDefault()
      setError('')
      setBusy(true)

      try {
        const {error: err} = await signIn(email, password)
        if (err) throw err
      } catch (err) {
        setError(err.message ?? 'Invalid email or password')
      } finally {
        setBusy(false)
      }


    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="display-flex items-center gap-2 text-teal-700">
              <Activity className ="h-6 w-6" />
              <span className="text-xl font-bold">TBTrack</span>
              <h1 className="mt-3 text-xl font-semibold text-gray-900">Sign in</h1>
              
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 mt-2 block text-xs font-medium text-gray-600" htmlFor="email">Email</label>
                <input id="email"
                type="email"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                />
                <div>
                  <label className="mb-2 mt-2 block text-xs font-medium text-gray-600" htmlFor="password">
                    Password
                  </label>
                  <input 
                  id="password"
                  type="password"
                  required
                  className="w-full mb-4 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  />
                </div>
                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>

                )}
                <button 
                type="submit"
                disabled= {busy}
                className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {busy ? 'Signing in...' : 'Sign in'}

                </button>




              </div>

            </form>
            <p className="mt-6 text-center text-xs text-gray-400">
              Accounts are created by clinic administrators
            </p>
          </div>
        </div>
      </div>
    )


}    