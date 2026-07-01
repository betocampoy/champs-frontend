const FIREBASE_VERSION = '10.12.0';
const FIREBASE_CDN = (version) =>
    `https://www.gstatic.com/firebasejs/${version}`;

function dispatch(eventName, detail = {}) {
    document.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail }));
}

function readFirebaseConfig(body) {
    const d = body.dataset;
    return {
        apiKey:            d.champsPushApiKey            || '',
        authDomain:        d.champsPushAuthDomain        || '',
        projectId:         d.champsPushProjectId         || '',
        storageBucket:     d.champsPushStorageBucket     || '',
        messagingSenderId: d.champsPushMessagingSenderId || '',
        appId:             d.champsPushAppId             || '',
        ...(d.champsPushMeasurementId ? { measurementId: d.champsPushMeasurementId } : {}),
    };
}

function readTopics(body) {
    const raw = (body.dataset.champsPushTopics || '').trim();
    return raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : [];
}

function isSupported() {
    return (
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window
    );
}

async function registerServiceWorker(swUrl) {
    try {
        const registration = await navigator.serviceWorker.register(swUrl);
        await navigator.serviceWorker.ready;
        return registration;
    } catch (err) {
        throw new Error(`[champs:push] Falha ao registrar service worker (${swUrl}): ${err.message}`);
    }
}

function sendConfigToSW(registration, config) {
    const target = registration.active || registration.waiting || registration.installing;
    if (!target) return;

    const send = () => target.postMessage({ type: 'CHAMPS_PUSH_CONFIG', config });

    if (target.state === 'activated') {
        send();
    } else {
        target.addEventListener('statechange', function handler() {
            if (target.state === 'activated') {
                target.removeEventListener('statechange', handler);
                send();
            }
        });
    }
}

async function registerToken(messaging, getToken, vapidKey, registration, registerRoute, topics) {
    const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
    });

    if (!token) {
        dispatch('champs:push:error', { error: 'token_empty' });
        return null;
    }

    if (registerRoute) {
        try {
            await fetch(registerRoute, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    topics,
                    userAgent: navigator.userAgent,
                }),
            });
            dispatch('champs:push:registered', { token, topics });
        } catch (err) {
            dispatch('champs:push:error', { error: 'register_failed', message: err.message });
        }
    }

    return token;
}

async function requestAndRegister(messaging, getToken, vapidKey, registration, registerRoute, topics) {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
        dispatch('champs:push:permission-granted');
        return await registerToken(messaging, getToken, vapidKey, registration, registerRoute, topics);
    }

    dispatch('champs:push:permission-denied');
    return null;
}

// ─── Public class ────────────────────────────────────────────────────────────

export default class PushManager {
    static isSupported() {
        return isSupported();
    }

    static getPermissionState() {
        return 'Notification' in window ? Notification.permission : 'unsupported';
    }

    static async requestPermission() {
        const api = window.Champs?.push?._internal;
        if (!api) {
            console.warn('[champs:push] Módulo ainda não inicializado.');
            return null;
        }
        return requestAndRegister(
            api.messaging,
            api.getToken,
            api.vapidKey,
            api.registration,
            api.registerRoute,
            api.topics,
        );
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initPushManager(scope = document) {
    const body = document.body;

    if (!body || !body.hasAttribute('data-champs-push')) return;
    if (!isSupported()) {
        console.warn('[champs:push] Notificações Push não suportadas neste navegador.');
        dispatch('champs:push:error', { error: 'unsupported' });
        return;
    }

    if (document.documentElement.dataset.champsPushBound === '1') return;
    document.documentElement.dataset.champsPushBound = '1';

    const config       = readFirebaseConfig(body);
    const vapidKey     = body.dataset.champsPushVapidKey     || '';
    const registerRoute = body.dataset.champsPushRegisterRoute || '';
    const autoRequest  = body.dataset.champsPushAutoRequest === 'true';
    const swUrl        = body.dataset.champsPushSwUrl        || '/firebase-messaging-sw.js';
    const sdkVersion   = body.dataset.champsPushSdkVersion   || FIREBASE_VERSION;
    const topics       = readTopics(body);
    const cdnBase      = FIREBASE_CDN(sdkVersion);

    if (!config.apiKey || !config.projectId || !vapidKey) {
        console.error('[champs:push] Atributos obrigatórios ausentes: data-champs-push-api-key, data-champs-push-project-id, data-champs-push-vapid-key.');
        dispatch('champs:push:error', { error: 'missing_config' });
        return;
    }

    try {
        const [{ initializeApp }, { getMessaging, getToken, onMessage }] = await Promise.all([
            import(`${cdnBase}/firebase-app.js`),
            import(`${cdnBase}/firebase-messaging.js`),
        ]);

        const app       = initializeApp(config);
        const messaging = getMessaging(app);
        const registration = await registerServiceWorker(swUrl);

        sendConfigToSW(registration, config);

        // API pública
        window.Champs = window.Champs || {};
        window.Champs.push = {
            requestPermission: () =>
                requestAndRegister(messaging, getToken, vapidKey, registration, registerRoute, topics),
            getPermissionState: () => PushManager.getPermissionState(),
            isSupported: () => isSupported(),
            _internal: { messaging, getToken, vapidKey, registration, registerRoute, topics },
        };

        dispatch('champs:push:ready', { supported: true });

        // Mensagens em foreground
        onMessage(messaging, (payload) => {
            dispatch('champs:push:message', { payload });

            const notification = payload.notification;
            if (!notification) return;

            if (window.Champs?.message?.show) {
                window.Champs.message.show(
                    `<strong>${notification.title || ''}</strong>${notification.body ? `<br>${notification.body}` : ''}`,
                    'info',
                );
            }
        });

        // Solicitar permissão automaticamente
        if (autoRequest && Notification.permission === 'default') {
            await requestAndRegister(messaging, getToken, vapidKey, registration, registerRoute, topics);
        } else if (Notification.permission === 'granted' && registerRoute) {
            await registerToken(messaging, getToken, vapidKey, registration, registerRoute, topics);
        }
    } catch (err) {
        console.error('[champs:push] Erro ao inicializar:', err);
        dispatch('champs:push:error', { error: err.message });
    }
}
