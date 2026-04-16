import { fulfillElements } from '../utils.js';

/**
 * CheckboxGroup (Champs Core)
 *
 * Parent:
 *  - data-champs-checkbox-parent
 *  - data-champs-checkbox-group="grupo"
 *  - data-champs-checkbox-counter="CSS selector" (opcional)
 *  - data-champs-checkbox-total="CSS selector"   (opcional)
 *
 * Child:
 *  - data-champs-checkbox-child
 *  - data-champs-checkbox-group="grupo"
 *  - data-champs-checkbox-value="10.50" (opcional)
 *
 * Evento:
 *  - champs:checkbox-group (bubbles) detail: { group, count, total, allChecked }
 */

function parseNumber(value) {
    if (value == null) return 0;
    const s = String(value).trim().replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}

function qsa(root, selector) {
    return root.querySelectorAll(selector);
}

function getGroup(el) {
    return el.getAttribute('data-champs-checkbox-group') || '';
}

function getCounterSelector(el) {
    return el.getAttribute('data-champs-checkbox-counter') || '';
}

function getTotalSelector(el) {
    return el.getAttribute('data-champs-checkbox-total') || '';
}

function getValueToSum(child) {
    return parseNumber(child.getAttribute('data-champs-checkbox-value'));
}

function getChildren(root, group) {
    return qsa(root, `[data-champs-checkbox-child][data-champs-checkbox-group="${group}"]`);
}

function getParent(root, group) {
    return root.querySelector(`[data-champs-checkbox-parent][data-champs-checkbox-group="${group}"]`);
}

function computeState(children) {
    let count = 0;
    let total = 0;

    children.forEach((c) => {
        if (!c.checked) return;
        count += 1;
        total += getValueToSum(c);
    });

    return { count, total };
}

function updateUI(root, sourceEl, count, total) {
    const counterSelector = getCounterSelector(sourceEl);
    const totalSelector = getTotalSelector(sourceEl);

    if (counterSelector) {
        fulfillElements(qsa(root, counterSelector), count);
    }
    if (totalSelector) {
        fulfillElements(qsa(root, totalSelector), total);
    }
}

function dispatchEvent(el, detail) {
    el.dispatchEvent(
        new CustomEvent('champs:checkbox-group', {
            bubbles: true,
            detail,
        })
    );
}

function handleParent(root, parentEl) {
    const group = getGroup(parentEl);
    if (!group) return;

    const children = getChildren(root, group);
    const checked = !!parentEl.checked;

    let total = 0;
    children.forEach((child) => {
        child.checked = checked;
        if (checked) total += getValueToSum(child);
    });

    const count = checked ? children.length : 0;

    updateUI(root, parentEl, count, total);

    dispatchEvent(parentEl, {
        group,
        count,
        total,
        allChecked: checked && children.length > 0,
    });
}

function handleChild(root, childEl) {
    const group = getGroup(childEl);
    if (!group) return;

    const children = getChildren(root, group);
    const parent = getParent(root, group);

    const { count, total } = computeState(children);

    updateUI(root, childEl, count, total);

    if (parent) {
        parent.checked = children.length > 0 && count === children.length;
    }

    dispatchEvent(childEl, {
        group,
        count,
        total,
        allChecked: parent ? parent.checked : count === children.length,
    });
}

export function initCheckboxGroup(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    // evita bind duplicado no document
    if (root === document && document.documentElement.dataset.champsCheckboxGroupBound === '1') return;
    if (root === document) document.documentElement.dataset.champsCheckboxGroupBound = '1';

    document.addEventListener(
        'change',
        (event) => {
            const el = event.target;
            if (!(el instanceof HTMLElement)) return;

            if (el.matches('[data-champs-checkbox-parent]')) {
                handleParent(document, el);
                return;
            }

            if (el.matches('[data-champs-checkbox-child]')) {
                handleChild(document, el);
            }
        },
        true
    );
}
