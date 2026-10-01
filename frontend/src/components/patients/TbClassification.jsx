import { useEffect, useState } from 'react'
import { regimenPreviewApi } from '../../api/patients.js'
import {
  DIAGNOSIS_BASES,
  EPTB_SITES,
  RESISTANCE_LEVELS,
  TB_SITES,
  TREATMENT_HISTORIES,
} from '../../utils/tbTerms.js'

const Choice = ({ id, label, hint, value, options, onChange }) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={onChange}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
    <small>{options.find(([v]) => v === value)?.[2] || hint}</small>
  </div>
)

/**
 * How this case is classified. The regimen shown underneath is worked out by the backend
 * from these answers and the patient's weight, so the doctor sees the exact prescription
 * before the patient is registered.
 */
export default function TbClassification({ f, set, age, weight, idPrefix = 'tb' }) {
  const [plan, setPlan] = useState(null)
  const extra = f.type === 'extra_pulmonary'

  useEffect(() => {
    let live = true
    const params = { site: f.type, resistance: f.resistance, age: age || '', weight: weight || '' }
    if (extra && f.eptbSite) params.eptbSite = f.eptbSite
    regimenPreviewApi(params).then((r) => live && setPlan(r)).catch(() => live && setPlan(null))
    return () => { live = false }
  }, [f.type, f.eptbSite, f.resistance, age, weight, extra])

  return (
    <>
      <div className="fields">
        <Choice id={`${idPrefix}-site`} label="Where the disease is" value={f.type}
          options={TB_SITES} onChange={set('type')} />
        {extra ? (
          <div className="field">
            <label htmlFor={`${idPrefix}-organ`}>Which organ <em>*</em></label>
            <select id={`${idPrefix}-organ`} value={f.eptbSite} onChange={set('eptbSite')}>
              <option value="">Choose the organ</option>
              {EPTB_SITES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <small>TB of the brain or the spine is treated for twelve months</small>
          </div>
        ) : <div />}
        <Choice id={`${idPrefix}-dx`} label="How it was diagnosed" value={f.diagnosis}
          options={DIAGNOSIS_BASES} onChange={set('diagnosis')} />
        <Choice id={`${idPrefix}-hist`} label="Treatment history" value={f.history}
          options={TREATMENT_HISTORIES} onChange={set('history')} />
        <Choice id={`${idPrefix}-res`} label="Drug susceptibility" value={f.resistance}
          options={RESISTANCE_LEVELS} onChange={set('resistance')} />
      </div>
      <RegimenPreview plan={plan} />
    </>
  )
}

/** The regimen and doses the classification implies, or what is still missing. */
export function RegimenPreview({ plan, title = 'Regimen' }) {
  if (!plan) return null
  return (
    <div className="regimen">
      <div className="regimen-h">
        <span className="tag">{title}</span>
        <b>{plan.label}</b>
        <small>{plan.description}{plan.band ? ` · ${plan.band.label} band` : ''}</small>
      </div>
      {plan.lines.length ? (
        <table className="regimen-lines">
          <tbody>
            {plan.lines.map((l, i) => (
              <tr key={`${l.drug}-${i}`}>
                <td>{l.drug}</td>
                <td><b>{l.dose}</b></td>
                <td>{l.freq}</td>
                <td className="muted">
                  {l.phase === 'continuation' ? `from day ${l.from + 1}` : null}
                  {l.note ? <small>{l.note}</small> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {plan.warnings.map((w) => <p key={w} className="regimen-warn">{w}</p>)}
    </div>
  )
}
