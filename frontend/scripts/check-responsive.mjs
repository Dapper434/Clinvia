// Responsive check: signs in as each v2 actor, opens every page at phone, tablet and desktop
// widths, and fails if anything would be cut off, force sideways scrolling, be too small to
// tap, or make iOS zoom in on a field.
//
// Needs the app running (./start.sh) against a seeded database (flask seed-network), and
// Google Chrome installed. Sign-in passwords come from the same SEED_PASSWORD_* variables
// the seed uses; an actor without one is skipped, the public pages always run.
//
//   npm run check:responsive
//   WIDTHS=360,1280 ONLY=patient,doctor npm run check:responsive
//   SHOTS=1 npm run check:responsive      # also saves phone screenshots to .responsive/
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const API = process.env.VITE_API_URL || 'http://localhost:5000'
const WIDTHS = (process.env.WIDTHS || '360,390,768,1280').split(',').map(Number)
const ONLY = process.env.ONLY?.split(',')
const SHOTS = process.env.SHOTS === '1'
const PHONE = 600 // below this, touch-target and iOS-zoom rules apply
const MIN_TARGET = 32

const pw = (key) => process.env[`SEED_PASSWORD_${key}`]
const ACTORS = {
  public: { routes: ['/welcome', '/login/hospital', '/login/patient', '/signup/patient', '/register-hospital', '/privacy'] },
  patient: {
    login: ['patient', 'faith.wanjiru.p0001@patient.clinvia.health', pw('PATIENTS')],
    routes: ['/my-treatment', '/my-profile', '/privacy'],
  },
  doctor: {
    login: ['hospital', 'amina.hassan@knh.clinvia.health', pw('KNH')],
    routes: ['/dashboard', '/patients', '/patients/new', '/patients/:first', '/appointments', '/queue', '/admissions', '/doses', '/map', '/reports', '/profile'],
  },
  'tb-representative': {
    login: ['hospital', 'admin@clinvia.health', pw('NETWORK')],
    routes: ['/network', '/directory', '/dashboard', '/patients', '/appointments', '/map', '/reports', '/staff'],
  },
  'hospital-admin': {
    login: ['hospital', 'samuel.kiprono@knh.clinvia.health', pw('KNH')],
    routes: ['/staff', '/settings'],
  },
}

// Runs in the page. Returns what's wrong with the current layout.
function inspect({ phone, minTarget }) {
  const vw = document.documentElement.clientWidth
  const visible = (el) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0
  }
  // The closed off-canvas menus sit off screen on purpose.
  const parked = (el) => el.closest('.side:not(.open), [class*="-translate-x-full"]')
  const decorative = (el) => el.closest('.entry-field, .ls, .leaflet-container')
  const contained = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX)) return true
    }
    return false
  }
  const name = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${text}"`
  }
  const out = (r) => r.right > vw + 1 || r.left < -1
  const problems = []

  if (document.body.innerText.trim().length < 40) problems.push('page rendered blank')
  if (document.documentElement.scrollWidth > vw) problems.push(`page scrolls sideways (${document.documentElement.scrollWidth}px wide)`)

  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || parked(el) || decorative(el) || contained(el)) continue
    const r = el.getBoundingClientRect()
    // Report the outermost offender only.
    if (out(r) && !(el.parentElement && out(el.parentElement.getBoundingClientRect()) && !contained(el.parentElement))) {
      problems.push(`past the screen edge: ${name(el)} [${Math.round(r.left)}..${Math.round(r.right)} of ${vw}]`)
    }
  }

  // A control inside an overflow:hidden box can be cut off with no way to reach it.
  for (const el of document.querySelectorAll('a[href], button, [role=tab]')) {
    if (!visible(el) || parked(el) || decorative(el)) continue
    const r = el.getBoundingClientRect()
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o === 'auto' || o === 'scroll') break
      if (o !== 'hidden' && o !== 'clip') continue
      const pr = p.getBoundingClientRect()
      if (r.right > pr.right + 1 || r.left < pr.left - 1) problems.push(`cut off, can't be reached: ${name(el)}`)
      break
    }
  }

  if (vw < phone) {
    const controls = 'a[href], button, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=tab]'
    for (const el of document.querySelectorAll(controls)) {
      // Links inside running text are exempt (WCAG 2.5.8), as are data cells like calendar days.
      if (!visible(el) || parked(el) || decorative(el) || getComputedStyle(el).display === 'inline') continue
      if (el.closest('td, .strip, .cal')) continue
      const r = el.getBoundingClientRect()
      if (r.height < minTarget) problems.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)}px: ${name(el)}`)
    }
    const fields = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]), select, textarea'
    for (const el of document.querySelectorAll(fields)) {
      const size = parseFloat(getComputedStyle(el).fontSize)
      if (visible(el) && size < 16) problems.push(`field text ${size}px makes iOS zoom (needs 16px): ${name(el)}`)
    }
  }
  return [...new Set(problems)]
}

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome' })
let failures = 0
for (const [actor, cfg] of Object.entries(ACTORS)) {
  if (ONLY && !ONLY.includes(actor)) continue
  if (cfg.login && !cfg.login[2]) {
    console.log(`- ${actor}: skipped, no SEED_PASSWORD_* set for this account`)
    continue
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  if (cfg.login) {
    const [portal, email, password] = cfg.login
    await page.goto(`${BASE}/login/${portal}`, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type=submit]')
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  }
  for (let route of cfg.routes) {
    if (route === '/patients/:first') {
      const token = await page.evaluate(() => localStorage.getItem('clinvia_token'))
      const res = await fetch(`${API}/api/patients?page=0`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null)
      const code = res?.rows?.[0]?.code
      if (!code) continue
      route = `/patients/${code}`
    }
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < PHONE ? 844 : 900 })
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
      const problems = await page.evaluate(inspect, { phone: PHONE, minTarget: MIN_TARGET })
      console.log(`${problems.length ? '✗' : '✓'} ${actor} ${route} @${width}px`)
      for (const p of problems.slice(0, 10)) console.log(`    ${p}`)
      if (problems.length > 10) console.log(`    …and ${problems.length - 10} more`)
      failures += problems.length ? 1 : 0
      if (SHOTS && width < PHONE) {
        fs.mkdirSync('.responsive', { recursive: true })
        const file = `.responsive/${actor}${route.replace(/[/:]/g, '_')}@${width}.png`
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled', timeout: 8000 }).catch(() => {})
      }
    }
  }
  await ctx.close()
}
await browser.close()
console.log(failures ? `\n${failures} page/width combinations need fixing.` : '\nEvery page fits phones, tablets and desktops.')
process.exit(failures ? 1 : 0)
