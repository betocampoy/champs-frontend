/**
 * Champs Core - RemoteSelect (TomSelect + AJAX + Pagination)
 *
 * SELECT (remoto):
 *  - data-champs-remote-select="true"
 *  - data-champs-remote-select-url="/ajax/clientes"
 *  - data-champs-remote-select-group="clienteFiltro"   (opcional)
 *  - data-champs-remote-select-min-chars="2"           (opcional, default 2)
 *  - data-champs-remote-select-placeholder="..."       (opcional)
 *  - data-champs-remote-select-allow-clear="true"      (opcional, default true)
 *  - data-champs-remote-select-debounce="250"          (opcional, default 250ms)
 *  - data-champs-remote-select-per-page="20"           (opcional, default 20)
 *  - data-champs-remote-select-prefetch-pages="4"      (opcional, default 4)
 *
 * Dependências diretas do SELECT remoto:
 *  - data-champs-remote-select-depends-on='{"unidade_id":"[name=\"unidade_id\"]"}'
 *  - data-champs-remote-select-depends-on-changed="clear|refresh"
 *      clear   (default): limpa valor/opções quando uma dependência muda
 *      refresh         : limpa valor/opções e recarrega automaticamente com q vazio
 *
 *  Exemplo:
 *      <select
 *          data-champs-remote-select="true"
 *          data-champs-remote-select-url="remote_clients.php"
 *          data-champs-remote-select-depends-on='{"unidade_id":"[name=\"unidade_id\"]"}'
 *          data-champs-remote-select-depends-on-changed="refresh"
 *      ></select>
 *
 *  Backend receberá:
 *      GET remote_clients.php?q=abc&page=1&per_page=20&unidade_id=3
 *
 * Limpeza de campos filhos ao alterar este SELECT:
 *  - data-champs-remote-select-clear-on-change='["[name=\"cliente_id\"]","[name=\"usuario_id\"]"]'
 *
 *  Exemplo:
 *      <select
 *          data-champs-remote-select="true"
 *          data-champs-remote-select-url="remote_units.php"
 *          data-champs-remote-select-clear-on-change='["[name=\"cliente_id\"]","[name=\"usuario_id\"]"]'
 *      ></select>
 *
 * Campos do grupo (inputs/selects):
 *  - data-champs-remote-select-group="clienteFiltro"
 *  - data-champs-remote-select-param="ativo"           (opcional, se não existir usa name (ou id))
 *  - data-champs-remote-select-default="1"             (opcional, valor padrão se campo estiver vazio)
 *
 * Observação:
 *  - dependsOn e group podem ser usados juntos.
 *  - Se o mesmo parâmetro existir nos dois, dependsOn prevalece.
 *  - Ao mudar um campo dependente, o comportamento é definido por depends-on-changed.
 *  - Para recarregar opções com busca vazia, use min-chars="0" + depends-on-changed="refresh".
 *
 * Backend:
 *  - GET url?q=...&page=1&per_page=20&ativo=1&unidade_id=3...
 *  - Response:
 *      {
 *        "items": [{ "value": "123", "label": "ACME LTDA" }, ...],
 *        "has_more": true,
 *        "next_page": 2,
 *        "page": 1,
 *        "per_page": 20
 *      }
 */

function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

function getElementValue(el) {
    if (!el) return '';

    // checkbox / radio
    if (el.type === 'checkbox') return el.checked ? (el.value || '1') : '';
    if (el.type === 'radio') return el.checked ? el.value : '';

    return el.value ?? '';
}

function resolveParamName(el) {
    const explicit = el.dataset.champsRemoteSelectParam;
    if (explicit && explicit.trim()) return explicit.trim();

    const name = el.getAttribute('name') || el.getAttribute('id') || '';
    return name.trim();
}

function resolveValueWithDefault(el) {
    const val = getElementValue(el);
    if (val !== undefined && val !== null && String(val).trim() !== '') return val;

    const def = el.dataset.champsRemoteSelectDefault;
    if (def !== undefined && def !== null && String(def).trim() !== '') return def;

    return '';
}

function safeParseJson(rawValue, fallback, label = 'JSON') {
    if (!rawValue || !String(rawValue).trim()) return fallback;

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        console.warn(`[champs] RemoteSelect: ${label} inválido.`, rawValue, error);
        return fallback;
    }
}

function querySelectorSafe(scope, selector) {
    if (!selector || !String(selector).trim()) return null;

    try {
        return scope.querySelector(selector) || document.querySelector(selector);
    } catch (error) {
        console.warn('[champs] RemoteSelect: seletor inválido.', selector, error);
        return null;
    }
}

function querySelectorAllSafe(scope, selector) {
    if (!selector || !String(selector).trim()) return [];

    try {
        const localNodes = Array.from(scope.querySelectorAll(selector));
        if (localNodes.length > 0) return localNodes;

        return Array.from(document.querySelectorAll(selector));
    } catch (error) {
        console.warn('[champs] RemoteSelect: seletor inválido.', selector, error);
        return [];
    }
}

function collectGroupParams(scope, groupName, excludeEl) {
    if (!groupName) return {};

    const nodes = scope.querySelectorAll(`[data-champs-remote-select-group="${CSS.escape(groupName)}"]`);
    const params = {};

    nodes.forEach((el) => {
        if (el === excludeEl) return; // não coletar o próprio select remoto como "filtro"

        const key = resolveParamName(el);
        if (!key) return;

        const v = resolveValueWithDefault(el);
        if (v === '') return;

        params[key] = v;
    });

    return params;
}

function collectDependsOnParams(scope, dependsOn) {
    const params = {};

    Object.entries(dependsOn || {}).forEach(([paramName, selector]) => {
        if (!paramName || !selector) return;

        const el = querySelectorSafe(scope, selector);
        if (!el) return;

        const value = resolveValueWithDefault(el);
        if (value === '') return;

        params[paramName] = value;
    });

    return params;
}

function ensureTomSelectAvailable(selectEl) {
    const TomSelectCtor = window.TomSelect;
    if (!TomSelectCtor) {
        console.warn('[champs] RemoteSelect: TomSelect não encontrado. Mantendo <select> nativo.', selectEl);
        return null;
    }
    return TomSelectCtor;
}

async function getJson(url, params = {}, { signal } = {}) {
    const u = new URL(url, window.location.href);

    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        const s = String(v).trim();
        if (!s) return;
        u.searchParams.set(k, s);
    });

    const res = await fetch(u.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`RemoteSelect HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
    }

    return res.json();
}

function stableQueryString(obj) {
    const keys = Object.keys(obj || {}).sort();
    return keys.map((k) => `${k}=${obj[k]}`).join('&');
}

function clearRemoteSelect(targetEl) {
    if (!targetEl) return;

    const ts = targetEl.tomselect || targetEl._champsTomSelect || null;

    if (ts) {
        ts.clear(true);
        ts.clearOptions();
        ts.refreshOptions(false);
    } else {
        targetEl.value = '';
    }

    targetEl.dispatchEvent(new Event('change', { bubbles: true }));
    targetEl.dispatchEvent(new CustomEvent('champs:remote-select:cleared', { bubbles: true }));
}

function resetPaginationState(state) {
    state.page = 1;
    state.hasMore = false;
    state.nextPage = null;
    state.loadingMore = false;
    state.lastGroupKey = '';
}

function resetRemoteSelectOptions(ts, selectEl, state, { clearValue = false } = {}) {
    resetPaginationState(state);

    if (clearValue) {
        ts.clear(true);
        ts.clearOptions();
        ts.refreshOptions(false);
        return;
    }

    // limpa opções carregadas sem apagar seleção atual
    const current = ts.getValue();
    ts.clearOptions();

    if (current) {
        const opt = selectEl.querySelector(`option[value="${CSS.escape(String(current))}"]`);
        if (opt) ts.addOption({ value: opt.value, label: opt.textContent || opt.value });
    }

    ts.refreshOptions(false);
}

function hasFilledDependencies(scope, dependsOn) {
    const entries = Object.entries(dependsOn || {});
    if (entries.length === 0) return true;

    return entries.every(([, selector]) => {
        const el = querySelectorSafe(scope, selector);
        if (!el) return false;

        const value = resolveValueWithDefault(el);
        return String(value).trim() !== '';
    });
}

function setRemoteSelectDisabled(ts, selectEl, disabled) {
    if (ts) {
        if (disabled) {
            ts.disable();
        } else {
            ts.enable();
        }
    } else {
        selectEl.disabled = !!disabled;
    }
}

function getTomSelectQuery(ts, state) {
    const controlInputValue = ts?.control_input?.value || '';
    const stateQuery = state?.q || '';

    return String(controlInputValue || stateQuery || '').trim();
}

function initOneRemoteSelect(selectEl, scope = document) {
    if (selectEl.dataset.champsRemoteSelectInitialized === 'true') return;
    selectEl.dataset.champsRemoteSelectInitialized = 'true';

    const url = selectEl.dataset.champsRemoteSelectUrl;
    if (!url) {
        console.warn('[champs] RemoteSelect: faltou data-champs-remote-select-url', selectEl);
        return;
    }

    const groupName   = selectEl.dataset.champsRemoteSelectGroup || '';
    const minChars    = parseInt(selectEl.dataset.champsRemoteSelectMinChars || '2', 10);
    const placeholder = selectEl.dataset.champsRemoteSelectPlaceholder || 'Digite para buscar...';
    const allowClear  = (selectEl.dataset.champsRemoteSelectAllowClear ?? 'true') === 'true';
    const debounceMs  = parseInt(selectEl.dataset.champsRemoteSelectDebounce || '250', 10);
    const perPage     = parseInt(selectEl.dataset.champsRemoteSelectPerPage || '20', 10);
    const prefetchPages = parseInt(selectEl.dataset.champsRemoteSelectPrefetchPages || '4', 10);
    const dependsOn = safeParseJson(
        selectEl.dataset.champsRemoteSelectDependsOn,
        {},
        'data-champs-remote-select-depends-on'
    );
    const clearOnChange = safeParseJson(
        selectEl.dataset.champsRemoteSelectClearOnChange,
        [],
        'data-champs-remote-select-clear-on-change'
    );
    const dependsOnChanged = (
        selectEl.dataset.champsRemoteSelectDependsOnChanged || 'clear'
    ).trim();

    const TomSelectCtor = ensureTomSelectAvailable(selectEl);
    if (!TomSelectCtor) return;

    let abortCtrl = null;

    // estado de paginação por select
    const state = {
        q: '',
        page: 1,
        hasMore: false,
        nextPage: null,
        loadingMore: false,
        lastGroupKey: '',
    };

    function collectRequestParams() {
        return {
            ...collectGroupParams(scope, groupName, selectEl),
            ...collectDependsOnParams(scope, dependsOn),
        };
    }

    async function requestPage(q, page) {
        // abort request anterior
        if (abortCtrl) abortCtrl.abort();
        abortCtrl = new AbortController();

        const extraParams = collectRequestParams();
        const groupKey = stableQueryString(extraParams);

        // guarda groupKey para detectar mudanças no futuro
        state.lastGroupKey = groupKey;

        const data = await getJson(
            url,
            { q, page, per_page: perPage, ...extraParams },
            { signal: abortCtrl.signal }
        );

        return {
            items: Array.isArray(data?.items) ? data.items : [],
            hasMore: !!data?.has_more,
            nextPage: data?.next_page ?? null,
        };
    }

    async function loadMorePage(ts) {
        if (!state.hasMore || state.loadingMore) return;

        const q = state.q || '';
        if (q.length < minChars) return;

        state.loadingMore = true;
        try {
            const r = await requestPage(q, state.page);

            r.items.forEach((item) => ts.addOption(item));
            ts.refreshOptions(false);

            state.hasMore = r.hasMore;
            state.nextPage = r.nextPage;
            state.page = r.nextPage ? r.nextPage : (state.page + 1);
        } catch (err) {
            if (err?.name !== 'AbortError') console.error('[champs] RemoteSelect pagination error:', err);
        } finally {
            state.loadingMore = false;
        }
    }

    async function ensureScrollableDropdown(ts, maxPrefetchPages = 4) {
        const dropdown = ts.dropdown_content;
        if (!dropdown) return;

        // tenta “pré-carregar” até virar scrollável ou acabar
        let tries = 0;
        while (tries < maxPrefetchPages && state.hasMore) {
            const hasScroll = dropdown.scrollHeight > dropdown.clientHeight + 5;
            if (hasScroll) return;
            await loadMorePage(ts);
            tries++;
        }
    }

    const ts = new TomSelectCtor(selectEl, {
        valueField: 'value',
        labelField: 'label',
        searchField: ['label'],
        placeholder,
        allowEmptyOption: true,
        plugins: allowClear ? ['clear_button'] : [],
        prefresh: false,

        load: debounce(async (query, callback) => {
            try {
                const q = (query || '').trim();
                if (q.length < minChars) return callback([]);

                // reset para nova query
                state.q = q;
                state.page = 1;
                state.hasMore = false;
                state.nextPage = null;
                state.loadingMore = false;

                const r = await requestPage(q, 1);

                state.hasMore = r.hasMore;
                state.nextPage = r.nextPage;
                state.page = r.nextPage ? r.nextPage : 2;

                callback(r.items);

                // após render, tenta garantir scroll/paginação mesmo sem overflow
                setTimeout(() => ensureScrollableDropdown(ts, prefetchPages), 0);
            } catch (err) {
                if (err?.name === 'AbortError') return callback([]);
                console.error('[champs] RemoteSelect load error:', err);
                callback([]);
            }
        }, debounceMs),
    });

    // útil pra debug/futuras integrações
    selectEl._champsTomSelect = ts;

    function attachInfiniteScroll() {
        const dropdown = ts.dropdown_content;
        if (!dropdown || dropdown._champsInfiniteAttached) return;
        dropdown._champsInfiniteAttached = true;

        dropdown.addEventListener('scroll', async () => {
            if (!state.hasMore || state.loadingMore) return;

            const nearBottom =
                (dropdown.scrollTop + dropdown.clientHeight) >= (dropdown.scrollHeight - 40);

            if (!nearBottom) return;

            await loadMorePage(ts);
        });
    }

    ts.on('dropdown_open', () => {
        attachInfiniteScroll();
        ensureScrollableDropdown(ts, prefetchPages);
    });

    // Se algum campo do grupo mudar: limpa opções e reseta paginação
    if (groupName) {
        const groupNodes = scope.querySelectorAll(`[data-champs-remote-select-group="${CSS.escape(groupName)}"]`);

        groupNodes.forEach((el) => {
            if (el === selectEl) return;

            el.addEventListener('change', () => {
                try {
                    resetRemoteSelectOptions(ts, selectEl, state, { clearValue: true });
                } catch (e) {
                    // não quebra
                }
            });
        });
    }

    // Se algum campo declarado em dependsOn mudar:
    // - clear: limpa valor/opções para evitar seleção incompatível
    // - refresh: limpa valor/opções e recarrega automaticamente com busca vazia
    Object.values(dependsOn || {}).forEach((selector) => {
        const dependency = querySelectorSafe(scope, selector);
        if (!dependency || dependency === selectEl) return;

        dependency.addEventListener('change', () => {
            try {
                resetRemoteSelectOptions(ts, selectEl, state, { clearValue: true });

                if (dependsOnChanged === 'refresh' && minChars === 0) {
                    ts.load('');
                }

                selectEl.dispatchEvent(new CustomEvent('champs:remote-select:dependency-changed', {
                    bubbles: true,
                    detail: { dependency, mode: dependsOnChanged },
                }));
            } catch (e) {
                // não quebra
            }
        });
    });

    // Quando este select mudar, limpa selects/campos filhos declarados em clearOnChange.
    // Aceita array de seletores ou objeto { nome: seletor }.
    const clearSelectors = Array.isArray(clearOnChange)
        ? clearOnChange
        : Object.values(clearOnChange || {});

    if (clearSelectors.length > 0) {
        selectEl.addEventListener('change', () => {
            clearSelectors.forEach((selector) => {
                querySelectorAllSafe(scope, selector).forEach((targetEl) => {
                    if (!targetEl || targetEl === selectEl) return;
                    clearRemoteSelect(targetEl);
                });
            });
        });
    }
}

export function initRemoteSelect(scope = document) {
    const selects = scope.querySelectorAll('select[data-champs-remote-select="true"]');
    selects.forEach((el) => initOneRemoteSelect(el, scope));
}
