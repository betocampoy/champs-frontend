/**
 * DynamicColspan (Champs Core)
 *
 * Define automaticamente o atributo colspan para células marcadas com:
 *  - data-champs-dynamic-colspan
 *
 * Regras:
 *  - Prioriza o THEAD: soma todos os TH, respeitando o atributo colspan.
 *  - Fallback: usa a 1ª linha do TBODY somando TD (respeitando colspan).
 *
 * Uso:
 *  - applyDynamicColspan();              // varre o document
 *  - applyDynamicColspan(containerEl);   // varre apenas um escopo
 */

function parseSpan(el) {
    const span = parseInt(el.getAttribute('colspan') || '1', 10);
    return Number.isFinite(span) && span > 0 ? span : 1;
}

function getTableColumnCount(table) {
    let colCount = 0;

    // 1) THEAD: soma TH respeitando colspan
    const ths = table.querySelectorAll('thead th');
    if (ths.length) {
        ths.forEach((th) => {
            colCount += parseSpan(th);
        });
        return colCount;
    }

    // 2) Fallback: TBODY primeira linha
    const firstRow = table.querySelector('tbody tr');
    if (firstRow) {
        firstRow.querySelectorAll('td').forEach((td) => {
            colCount += parseSpan(td);
        });
    }

    return colCount;
}

export function applyDynamicColspan(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    root.querySelectorAll('[data-champs-dynamic-colspan]').forEach((cell) => {
        // evita reprocessar
        if (cell.dataset.champsDynamicColspanApplied === 'true') return;

        const table = cell.closest('table');
        if (!table) return;

        const colCount = getTableColumnCount(table);

        if (colCount > 0) {
            cell.setAttribute('colspan', String(colCount));
            cell.dataset.champsDynamicColspanApplied = 'true';
        }
    });
}

/**
 * Por padrão, o DynamicColspan é "apply-only".
 * Este init é só um alias para manter consistência com outros módulos.
 */
export function initDynamicColspan(scope = document) {
    applyDynamicColspan(scope);
}
