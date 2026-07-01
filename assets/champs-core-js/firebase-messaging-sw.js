// firebase-messaging-sw.js
// Arquivo de Service Worker para notificações Firebase em background.
//
// INSTRUÇÕES DE USO:
//   1. Copie este arquivo para o root público do seu projeto:
//      - Symfony:  cp vendor/betocampoy/champs-frontend/assets/champs-core-js/firebase-messaging-sw.js public/firebase-messaging-sw.js
//      - Legado:   cp vendor/betocampoy/champs-frontend/assets/champs-core-js/firebase-messaging-sw.js public/firebase-messaging-sw.js
//   2. NÃO edite este arquivo — a configuração do Firebase é enviada automaticamente
//      pelo módulo PushManager.js via postMessage.
//
// O service worker precisa estar na raiz do site (ex: https://meusite.com/firebase-messaging-sw.js)
// para que o Firebase possa interceptar notificações push em background.

const FIREBASE_VERSION = '10.12.0';

importScripts(
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js`,
);

let messaging = null;

// Recebe o firebaseConfig enviado pelo PushManager.js após o registro do SW
self.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'CHAMPS_PUSH_CONFIG') return;

    // Evita reinicializar se já estiver configurado
    if (messaging) return;

    try {
        const app = firebase.initializeApp(event.data.config);
        messaging = firebase.messaging(app);

        messaging.onBackgroundMessage((payload) => {
            const notification = payload.notification || {};
            const data         = payload.data         || {};

            const title   = notification.title || data.title || 'Notificação';
            const options = {
                body:  notification.body  || data.body  || '',
                icon:  notification.image || data.icon  || '/favicon.ico',
                badge: data.badge         || '',
                data:  {
                    clickUrl: data.clickUrl || data.url || notification.click_action || '/',
                },
            };

            if (notification.image) {
                options.image = notification.image;
            }

            self.registration.showNotification(title, options);
        });
    } catch (err) {
        console.error('[champs:push:sw] Erro ao inicializar Firebase:', err);
    }
});

// Abre a URL de destino ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.clickUrl || '/';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Reusa uma aba já aberta com a mesma URL, se existir
                for (const client of windowClients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Caso contrário, abre nova aba
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            }),
    );
});
