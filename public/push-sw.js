/* eslint-disable no-restricted-globals */
'use strict'

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    return
  }
  const title = payload.title || 'Xarxa Anglesola'
  const body = payload.body || ''
  const url = payload.url || '/app'
  const tag = payload.tag || 'xarxa-push-' + Date.now()

  const options = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag,
    data: { url },
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/app'
  const fullUrl = url.startsWith('http') ? url : self.location.origin + (url.startsWith('/') ? url : '/' + url)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl)
      }
    })
  )
})
