import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

/**
 * Reassurance shown where a patient hands the app something of their own.
 *
 * Every claim here has to stay true of the running system: the record is scoped to one
 * hospital on every request, passwords are hashed, and nothing is shared between
 * hospitals. Don't add a promise the code doesn't keep — see /privacy for the long form.
 */
export default function PrivacyNote({ facility, compact = false, className = '' }) {
  const clinic = facility || 'your clinic'

  if (compact) {
    return (
      <p className={`flex items-start gap-1.5 text-xs text-gray-500 ${className}`}>
        <ShieldCheck className="mt-px h-3.5 w-3.5 flex-shrink-0 text-teal-600" />
        <span>
          Only the care team at {clinic} can open this.{' '}
          <Link to="/privacy" className="font-medium text-teal-700 hover:underline">
            How your data is protected
          </Link>
        </span>
      </p>
    )
  }

  return (
    <div className={`rounded-2xl border border-teal-100 bg-teal-50/60 p-4 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-teal-600" />
        Your health information stays private
      </p>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-gray-600">
        <li>Only the care team at {clinic} can open your record — no other hospital on Clinvia can see it.</li>
        <li>You are signed in over an encrypted connection, and your password is stored scrambled, never as plain text.</li>
        <li>Your information is used to care for you. It is never sold, and never used for advertising.</li>
      </ul>
      <Link to="/privacy" className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline">
        Read how your data is protected
      </Link>
    </div>
  )
}
