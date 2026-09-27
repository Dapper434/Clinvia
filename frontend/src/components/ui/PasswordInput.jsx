import { useState } from 'react'
import { Eye, EyeOff } from './icons.jsx'

/** A password field with an eye button to show or hide what's typed. */
export default function PasswordInput({ defaultVisible = false, style, ...props }) {
  const [visible, setVisible] = useState(defaultVisible)
  return (
    <div className="pw-wrap">
      <input {...props} type={visible ? 'text' : 'password'} style={{ ...style, paddingRight: 42 }} />
      <button
        type="button"
        className="pw-eye"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  )
}
