import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client.js'
import { createStaffApi, updateStaffApi } from '../../api/hospital.js'
import { addWardApi, updateWardApi } from '../../api/wards.js'
import { ASSIGNABLE_ROLES, roleLabel } from '../../utils/roles.js'
import Drawer, { FormError } from '../ui/Drawer.jsx'
import { Check } from '../ui/icons.jsx'

const tempPassword = () => `Clinvia-${Math.floor(1000 + Math.random() * 9000)}`

export function StaffDrawer({ staff, domain, done, close, canManage = true, isMe = false }) {
  const editing = Boolean(staff)
  const [code, setCode] = useState(staff?.code || '')
  const [f, setF] = useState(() => ({
    name: staff?.name || '',
    email: staff ? staff.email.split('@')[0] : '',
    phone: staff?.phone || '',
    role: staff?.role || 'doctor',
    specialty: staff?.specialty || '',
    duty: staff?.duty || 'on_duty',
    active: staff?.active ?? true,
    password: editing ? '' : tempPassword(),
  }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const emailDomain = domain || staff?.email.split('@')[1]

  useEffect(() => {
    if (!editing) apiClient('/api/staff/next-code').then((r) => setCode(r.code)).catch(() => {})
  }, [editing])

  async function save() {
    const problems = []
    if (!f.name.trim()) problems.push('a full name')
    if (!/^[a-z0-9._-]+$/i.test(f.email.trim())) problems.push('the first part of their email')
    if (problems.length) {
      setError(`Add ${problems.join(' and ')}.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const email = `${f.email.trim().toLowerCase()}@${emailDomain}`
      if (editing) {
        const body = canManage
          ? { name: f.name.trim(), email, phone: f.phone, specialty: f.specialty, duty: f.duty, ...(isMe ? {} : { role: f.role, active: f.active }) }
          : { name: f.name.trim(), phone: f.phone }
        if (canManage && f.password) body.password = f.password
        const r = await updateStaffApi(staff.code, body)
        done(`Saved ${r.name}`)
      } else {
        const r = await createStaffApi({ ...f, name: f.name.trim(), email })
        done(`Created ${r.name} as ${r.code}`)
      }
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <Drawer
      title={editing ? (isMe ? 'Edit my details' : `Edit ${staff.name}`) : 'Add staff account'}
      onClose={close}
      footer={
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn primary" onClick={save} disabled={busy}>
            <Check />
            {editing ? 'Save changes' : `Create ${code}`}
          </button>
        </>
      }
    >
      {code ? (
        <p className="next-code">
          {editing ? 'Staff code' : 'This account will be'} <b>{code}</b>
        </p>
      ) : null}
      <div className="field"><label htmlFor="s-n">Full name <em>*</em></label><input id="s-n" value={f.name} onChange={set('name')} /></div>
      <div className="field">
        <label htmlFor="s-e">Work email <em>*</em></label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input id="s-e" value={f.email} onChange={set('email')} disabled={!canManage} placeholder="firstname.lastname" style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 13 }}>@{emailDomain}</span>
        </div>
        <small>They sign in with this address; it must be at the hospital's domain.</small>
      </div>
      <div className="field"><label htmlFor="s-ph">Phone</label><input id="s-ph" type="tel" value={f.phone} onChange={set('phone')} placeholder="07XX XXX XXX" /></div>
      {canManage ? (
        <>
          <div className="field"><label htmlFor="s-r">Role</label>
            <select id="s-r" value={f.role} onChange={set('role')} disabled={isMe}>
              {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
            <small>{isMe ? "You can't change your own role." : 'Decides what they can see and do.'}</small></div>
          <div className="field"><label htmlFor="s-s">Specialty</label><input id="s-s" value={f.specialty} onChange={set('specialty')} placeholder="e.g. General Medicine" /></div>
          <div className="field"><label htmlFor="s-d">Duty status</label>
            <select id="s-d" value={f.duty} onChange={set('duty')}>
              <option value="on_duty">On duty</option><option value="off_duty">Off duty</option><option value="on_leave">On leave</option>
            </select></div>
          <div className="field">
            <label htmlFor="s-p">{editing ? 'New password' : 'Temporary password'}</label>
            <input id="s-p" value={f.password} onChange={set('password')} placeholder={editing ? 'Leave empty to keep the current one' : ''} />
            <small>{editing ? 'They will be asked to change it at their next sign-in.' : 'They change it on first sign-in'}</small>
          </div>
          {editing && !isMe ? (
            <label className="check"><input type="checkbox" checked={f.active} onChange={set('active')} /> Account active (untick to stop them signing in)</label>
          ) : null}
        </>
      ) : null}
      <FormError error={error} />
    </Drawer>
  )
}

const WARD_TYPES = [['general', 'General'], ['isolation', 'Isolation'], ['paediatric', 'Paediatric'], ['maternity', 'Maternity'], ['surgical', 'Surgical'], ['icu', 'Intensive care']]

export function WardDrawer({ ward, done, close }) {
  const [f, setF] = useState({ name: ward?.name || '', type: ward?.type || 'general', prefix: ward?.prefix || '', capacity: ward?.capacity || 8 })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function save() {
    setBusy(true)
    setError('')
    try {
      if (ward) await updateWardApi(ward.id, { name: f.name, capacity: Number(f.capacity) })
      else await addWardApi({ ...f, capacity: Number(f.capacity) })
      done(ward ? `Saved ${f.name}` : `Added ${f.name} with ${f.capacity} beds`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }
  return (
    <Drawer title={ward ? `Edit ${ward.name}` : 'Add ward'} onClose={close}
      footer={<><button type="button" className="btn" onClick={close}>Cancel</button>
        <button type="button" className="btn primary" onClick={save} disabled={busy}><Check />{ward ? 'Save ward' : 'Add ward'}</button></>}>
      <div className="field"><label htmlFor="wd-n">Ward name <em>*</em></label><input id="wd-n" value={f.name} onChange={set('name')} placeholder="e.g. Medical Ward (Male)" /></div>
      {!ward ? (
        <>
          <div className="field"><label htmlFor="wd-t">Type</label><select id="wd-t" value={f.type} onChange={set('type')}>{WARD_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="wd-p">Bed prefix <em>*</em></label><input id="wd-p" value={f.prefix} maxLength={4} onChange={set('prefix')} placeholder="e.g. MMW" /><small>Beds are labelled {(f.prefix || 'MMW').toUpperCase()}-01, {(f.prefix || 'MMW').toUpperCase()}-02, …</small></div>
        </>
      ) : null}
      <div className="field"><label htmlFor="wd-c">Beds <em>*</em></label><input id="wd-c" type="number" min="1" max="60" value={f.capacity} onChange={set('capacity')} />
        {ward ? <small>Only free beds are removed when you lower the number.</small> : null}</div>
      <FormError error={error} />
    </Drawer>
  )
}
