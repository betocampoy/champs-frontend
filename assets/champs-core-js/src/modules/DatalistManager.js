/**
 * Champs Core - DatalistManager (V2)
 *
 * Permite usar <input list="..."> para selecionar um label,
 * mas gravar outro valor (ex: ID) em elementos alvo.
 *
 * Uso:
 *  - Input:
 *      data-champs-datalist
 *      data-champs-datalist-group="grupo"
 *      data-champs-datalist-clear="true" (opcional)
 *
 *  - Targets:
 *      data-champs-datalist-target="grupo"
 *
 *  - Option:
 *      <option value="Empresa A" data-value="123">
 *
 */

export function initDatalist(scope = document) {
    scope.addEventListener('change', (event) => {
        const el = event.target;

        if (!el.matches('[data-champs-datalist]')) return;

        handleDatalistChange(el);
    });
}

function handleDatalistChange(input) {
    const group = input.dataset.champsDatalistGroup;
    if (!group) return;

    const inputValue = input.value.trim();
    if (!inputValue) return;

    // tenta localizar option correspondente
    const listId = input.getAttribute('list');
    if (!listId) return;

    const datalist = document.getElementById(listId);
    if (!datalist) return;

    const option = Array.from(datalist.options).find(
        (opt) => opt.value === inputValue
    );

    if (!option) return;

    const internalValue =
        option.dataset.value ??
        option.id ??
        option.value;

    const targets = document.querySelectorAll(
        `[data-champs-datalist-target="${group}"]`
    );

    targets.forEach((target) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
            target.value = internalValue;
        } else {
            target.textContent = internalValue;
        }
    });

    if (input.dataset.champsDatalistClear === 'true') {
        input.value = '';
    }
}
