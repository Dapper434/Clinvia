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
      }


    }


}    