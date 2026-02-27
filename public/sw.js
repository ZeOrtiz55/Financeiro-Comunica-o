// Service Worker — Push Notifications + Realtime resilience
// Sistema Financeiro

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

// ─── RECEBE PUSH E EXIBE NOTIFICAÇÃO ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'Notificação', body: event.data?.text() ?? '' }
  }

  const title = data.title || 'Sistema Financeiro'
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'sf-notif',
    renotify: true,
    requireInteraction: false,
    silent: false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─── CLIQUE NA NOTIFICAÇÃO — abre/foca o app ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Procura uma janela já aberta do app
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin)) {
            if ('focus' in client) {
              return client.focus().then(() => {
                if (client.navigate) client.navigate(url)
              })
            }
          }
        }
        // Nenhuma janela aberta → abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
