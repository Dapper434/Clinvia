// Clinvia service worker: shows dose reminders even when the app isn't open.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Clinvia reminder'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Time for your TB medicine.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'dose-reminder',
      renotify: true,
      data: { url: data.url || '/my-treatment' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/my-treatment', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin))
      if (existing) {
        existing.navigate(target)
        return existing.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
