/**
 * Champs Core — FormSectionsPersistence
 *
 * Objetivo:
 * - Persistir a última seção selecionada/aberta em formulários de gerenciamento.
 * - Suporta Bootstrap 5 Tabs e Accordion/Collapse.
 * - Configuração 100% via data-attributes gerados pelas macros formSections.
 *
 * Como usar:
 * data-champs-form-sections
 * data-champs-form-sections-type="tabs|accordion"
 * data-champs-form-sections-key="unit-config"          // opcional; fallback: id do container
 * data-champs-form-sections-mode="hash|storage|both"   // default: hash
 * data-champs-form-sections-default="main"             // opcional
 *
 * Formato do hash:
 * #unit-config=main
 */
export function initFormSectionsPersistence(scope = document) {
    const containers = scope.querySelectorAll('[data-champs-form-sections]');
    if (!containers.length) return;

    containers.forEach((container) => {
        if (container.dataset.champsFormSectionsInit === '1') return;
        container.dataset.champsFormSectionsInit = '1';

        const type = (container.getAttribute('data-champs-form-sections-type') || 'tabs').toLowerCase();
        const domId = container.id;
        const sectionKey = container.getAttribute('data-champs-form-sections-key') || domId;

        if (!domId || !sectionKey) return;

        const mode = (container.getAttribute('data-champs-form-sections-mode') || 'hash').toLowerCase();
        const defaultKey = container.getAttribute('data-champs-form-sections-default');
        const storageKey = `champs:form-sections:${sectionKey}`;

        const enabledHash = mode === 'both' || mode === 'hash';
        const enabledStorage = mode === 'both' || mode === 'storage';

        function getKeyFromHash() {
            if (!enabledHash) return null;

            const raw = (window.location.hash || '').replace('#', '');
            if (!raw) return null;

            const parts = raw.split('=');
            if (parts.length !== 2) return null;
            if (parts[0] !== sectionKey) return null;

            return parts[1] || null;
        }

        function setHash(key) {
            if (!enabledHash || !key) return;

            const expected = `#${sectionKey}=${key}`;
            if (window.location.hash === expected) return;

            window.location.hash = `${sectionKey}=${key}`;
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
            if (!enabledStorage || !key) return;

            try {
                localStorage.setItem(storageKey, key);
            } catch (e) {
                // ignore
            }
        }

        function persist(key) {
            if (!key) return;
            setStorage(key);
            setHash(key);
        }

        function activateTabs(key) {
            if (!window.bootstrap || !window.bootstrap.Tab) return false;

            const btn = container.querySelector(
                `button[data-bs-toggle="tab"][data-bs-target="#${domId}-${key}"]`
            );
            if (!btn) return false;

            const tab = new bootstrap.Tab(btn);
            tab.show();
            return true;
        }

        function activateAccordion(key) {
            if (!window.bootstrap || !window.bootstrap.Collapse) return false;

            const collapseEl = container.querySelector(`#${domId}-${key}-collapse`);
            if (!collapseEl) return false;

            const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl, {
                toggle: false,
            });

            collapse.show();
            return true;
        }

        function activate(key) {
            if (type === 'accordion') return activateAccordion(key);
            if (type === 'tabs') return activateTabs(key);
            return false;
        }

        function getTabsKeyFromTarget(target) {
            if (!target) return null;

            const prefix = `#${domId}-`;
            if (!target.startsWith(prefix)) return null;

            return target.slice(prefix.length) || null;
        }

        function getAccordionKeyFromId(id) {
            if (!id) return null;

            const prefix = `${domId}-`;
            const suffix = '-collapse';

            if (!id.startsWith(prefix) || !id.endsWith(suffix)) return null;

            return id.slice(prefix.length, -suffix.length) || null;
        }

        // 1) restore: hash > storage > default
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
        if (type === 'tabs') {
            container.querySelectorAll('button[data-bs-toggle="tab"]').forEach((btn) => {
                btn.addEventListener('shown.bs.tab', (e) => {
                    const target = e.target.getAttribute('data-bs-target');
                    persist(getTabsKeyFromTarget(target));
                });
            });
        }

        if (type === 'accordion') {
            container.querySelectorAll('.accordion-collapse').forEach((collapseEl) => {
                collapseEl.addEventListener('shown.bs.collapse', (e) => {
                    persist(getAccordionKeyFromId(e.target.id));
                });
            });
        }

        // 3) hash manual/back/forward
        if (enabledHash) {
            window.addEventListener('hashchange', () => {
                const key = getKeyFromHash();
                if (!key) return;
                if (activate(key)) setStorage(key);
            });
        }
    });
}
