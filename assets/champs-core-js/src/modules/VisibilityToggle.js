/**
 * VisibilityToggle (Champs Core)
 *
 * Alterna visibilidade de elementos agrupados por:
 *  - data-champs-visibility-group="grupo"
 *
 * Botão trigger:
 *  - data-champs-visibility-toggle
 *  - data-champs-visibility-group="grupo"
 *
 * Ícones (opcional):
 *  - data-champs-visibility-icon-show="..."
 *  - data-champs-visibility-icon-hide="..."
 *  - data-champs-visibility-icon-mode="class|html"  (default: class)
 *
 * Estratégia de ocultação (importante):
 *  - INPUT password: alterna type password/text (nativo)
 *  - Outros INPUTs: aplica máscara VISUAL via CSS (não altera value, não quebra submit)
 *  - Outros elementos: alterna d-none
 *
 * Requer CSS (no seu champs-core-js.css):
 *  .champs-visibility-masked { -webkit-text-security: disc; text-security: disc; }
 *
 * Evento:
 *  - champs:visibility (bubbles) detail: { group, visible }
 */

const MASKED_CLASS = 'champs-visibility-masked';

function supportsTextSecurity() {
    // Heurística simples: se o navegador entende a propriedade, o style mantém algo
    const el = document.createElement('span');
    el.style.webkitTextSecurity = 'disc';
    return !!el.style.webkitTextSecurity;
}

function getIconMode(buttonEl) {
    return (buttonEl.getAttribute('data-champs-visibility-icon-mode') || 'class').toLowerCase();
}

function toggleIcon(buttonEl, isNowVisible) {
    const iconShow = buttonEl.getAttribute('data-champs-visibility-icon-show');
    const iconHide = buttonEl.getAttribute('data-champs-visibility-icon-hide');
    if (!iconShow || !iconHide) return;

    const mode = getIconMode(buttonEl);

    if (mode === 'html') {
        buttonEl.innerHTML = isNowVisible ? iconHide : iconShow;
        return;
    }

    // default: class
    buttonEl.classList.remove(iconShow, iconHide);
    buttonEl.classList.add(isNowVisible ? iconHide : iconShow);
}

function maskInputVisual(el, maskOn) {
    // Não mexe no value -> submit continua correto
    if (maskOn) el.classList.add(MASKED_CLASS);
    else el.classList.remove(MASKED_CLASS);
}

function toggleGroup(buttonEl, scope = document) {
    const group = buttonEl.getAttribute('data-champs-visibility-group');
    if (!group) return;

    const elements = scope.querySelectorAll(
        `[data-champs-visibility-group="${group}"]:not([data-champs-visibility-toggle])`
    );

    // vamos decidir "visível" com base no primeiro elemento do grupo
    let isNowVisible = false;

    // Para inputs não-password, usamos máscara visual
    const canUseTextSecurity = supportsTextSecurity();

    elements.forEach((el) => {
        if (el.tagName === 'INPUT') {
            const originalType = el.dataset.champsVisibilityOriginalType || el.type;

            if (!el.dataset.champsVisibilityOriginalType) {
                el.dataset.champsVisibilityOriginalType = originalType;
            }

            // 1) password: alterna tipo (nativo e perfeito)
            if (originalType === 'password') {
                const newType = el.type === 'password' ? 'text' : 'password';
                el.type = newType;
                isNowVisible = newType === 'text';
                return;
            }

            // 2) outros inputs: máscara visual (não altera value)
            // Se o browser não suportar text-security, ainda aplicamos a classe.
            // (em alguns browsers pode não “mascarar”, mas não quebra submit/layout)
            const isMasked = el.classList.contains(MASKED_CLASS);
            maskInputVisual(el, !isMasked);
            isNowVisible = isMasked; // se estava mascarado, agora ficou visível
            return;
        }

        // 3) não-input: alterna display
        el.classList.toggle('d-none');
        isNowVisible = !el.classList.contains('d-none');
    });

    toggleIcon(buttonEl, isNowVisible);

    buttonEl.dispatchEvent(
        new CustomEvent('champs:visibility', {
            bubbles: true,
            detail: { group, visible: isNowVisible },
        })
    );
}

function syncInitialVisibilityState(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    // Pega todos os botões toggles (cada botão representa um grupo)
    const buttons = root.querySelectorAll('[data-champs-visibility-toggle][data-champs-visibility-group]');

    buttons.forEach((button) => {
        const group = button.getAttribute('data-champs-visibility-group');
        if (!group) return;

        const elements = root.querySelectorAll(
            `[data-champs-visibility-group="${group}"]:not([data-champs-visibility-toggle])`
        );

        if (!elements.length) return;

        // Se tiver um password e ele estiver oculto, consideramos grupo oculto
        let groupVisible = true;

        elements.forEach((el) => {
            if (el.tagName === 'INPUT') {
                const originalType = el.dataset.champsVisibilityOriginalType || el.type;
                if (!el.dataset.champsVisibilityOriginalType) {
                    el.dataset.champsVisibilityOriginalType = originalType;
                }

                if (originalType === 'password') {
                    groupVisible = (el.type === 'text'); // se está text, está visível
                }
            }
        });

        // Se o grupo estiver oculto, mascare/oculte o resto
        if (!groupVisible) {
            elements.forEach((el) => {
                if (el.tagName === 'INPUT') {
                    const originalType = el.dataset.champsVisibilityOriginalType || el.type;

                    if (originalType !== 'password') {
                        // Aqui é onde seu CSS entra:
                        // aplica a classe de máscara visual sem alterar value
                        el.classList.add('champs-visibility-masked');
                    }
                } else {
                    el.classList.add('d-none');
                }
            });
        }

        // Atualiza ícone do botão conforme estado inicial
        toggleIcon(button, groupVisible);
    });
}

export function initVisibilityToggle(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;

    // evita bind duplicado no document
    if (root === document && document.documentElement.dataset.champsVisibilityBound === '1') return;
    if (root === document) document.documentElement.dataset.champsVisibilityBound = '1';

    syncInitialVisibilityState(document);

    document.addEventListener(
        'click',
        (event) => {
            const button = event.target.closest('[data-champs-visibility-toggle]');
            if (!button) return;

            toggleGroup(button, document);
        },
        true
    );
}
