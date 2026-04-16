/**
 * Champs Core — TabsPersistence
 *
 * Objetivo:
 * - Persistir a última TAB selecionada (Bootstrap 5 nav-tabs)
 * - Configuração 100% via data-attributes (data-champs-tabs)
 *
 * Como usar (mínimo):
 * <ul class="nav nav-tabs" id="empresaTabs" data-champs-tabs>...</ul>
 *
 * (Opcional)
 * data-champs-tabs-key="empresaTabs"     // se não tiver id
 * data-champs-tabs-mode="both|hash|storage" // default: both
 * data-champs-tabs-default="main"        // key default (se não houver hash/storage)
 *
 * Formato de IDs esperado (padrão do nosso macro navTabs/tabPaneStart):
 * - botão: data-bs-target="#{navId}-{key}"
 * - pane : id="{navId}-{key}"
 * - hash : "#{navId}={key}"
 */

export function initTabsPersistence(scope = document) {
    const navs = scope.querySelectorAll('[data-champs-tabs]');
    if (!navs.length) return;

    navs.forEach((navEl) => {
        // Evita double-init (importante quando AjaxForm/Modal re-inicializa o DOM)
        if (navEl.dataset.champsTabsInit === '1') return;
        navEl.dataset.champsTabsInit = '1';

        const navId = navEl.getAttribute('data-champs-tabs-key') || navEl.id;
        if (!navId) return;

        const mode = (navEl.getAttribute('data-champs-tabs-mode') || 'hash').toLowerCase(); // both|hash|storage
        const defaultKey = navEl.getAttribute('data-champs-tabs-default'); // opcional
        const storageKey = `champs:tabs:${navId}`;

        // Precisa do Bootstrap.Tab
        if (!window.bootstrap || !window.bootstrap.Tab) return;

        const enabledHash = mode === 'both' || mode === 'hash';
        const enabledStorage = mode === 'both' || mode === 'storage';

        function getKeyFromTarget(target) {
            // target esperado: "#empresaTabs-api-config"
            if (!target) return null;
            const prefix = `#${navId}-`;
            if (!target.startsWith(prefix)) return null;
            return target.slice(prefix.length) || null;
        }

        function getKeyFromHash() {
            // hash esperado: "#empresaTabs=api-config"
            if (!enabledHash) return null;
            const raw = (window.location.hash || '').replace('#', '');
            if (!raw) return null;

            const parts = raw.split('=');
            if (parts.length !== 2) return null;
            if (parts[0] !== navId) return null;

            return parts[1] || null;
        }

        function setHash(key) {
            if (!enabledHash) return;
            // não mexe se já está igual (evita “piscadas”)
            const expected = `#${navId}=${key}`;
            if (window.location.hash === expected) return;
            window.location.hash = `${navId}=${key}`;
        }

        function getStorage() {
            if (!enabledStorage) return null;
            try {
                return localStorage.getItem(storageKey);
            } catch (e) {
                return null;
            }
        }

        function setStorage(key) {
            if (!enabledStorage) return;
            try {
                localStorage.setItem(storageKey, key);
            } catch (e) {
                // ignore
            }
        }

        function activate(key) {
            const btn = navEl.querySelector(
                `button[data-bs-toggle="tab"][data-bs-target="#${navId}-${key}"]`
            );
            if (!btn) return false;

            const tab = new bootstrap.Tab(btn);
            tab.show();
            return true;
        }

        // 1) restore: hash > storage > defaultKey
        const fromHash = getKeyFromHash();
        if (fromHash && activate(fromHash)) {
            setStorage(fromHash);
        } else {
            const fromStorage = getStorage();
            if (fromStorage && activate(fromStorage)) {
                setHash(fromStorage);
            } else if (defaultKey) {
                activate(defaultKey);
            }
        }

        // 2) persist on change
        navEl.querySelectorAll('button[data-bs-toggle="tab"]').forEach((btn) => {
            btn.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                const key = getKeyFromTarget(target);
                if (!key) return;

                setStorage(key);
                setHash(key);
            });
        });

        // 3) se o usuário trocar o hash manualmente (back/forward), tenta ativar
        if (enabledHash) {
            window.addEventListener('hashchange', () => {
                const key = getKeyFromHash();
                if (!key) return;
                if (activate(key)) setStorage(key);
            });
        }
    });
}
