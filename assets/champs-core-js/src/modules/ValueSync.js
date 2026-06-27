/**
 * ValueSync (Champs Core)
 *
 * Sincroniza o valor de um input/select/textarea com uma propriedade de outro elemento,
 * de forma declarativa via data attributes. Funciona com elementos dinâmicos (modais, etc.)
 * pois usa event delegation no document.
 *
 * Atributos no elemento fonte (input / select / textarea):
 *
 *   data-champs-value-sync="<seletor>"
 *       Seletor CSS do elemento alvo. Obrigatório.
 *
 *   data-champs-value-sync-scope="<seletor>"
 *       Restringe a busca do alvo ao resultado de source.closest(seletor).
 *       Útil para isolar pickers em componentes repetíveis.
 *
 *   data-champs-value-sync-mode="text"
 *       Como atualizar o alvo. Valores: "class" | "text" | "attr". Padrão: "text".
 *
 *   data-champs-value-sync-prefix="bi "
 *       Prefixo a antepor ao valor antes de aplicar ao alvo.
 *
 *   data-champs-value-sync-suffix=""
 *       Sufixo a concatenar ao valor.
 *
 *   data-champs-value-sync-extra="my-class"
 *       Valor/classe adicional sempre presente (acrescentado com espaço após prefix+value+suffix).
 *       Útil no modo "class" para preservar classes auxiliares no alvo.
 *
 *   data-champs-value-sync-empty=""
 *       Valor completo a aplicar quando a fonte estiver vazia (""). Ignora prefix/suffix/extra.
 *
 *   data-champs-value-sync-attr="data-icon"
 *       Nome do atributo a definir no alvo (modo "attr").
 *
 * Exemplos:
 *
 *   <!-- Sincroniza o valor do select como classe Bootstrap Icon no preview -->
 *   <select
 *     data-champs-value-sync=".icon-preview"
 *     data-champs-value-sync-scope=".icon-picker-wrapper"
 *     data-champs-value-sync-mode="class"
 *     data-champs-value-sync-prefix="bi "
 *     data-champs-value-sync-extra="icon-preview"
 *     data-champs-value-sync-empty="bi bi-image icon-preview">
 *
 *   <!-- Espelha um input de texto em um span de preview -->
 *   <input
 *     data-champs-value-sync="#name-preview"
 *     data-champs-value-sync-mode="text">
 *
 * Evento disparado no alvo após cada sincronização:
 *   champs:value-synced  (bubbles)  detail: { source, value, mode }
 */

const SOURCE_ATTR = 'data-champs-value-sync';

function resolveTarget(source) {
    const targetSel = source.getAttribute(SOURCE_ATTR);
    if (!targetSel) return null;

    const scopeSel = source.getAttribute('data-champs-value-sync-scope');

    let root = document;
    if (scopeSel) {
        const ancestor = source.closest(scopeSel);
        if (ancestor) root = ancestor;
    }

    return root.querySelector(targetSel);
}

function buildValue(source) {
    const raw    = source.value ?? '';
    const empty  = source.getAttribute('data-champs-value-sync-empty') ?? '';

    if (!raw) return empty;

    const prefix = source.getAttribute('data-champs-value-sync-prefix') ?? '';
    const suffix = source.getAttribute('data-champs-value-sync-suffix') ?? '';
    const extra  = source.getAttribute('data-champs-value-sync-extra')  ?? '';

    const core = prefix + raw + suffix;
    return extra ? core + ' ' + extra : core;
}

function applySync(source) {
    const target = resolveTarget(source);
    if (!target) return;

    const mode  = (source.getAttribute('data-champs-value-sync-mode') ?? 'text').toLowerCase();
    const value = buildValue(source);

    switch (mode) {
        case 'class':
            target.className = value;
            break;

        case 'attr': {
            const attr = source.getAttribute('data-champs-value-sync-attr');
            if (attr) target.setAttribute(attr, value);
            break;
        }

        case 'text':
        default:
            target.textContent = value;
            break;
    }

    target.dispatchEvent(
        new CustomEvent('champs:value-synced', {
            bubbles: true,
            detail: { source, value, mode },
        })
    );
}

export function initValueSync(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    // Registra os listeners uma única vez no document (event delegation)
    if (!document.documentElement.dataset.champsValueSyncBound) {
        document.documentElement.dataset.champsValueSyncBound = '1';

        document.addEventListener('change', (e) => {
            const el = e.target.closest(`[${SOURCE_ATTR}]`);
            if (el) applySync(el);
        });

        document.addEventListener('input', (e) => {
            const el = e.target.closest(`[${SOURCE_ATTR}]`);
            if (el) applySync(el);
        });
    }

    // Aplica o estado inicial para todos os elementos no scope atual
    root.querySelectorAll(`[${SOURCE_ATTR}]`).forEach(applySync);
}

export default { initValueSync };
