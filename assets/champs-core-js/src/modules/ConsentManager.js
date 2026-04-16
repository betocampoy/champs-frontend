import Message from './Message.js';

function nowISO() {
    try { return new Date().toISOString(); } catch { return ''; }
}

function strToBool(v, fallback = false) {
    if (v === undefined || v === null) return fallback;
    const s = String(v).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    return fallback;
}

function getStorageKey(scope) {
    const finalScope = (scope || 'default').trim() || 'default';
    return `champs:consent:${finalScope}`;
}

function getPreferencePrefix() {
    return 'champs:pref:';
}

function buildPreferenceKey(key) {
    const normalized = String(key || '')
        .trim()
        .replace(/[^a-zA-Z0-9:_-]/g, '_');

    return `${getPreferencePrefix()}${normalized}`;
}

function readStored(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeStored(storageKey, obj) {
    try { localStorage.setItem(storageKey, JSON.stringify(obj)); } catch {}
}

function removeStored(storageKey) {
    try { localStorage.removeItem(storageKey); } catch {}
}

function parseCategories(body) {
    const raw = (body.dataset.champsConsentCategories || '').trim();
    return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function getCategoryMeta(body, categories) {
    const meta = {};

    categories.forEach((category) => {
        const cap = category.charAt(0).toUpperCase() + category.slice(1);

        meta[category] = {
            label: body.dataset[`champsConsentLabel${cap}`] || category,
            default: strToBool(body.dataset[`champsConsentDefault${cap}`], false),
            necessary: strToBool(body.dataset[`champsConsentNecessary${cap}`], false),
            description: body.dataset[`champsConsentDescription${cap}`] || '',
        };
    });

    return meta;
}

function getConfig() {
    const body = document.body;

    const version = body.dataset.champsConsentVersion || '1';
    const policyUrl = body.dataset.champsConsentPolicyUrl || '';
    const categories = parseCategories(body);
    const templateSel = body.dataset.champsConsentTemplate || '';
    const scope = body.dataset.champsConsentScope || 'default';
    const customMessage = body.dataset.champsConsentCustomMessage || '';
    const meta = getCategoryMeta(body, categories);

    return {
        version,
        policyUrl,
        categories,
        meta,
        templateSel,
        scope,
        customMessage,
    };
}

function buildDefaultState(cfg) {
    const cats = {};

    cfg.categories.forEach((c) => {
        if (cfg.meta[c]?.necessary) {
            cats[c] = true;
            return;
        }

        cats[c] = cfg.meta[c]?.default ?? false;
    });

    return {
        version: cfg.version,
        categories: cats,
        updatedAt: nowISO(),
    };
}

function normalizeConsent(consent, cfg) {
    const normalized = buildDefaultState(cfg);

    if (!consent || typeof consent !== 'object' || typeof consent.categories !== 'object') {
        return normalized;
    }

    cfg.categories.forEach((c) => {
        if (cfg.meta[c]?.necessary) {
            normalized.categories[c] = true;
        } else {
            normalized.categories[c] = !!consent.categories[c];
        }
    });

    normalized.version = cfg.version;
    normalized.updatedAt = consent.updatedAt || nowISO();

    return normalized;
}

function isValidConsent(consent, cfg) {
    if (!consent || typeof consent !== 'object') return false;
    if (consent.version !== cfg.version) return false;
    if (!consent.categories || typeof consent.categories !== 'object') return false;

    for (const category of cfg.categories) {
        if (cfg.meta[category]?.necessary && consent.categories[category] !== true) {
            return false;
        }
    }

    return true;
}

function dispatch(name, detail) {
    try {
        document.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {}
}

function ensureContainer() {
    let root = document.querySelector('#champs-consent-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'champs-consent-root';
    document.body.appendChild(root);
    return root;
}

function renderFromTemplate(selector, fallbackHtml) {
    if (!selector) return fallbackHtml;

    const el = document.querySelector(selector);
    if (!el) return fallbackHtml;

    if (el.tagName === 'TEMPLATE') return el.innerHTML || fallbackHtml;
    return el.innerHTML || fallbackHtml;
}

function ensureVanillaModalStyles() {
    if (document.getElementById('champs-consent-vanilla-style')) return;

    const style = document.createElement('style');
    style.id = 'champs-consent-vanilla-style';
    style.textContent = `
        #champsConsentModal.champs-consent-modal-open{
          opacity: 1 !important;
        }

        #champsConsentModal.champs-consent-modal-open.fade{
          opacity: 1 !important;
        }

        #champsConsentModal.champs-consent-modal-open .modal-dialog{
          transform: none !important;
        }

        #champsConsentModal.champs-consent-modal-open{
          pointer-events: auto;
        }

        .champs-consent-backdrop{
          position: fixed; inset: 0; z-index: 1090;
          background: rgba(0,0,0,.45);
        }

        .champs-consent-modal-open{
          display: block !important;
        }

        #champsConsentModal{
          display: none;
          position: fixed; inset: 0; z-index: 1100;
          overflow: auto;
        }

        #champsConsentModal .modal-dialog{
          margin: 40px auto;
          max-width: 680px;
          width: calc(100% - 36px);
        }

        #champsConsentModal .modal-content{
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 18px 40px rgba(0,0,0,.18);
          border: 1px solid rgba(0,0,0,.08);
        }

        #champsConsentModal .modal-header,
        #champsConsentModal .modal-body,
        #champsConsentModal .modal-footer{
          padding: 14px 16px;
        }

        #champsConsentModal .modal-header{
          display:flex; align-items:center; justify-content:space-between;
          border-bottom: 1px solid rgba(0,0,0,.08);
        }

        #champsConsentModal .modal-footer{
          display:flex; gap:10px; justify-content:flex-end; flex-wrap: wrap;
          border-top: 1px solid rgba(0,0,0,.08);
        }

        #champsConsentModal .btn-close{
          border: 0; background: transparent;
          font-size: 18px; line-height: 1;
          cursor: pointer;
        }

        .champs-consent-category{
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 12px;
          padding: 12px;
          background: #f8f9fa;
        }

        .champs-consent-category.is-necessary{
          border-color: rgba(13,110,253,.25);
          background: rgba(13,110,253,.04);
        }
    `;
    document.head.appendChild(style);
}

function showVanillaModal(modalEl) {
    ensureVanillaModalStyles();

    let backdrop = document.querySelector('.champs-consent-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'champs-consent-backdrop';
        backdrop.addEventListener('click', () => hideVanillaModal(modalEl));
        document.body.appendChild(backdrop);
    }

    modalEl.classList.add('champs-consent-modal-open', 'show', 'in');
    modalEl.style.display = 'block';
    modalEl.setAttribute('aria-hidden', 'false');

    const onKey = (e) => {
        if (e.key === 'Escape') hideVanillaModal(modalEl);
    };
    modalEl.__champsKeyHandler = onKey;
    document.addEventListener('keydown', onKey);
}

function hideVanillaModal(modalEl) {
    modalEl.classList.remove('champs-consent-modal-open', 'show', 'in');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');

    const backdrop = document.querySelector('.champs-consent-backdrop');
    if (backdrop) backdrop.remove();

    if (modalEl.__champsKeyHandler) {
        document.removeEventListener('keydown', modalEl.__champsKeyHandler);
        modalEl.__champsKeyHandler = null;
    }
}

function tryOpenModal() {
    const el = document.getElementById('champsConsentModal');
    if (!el) return false;

    if (window.bootstrap?.Modal) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(el);
        modal.show();
        return true;
    }

    showVanillaModal(el);
    return true;
}

function tryCloseModal() {
    const el = document.getElementById('champsConsentModal');
    if (!el) return false;

    if (window.bootstrap?.Modal) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(el);
        modal.hide();
        return true;
    }

    hideVanillaModal(el);
    return true;
}

function buildCategoryBlocks(cfg) {
    return cfg.categories.map((category) => {
        const meta = cfg.meta[category] || {};
        const id = `champs-consent-${category}`;
        const label = meta.label || category;
        const necessaryBadge = meta.necessary
            ? `<span class="badge text-bg-primary ms-2">Obrigatório</span>`
            : '';

        const description = meta.description
            ? `<div class="text-muted small mt-1">${meta.description}</div>`
            : '';

        return `
            <div class="champs-consent-category ${meta.necessary ? 'is-necessary' : ''}">
                <div class="form-check form-switch mb-0">
                    <input class="form-check-input"
                           type="checkbox"
                           role="switch"
                           id="${id}"
                           data-champs-consent-cat="${category}"
                           ${meta.necessary ? 'checked disabled' : ''}>
                    <label class="form-check-label fw-semibold" for="${id}">
                        ${label}${necessaryBadge}
                    </label>
                </div>
                ${description}
            </div>
        `;
    }).join('');
}

function defaultUIHtml(cfg) {
    const policyLink = cfg.policyUrl
        ? `<a href="${cfg.policyUrl}" target="_blank" rel="noopener" class="link-primary">Política de Privacidade</a>`
        : '';

    const customMessageHtml = cfg.customMessage
        ? `<div class="alert alert-info small mt-2 mb-0">${cfg.customMessage}</div>`
        : '';

    const categoriesHtml = buildCategoryBlocks(cfg);

    return `
  <style>
    #champs-consent-banner{
      position: fixed; left: 18px; right: 18px; bottom: 18px; z-index: 1090;
      background: #fff; border: 1px solid rgba(0,0,0,.08);
      border-radius: 16px; padding: 14px 16px;
      box-shadow: 0 18px 40px rgba(0,0,0,.12);
    }
    @media (min-width: 992px){
      #champs-consent-banner{ left: 24px; right: auto; width: 560px; }
    }
    #champs-consent-banner .btn{ border-radius: 999px; }
  </style>

  <div id="champs-consent-banner" class="d-none">
    <div class="d-flex align-items-start gap-3">
      <div class="flex-grow-1">
        <div class="fw-semibold mb-1">Cookies & Privacidade</div>
        <div class="text-muted small">
          Usamos tecnologias de armazenamento no dispositivo para manter funcionalidades e melhorar a experiência. Você pode aceitar, recusar ou gerenciar preferências.
          ${policyLink ? `<div class="mt-1">${policyLink}</div>` : ''}
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-outline-secondary" type="button" data-champs-consent-open>Preferências</button>
        <button class="btn btn-sm btn-outline-secondary" type="button" data-champs-consent-reject>Rejeitar opcionais</button>
        <button class="btn btn-sm btn-primary" type="button" data-champs-consent-accept>Aceitar</button>
      </div>
    </div>
  </div>

  <div class="modal fade" id="champsConsentModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" style="border-radius: 18px;">
        <div class="modal-header">
          <h5 class="modal-title">Preferências de Privacidade</h5>
          <button type="button" class="btn-close" aria-label="Fechar" data-champs-consent-close>&times;</button>
        </div>
        <div class="modal-body">
        <div id="champs-consent-modal-message" class="mb-3"></div>
          <p class="text-muted small">
            Escolha quais categorias opcionais você deseja permitir. Categorias marcadas como obrigatórias são necessárias para o funcionamento mínimo da aplicação.
            ${policyLink ? `<div class="mt-1">${policyLink}</div>` : ''}
          </p>

          ${customMessageHtml}

          <div class="d-flex flex-column gap-2 mt-3">
            ${categoriesHtml}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline-danger me-auto" type="button" data-champs-consent-reset-preferences>
            Resetar preferências
          </button>
          <button class="btn btn-outline-dark" type="button" data-champs-consent-reset-all>
            Resetar tudo
          </button>
          <button class="btn btn-outline-secondary" type="button" data-champs-consent-close>Cancelar</button>
          <button class="btn btn-primary" type="button" data-champs-consent-save>Salvar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function setBannerVisible(visible) {
    const banner = document.querySelector('#champs-consent-banner');
    if (!banner) return;

    banner.hidden = !visible;
    banner.style.display = visible ? '' : 'none';
    banner.classList.toggle('d-none', !visible);
}

function applyStateToModal(consent, cfg) {
    cfg.categories.forEach((category) => {
        const input = document.querySelector(`[data-champs-consent-cat="${category}"]`);
        if (!input) return;

        if (cfg.meta[category]?.necessary) {
            input.checked = true;
            return;
        }

        input.checked = !!consent.categories[category];
    });
}

function readStateFromModal(cfg) {
    const cats = {};

    cfg.categories.forEach((category) => {
        if (cfg.meta[category]?.necessary) {
            cats[category] = true;
            return;
        }

        const input = document.querySelector(`[data-champs-consent-cat="${category}"]`);
        cats[category] = !!input?.checked;
    });

    return cats;
}

function resolvePreferenceStorage(storage = 'local') {
    return String(storage || 'local').trim().toLowerCase() === 'cookie' ? 'cookie' : 'local';
}

function getCookieValue(name) {
    const cookieName = `${name}=`;
    const parts = document.cookie.split(';');

    for (let part of parts) {
        part = part.trim();
        if (part.startsWith(cookieName)) {
            return part.substring(cookieName.length);
        }
    }

    return null;
}

function setCookieValue(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

function removeCookieValue(name) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
}

function readPreference(key, options = {}) {
    const storage = resolvePreferenceStorage(options.storage);
    const finalKey = buildPreferenceKey(key);

    try {
        if (storage === 'cookie') {
            const raw = getCookieValue(finalKey);
            return raw ? JSON.parse(decodeURIComponent(raw)) : null;
        }

        const raw = localStorage.getItem(finalKey);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writePreference(key, value, options = {}) {
    const storage = resolvePreferenceStorage(options.storage);
    const finalKey = buildPreferenceKey(key);

    try {
        if (storage === 'cookie') {
            const encoded = encodeURIComponent(JSON.stringify(value));
            setCookieValue(finalKey, encoded, options.days || 365);
            return true;
        }

        localStorage.setItem(finalKey, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function removePreference(key, options = {}) {
    const storage = resolvePreferenceStorage(options.storage);
    const finalKey = buildPreferenceKey(key);

    try {
        if (storage === 'cookie') {
            removeCookieValue(finalKey);
            return true;
        }

        localStorage.removeItem(finalKey);
        return true;
    } catch {
        return false;
    }
}

function clearStoredPreferences() {
    const prefix = getPreferencePrefix();
    const removedKeys = [];

    try {
        const localKeysToRemove = [];

        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                localKeysToRemove.push(key);
            }
        }

        localKeysToRemove.forEach((key) => {
            removedKeys.push(key);
            localStorage.removeItem(key);
        });

        const cookies = document.cookie.split(';');
        cookies.forEach((cookiePart) => {
            const [rawName] = cookiePart.split('=');
            const name = rawName?.trim();

            if (name && name.startsWith(prefix)) {
                removedKeys.push(name);
                removeCookieValue(name);
            }
        });
    } catch {}

    return removedKeys;
}

function showFeedback(text, level = 'success', options = {}) {
    try {
        Message?.show?.(text, level, {
            clearBefore: true,
            persist: false,
            seconds: 4,
            target: '#champs-consent-modal-message',
            ...options,
        });
        return true;
    } catch (err) {
        console.error('[Consent] Message.show falhou:', err);
    }

    return false;
}

export default class ConsentManager {
    static getScope() {
        const body = document.body;
        return body?.dataset?.champsConsentScope || 'default';
    }

    static getStorageKey(scope = null) {
        return getStorageKey(scope || this.getScope());
    }

    static getConfig() {
        return getConfig();
    }

    static getConsent(scope = null) {
        const cfg = getConfig();
        const storageKey = getStorageKey(scope || cfg.scope);
        const stored = readStored(storageKey);

        if (isValidConsent(stored, cfg)) {
            return normalizeConsent(stored, cfg);
        }

        return buildDefaultState(cfg);
    }

    static canStorePreferences(scope = null) {
        const consent = this.getConsent(scope);
        return !!consent?.categories?.preferences;
    }

    static saveConsent(consent, scope = null) {
        const cfg = getConfig();
        const storageKey = getStorageKey(scope || this.getScope());
        const normalized = normalizeConsent(consent, cfg);
        writeStored(storageKey, normalized);
    }

    static resetConsent(scope = null) {
        const storageKey = getStorageKey(scope || this.getScope());
        removeStored(storageKey);

        dispatch('champs:consent:reset', {
            scope: scope || this.getScope(),
            storageKey,
        });

        return true;
    }

    static getPreference(key, options = {}) {
        return readPreference(key, options);
    }

    static setPreference(key, value, options = {}) {
        if (!this.canStorePreferences()) {
            return false;
        }

        const ok = writePreference(key, value, options);

        if (ok) {
            dispatch('champs:preference:changed', {
                key,
                value,
                storage: resolvePreferenceStorage(options.storage),
            });
        }

        return ok;
    }

    static removePreference(key, options = {}) {
        const ok = removePreference(key, options);

        if (ok) {
            dispatch('champs:preference:removed', {
                key,
                storage: resolvePreferenceStorage(options.storage),
            });
        }

        return ok;
    }

    static resetPreferences() {
        const removedKeys = clearStoredPreferences();

        dispatch('champs:preference:reset', {
            removedKeys,
        });

        return true;
    }

    static resetAll(scope = null) {
        this.resetPreferences();
        this.resetConsent(scope);

        dispatch('champs:userstate:reset', {
            scope: scope || this.getScope(),
        });

        return true;
    }
}

export function initConsentManager(scope = document) {
    const body = document.body;

    if (!body.hasAttribute('data-champs-consent')) return;

    const cfg = getConfig();
    const storageKey = getStorageKey(cfg.scope);

    const root = ensureContainer();
    root.innerHTML = renderFromTemplate(cfg.templateSel, defaultUIHtml(cfg));

    let consent = readStored(storageKey);
    const valid = isValidConsent(consent, cfg);

    if (!valid) {
        consent = buildDefaultState(cfg);
        setBannerVisible(true);
    } else {
        consent = normalizeConsent(consent, cfg);
        setBannerVisible(false);
    }

    window.Champs = window.Champs || {};
    window.Champs.consent = {
        get: () => consent,
        has: (cat) => !!consent?.categories?.[cat],
        openPreferences: () => {
            try {
                applyStateToModal(consent, cfg);
                const opened = tryOpenModal();
                if (!opened) {
                    alert('Não foi possível abrir as preferências agora.');
                }
            } catch (err) {
                console.error('[Consent] openPreferences failed:', err);
                alert('Não foi possível abrir as preferências agora.');
            }
        },
        reset: () => {
            ConsentManager.resetAll(cfg.scope);
            location.reload();
        },
        resetConsent: () => {
            ConsentManager.resetConsent(cfg.scope);
            location.reload();
        },
        resetPreferences: () => {
            ConsentManager.resetPreferences();
            showFeedback('Preferências locais resetadas com sucesso.', 'success');
        },
        canStorePreferences: () => ConsentManager.canStorePreferences(cfg.scope),
        getPreference: (key, options = {}) => ConsentManager.getPreference(key, options),
        setPreference: (key, value, options = {}) => ConsentManager.setPreference(key, value, options),
        removePreference: (key, options = {}) => ConsentManager.removePreference(key, options),
        getStorageKey: () => storageKey,
        getScope: () => cfg.scope || 'default',
    };

    dispatch('champs:consent:ready', { consent, config: cfg });

    document.addEventListener('click', (e) => {
        try {
            const t = e.target;

            if (t.closest?.('[data-champs-consent-close]')) {
                e.preventDefault?.();
                tryCloseModal();
                return;
            }

            if (t.closest?.('[data-champs-consent-open]')) {
                e.preventDefault?.();
                applyStateToModal(consent, cfg);

                const opened = tryOpenModal();
                if (!opened) {
                    alert('Preferências indisponíveis aqui. Use Aceitar/Rejeitar no banner.');
                }
                return;
            }

            if (t.closest?.('[data-champs-consent-accept]')) {
                cfg.categories.forEach((category) => {
                    consent.categories[category] = true;
                });

                consent.version = cfg.version;
                consent.updatedAt = nowISO();

                consent = normalizeConsent(consent, cfg);
                writeStored(storageKey, consent);

                setBannerVisible(false);

                dispatch('champs:consent:accept', { consent, config: cfg });
                dispatch('champs:consent:changed', { consent, config: cfg });
                return;
            }

            if (t.closest?.('[data-champs-consent-reject]')) {
                cfg.categories.forEach((category) => {
                    consent.categories[category] = cfg.meta[category]?.necessary ? true : false;
                });

                consent.version = cfg.version;
                consent.updatedAt = nowISO();

                consent = normalizeConsent(consent, cfg);
                writeStored(storageKey, consent);

                setBannerVisible(false);

                dispatch('champs:consent:reject', { consent, config: cfg });
                dispatch('champs:consent:changed', { consent, config: cfg });
                return;
            }

            if (t.closest?.('[data-champs-consent-save]')) {
                const cats = readStateFromModal(cfg);

                consent.categories = cats;
                consent.version = cfg.version;
                consent.updatedAt = nowISO();

                consent = normalizeConsent(consent, cfg);
                writeStored(storageKey, consent);

                setBannerVisible(false);
                tryCloseModal();

                dispatch('champs:consent:changed', { consent, config: cfg });
                return;
            }

            if (t.closest?.('[data-champs-consent-reset-preferences]')) {
                e.preventDefault?.();

                ConsentManager.resetPreferences();

                showFeedback('Preferências locais resetadas com sucesso.', 'success', {
                    target: '#champs-consent-modal-message',
                    seconds: 3,
                });

                dispatch('champs:consent:preferences-reset-requested', {
                    config: cfg,
                });

                setTimeout(() => {
                    tryCloseModal();
                }, 2200);

                return;
            }

            if (t.closest?.('[data-champs-consent-reset-all]')) {
                e.preventDefault?.();
                ConsentManager.resetAll(cfg.scope);
                location.reload();
                return;
            }
        } catch (err) {
            console.error('[Consent] click handler error (ignored):', err);
        }
    }, true);
}