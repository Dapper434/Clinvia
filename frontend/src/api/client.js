/**
 * TBTrack Central API Client
 * Configures base URL from VITE_API_URL and attaches Authorization Bearer tokens.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

export function getToken() {
  return localStorage.getItem('tbtrack_token')
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('tbtrack_token', token)
  } else {
    localStorage.removeItem('tbtrack_token')
  }
}

export function removeToken() {
  localStorage.removeItem('tbtrack_token')
}

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const config = {
    ...options,
    headers,
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body)
  }

  let response
  try {
    response = await fetch(url, config)
  } catch (networkError) {
    const error = new Error(
      `Unable to connect to backend server at ${API_BASE_URL}. Is the server running?`,
    )
    error.cause = networkError
    throw error
  }

  const contentType = response.headers.get('content-type')
  const data =
    contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text()

  if (!response.ok) {
    const errorMessage = (data && data.error) || (data && data.message) || response.statusText || 'Request failed'
    const error = new Error(errorMessage)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
