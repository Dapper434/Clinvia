import { apiClient } from './client.js'

export function getVapidPublicKeyApi() {
  return apiClient('/api/push/vapid-public-key')
}

export function subscribePushApi(subscription) {
  return apiClient('/api/push/subscribe', { method: 'POST', body: subscription })
}

export function unsubscribePushApi(endpoint) {
  return apiClient('/api/push/subscribe', { method: 'DELETE', body: { endpoint } })
}

export function sendTestPushApi() {
  return apiClient('/api/push/test', { method: 'POST' })
}
