import { Stethoscope, HeartPulse } from 'lucide-react'

/**
 * Shared branding for the two portal tracks (hospital vs patient).
 * "hospital" covers both clinical staff and admin accounts through one
 * unified sign-in — RBAC decides what each role can do after logging in,
 * not which login page they used to get in.
 * Used by the Welcome chooser, Login and the patient Sign-up page so the
 * whole auth journey keeps one consistent look per audience.
 */
export const PORTAL_THEMES = {
  hospital: {
    icon: Stethoscope,
    label: 'Hospital Portal',
    audience: 'For hospital staff & admins',
    subtitle: 'Manage patient records, daily dose logs, case maps, reports, and staff accounts.',
    emailPlaceholder: 'name@hospital.org',
    loginPath: '/login/hospital',
    signupPath: null,
    footer: 'Staff and admin accounts are provisioned internally, not self-service.',
    accent: {
      logoBox: 'bg-teal-500/10 border-teal-500/20 shadow-teal-500/5',
      icon: 'text-teal-400',
      inputFocus: 'focus:border-teal-500 focus:ring-teal-500',
      button: 'bg-teal-500 hover:bg-teal-400 focus:ring-teal-500',
      link: 'text-teal-400 hover:text-teal-300',
      eyebrow: 'text-teal-400',
      cardHover: 'hover:border-teal-500/60 hover:shadow-teal-500/10',
    },
  },
  patient: {
    icon: HeartPulse,
    label: 'Patient Portal',
    audience: 'For patients',
    subtitle: 'Log your daily TB medication and follow your treatment progress.',
    emailPlaceholder: 'patient@mail.com',
    loginPath: '/login/patient',
    signupPath: '/signup/patient',
    footer: 'Patient credentials are provided upon clinical enrollment at your clinic.',
    accent: {
      logoBox: 'bg-sky-500/10 border-sky-500/20 shadow-sky-500/5',
      icon: 'text-sky-400',
      inputFocus: 'focus:border-sky-500 focus:ring-sky-500',
      button: 'bg-sky-500 hover:bg-sky-400 focus:ring-sky-500',
      link: 'text-sky-400 hover:text-sky-300',
      eyebrow: 'text-sky-400',
      cardHover: 'hover:border-sky-500/60 hover:shadow-sky-500/10',
    },
  },
}
