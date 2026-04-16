export function fulfillElements(els, value) {
    if (!els || els.length === 0) return;

    els.forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
            el.value = value;
        } else {
            el.innerHTML = value;
        }
    });
}
