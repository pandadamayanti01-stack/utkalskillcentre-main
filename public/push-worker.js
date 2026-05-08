/*
 * UTKAL SKILL CENTRE: PWA BACKGROUND PUSH WORKER
 * Intercepts incoming server pushes and displays premium, native OS banners.
 */

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event received with no data payload');
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'Utkal Skill Centre';
    const options = {
      body: data.body || 'New lesson update available!',
      icon: '/utkal-192.png',
      badge: '/utkal-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      },
      // Ensure notification stands out beautifully on high-end mobile devices
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Failed to parse push notification payload:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  // Open or focus application window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and redirect
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      // Otherwise, open a pristine new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
