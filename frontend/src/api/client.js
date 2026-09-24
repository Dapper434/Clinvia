/**
 * Clinvia API client: base URL from VITE_API_URL, Bearer token, and — for the network
 * admin — the hospital they are looking at, sent as X-Hospital.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const SCOPE_KEY = 'clinvia_scope'

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* storage unavailable: the session just won't persist */
  }
}

export function getToken() {
  return read('clinvia_token')
}

export function setToken(token) {
  write('clinvia_token', token)
}

export function removeToken() {
  write('clinvia_token', null)
  write(SCOPE_KEY, null)
}

export function getScope() {
  return read(SCOPE_KEY) || 'all'
}

export function setScope(slug) {
  write(SCOPE_KEY, slug && slug !== 'all' ? slug : null)
}

function headersFor(options) {
  const token = getToken()
  const scope = getScope()
  return {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(scope !== 'all' ? { 'X-Hospital': scope } : {}),
    ...options.headers,
  }
}

async function send(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const config = { ...options, headers: headersFor(options) }
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body)
  }
  try {
    return await fetch(url, config)
  } catch (networkError) {
    const error = new Error(`Can't reach the Clinvia server at ${API_BASE_URL}. Check your connection.`)
    error.cause = networkError
    throw error
  }
}

async function failure(response) {
  const type = response.headers.get('content-type') || ''
  const data = type.includes('application/json') ? await response.json() : await response.text()
  const error = new Error((data && data.error) || (data && data.message) || response.statusText || 'Request failed')
  error.status = response.status
  error.data = data
  return error
}

export async function apiClient(endpoint, options = {}) {
  const response = await send(endpoint, options)
  if (!response.ok) throw await failure(response)
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.text()
}

/** Fetches a file with the user's credentials and hands it to the browser. */
export async function apiDownload(endpoint, filename, { open = false } = {}) {
  const response = await send(endpoint)
  if (!response.ok) throw await failure(response)
  const blob = await response.blob()
  const href = URL.createObjectURL(blob)
  if (open) {
    window.open(href, '_blank', 'noopener')
  } else {
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
}
