import { useState } from 'react'
import { Mail, Lock, UserRound, IdCard, Eye, EyeOff } from 'lucide-react'

const ICONS = { mail: Mail, lock: Lock, user: UserRound, id: IdCard }

export default function AuthField({
  id,
  label,
  type = 'text',
  icon,
  value,
  onChange,
  error,
  hint,
  placeholder,
  autoComplete,
  focusClasses,
  toggleable = false,
  required = false,
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const showToggle = isPassword && toggleable
  const inputType = showToggle ? (show ? 'text' : 'password') : type
  const Icon = ICONS[icon]

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300"
      >
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border bg-slate-900/80 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition ${
            error
              ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : `border-slate-700 ${focusClasses}`
          } ${Icon ? 'pl-10' : 'pl-4'} ${showToggle ? 'pr-10' : 'pr-4'}`}
        />
        {showToggle ? (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {hint && !error ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  )
}
