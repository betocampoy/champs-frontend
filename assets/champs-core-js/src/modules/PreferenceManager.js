let _initialized = false;

function getAttr(el, name) {
    return el?.getAttribute?.(name) ?? null;
}

export function initPreferenceManager(scope = document) {
    if (_initialized) return;
    _initialized = true;

    document.addEventListener('click', (event) => {
        const el = event.target.closest('[data-champs-preference-key][data-champs-preference-value]');
        if (!el) return;

        const key = getAttr(el, 'data-champs-preference-key');
        const value = getAttr(el, 'data-champs-preference-value');
        const storage = getAttr(el, 'data-champs-preference-storage') || 'local';

        if (!key) return;
        if (!window.Champs?.consent?.setPreference) return;

        window.Champs.consent.setPreference(key, value, { storage });

        try {
            document.dispatchEvent(new CustomEvent('champs:preference:toggle', {
                detail: { key, value, storage, trigger: el }
            }));
        } catch {}
    });

    document.addEventListener('change', (event) => {
        const el = event.target.closest('[data-champs-preference-key][data-champs-preference-value]');
        if (!el) return;

        const key = getAttr(el, 'data-champs-preference-key');
        const value = getAttr(el, 'data-champs-preference-value');
        const storage = getAttr(el, 'data-champs-preference-storage') || 'local';

        if (!key) return;
        if (!window.Champs?.consent?.setPreference) return;

        window.Champs.consent.setPreference(key, value, { storage });

        try {
            document.dispatchEvent(new CustomEvent('champs:preference:toggle', {
                detail: { key, value, storage, trigger: el }
            }));
        } catch {}
    });
}