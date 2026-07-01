// firebase-messaging-sw.js
// Service Worker para notificações Firebase em background.
//
// INSTRUÇÕES DE USO:
//   Copie este arquivo para o root público do seu projeto:
//     cp vendor/betocampoy/champs-frontend/assets/champs-core-js/firebase-messaging-sw.js public/firebase-messaging-sw.js
//
// Não usa Firebase compat — trata o evento push diretamente para ser confiável
// mesmo quando o SW acorda "frio" (sem página aberta).

// ── Background push ───────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
    event.waitUntil((async () => {
        let payload = {};
        try {
            payload = event.data?.json() ?? {};
        } catch (_) {}

        const notification = payload.notification || {};
        const data         = payload.data         || {};

        const title = notification.title || data.title || 'Notificação';

        const options = {
            body:  notification.body  || data.body  || '',
            icon:  notification.icon  || data.icon  || '/favicon.ico',
            badge: data.badge || '',
            data:  {
                clickUrl: data.url || data.clickUrl || '/',
            },
        };

        if (notification.image) {
            options.image = notification.image;
        }

        return self.registration.showNotification(title, options);
    })());
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.clickUrl || '/';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            }),
    );
});
