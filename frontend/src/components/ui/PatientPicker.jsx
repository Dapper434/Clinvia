import { useEffect, useId, useState } from 'react'
import { lookupPatientsApi } from '../../api/patients.js'

/** Type a name, P-code or phone; suggestions come from the hospital's own patients. */
export default function PatientPicker({ id, label = 'Patient', value, onChange, required = true, hint }) {
  const listId = useId()
  const [options, setOptions] = useState([])

  useEffect(() => {
    let alive = true
    const term = value.includes(' — ') ? '' : value.trim()
    const t = setTimeout(() => {
      lookupPatientsApi(term)
        .then((rows) => alive && setOptions(rows))
        .catch(() => {})
    }, 180)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [value])

  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required ? <em>*</em> : null}
      </label>
      <input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value, options)}
        placeholder="Type a name or P-code"
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((p) => (
          <option key={p.code} value={`${p.code} — ${p.name}`} />
        ))}
      </datalist>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}
