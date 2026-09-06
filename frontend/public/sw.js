self.addEventListener('push', (event) => {
  let data = { title: 'HoopCoach', body: 'You have a new update.' };
  try { data = event.data.json(); } catch { /* ignore */ }
  event.waitUntil(
    self.registration.showNotification(data.title || 'HoopCoach', {
      body: data.body,
      icon: '/favicon.svg',
      tag: data.tag || 'hoopcoach',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
