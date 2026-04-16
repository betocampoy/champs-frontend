/**
 * FormSubmitControl (Champs Core)
 *
 * Controla o comportamento das teclas Enter e Tab em formulários,
 * especialmente útil em fluxos com leitor de código de barras.
 *
 * Recursos:
 * - Enter como Tab
 * - Bloqueio de submit por Enter
 * - Submit apenas em campos específicos
 * - Tab opcionalmente disparando submit em campo específico
 *
 * Compatibilidade legada:
 * - .champs-makes-enter-as-tab
 * - .champs-allow-enter-submit
 *
 * FORM
 * - data-champs-enter-mode="tab"
 * - data-champs-block-enter-submit="true"
 *
 * FIELD
 * - data-champs-enter="tab|submit|allow"
 * - data-champs-tab="submit"
 * - data-champs-submit-on-scan="true"
 */

export class FormSubmitControl {
    static handleKeydown(event) {
        const target = event.target;

        if (!target || !this.isField(target)) return;
        if (event.isComposing) return;

        const form = target.form;
        if (!form) return;

        // Não interferir em textarea por padrão
        if (target.tagName === 'TEXTAREA') return;

        if (event.key === 'Enter') {
            this.handleEnter(event, form, target);
            return;
        }

        if (event.key === 'Tab') {
            this.handleTab(event, form, target);
        }
    }

    static handleEnter(event, form, target) {
        const enterMode = this.getEnterMode(form, target);

        if (enterMode === 'submit' || target.dataset.champsSubmitOnScan === 'true') {
            event.preventDefault();
            this.submitForm(form, target);
            return;
        }

        if (enterMode === 'tab') {
            event.preventDefault();
            this.focusNextField(form, target);
            return;
        }

        if (enterMode === 'allow') {
            return;
        }

        if (this.shouldBlockEnterSubmit(form, target)) {
            event.preventDefault();
        }
    }

    static handleTab(event, form, target) {
        const tabMode = (target.dataset.champsTab || '').toLowerCase();

        if (tabMode === 'submit') {
            event.preventDefault();
            this.submitForm(form, target);
        }
    }

    static getEnterMode(form, field) {
        const fieldMode = (field.dataset.champsEnter || '').toLowerCase();
        if (fieldMode) return fieldMode;

        if (field.classList.contains('champs-makes-enter-as-tab')) {
            return 'tab';
        }

        if (field.classList.contains('champs-allow-enter-submit')) {
            return 'allow';
        }

        const formMode = (form.dataset.champsEnterMode || '').toLowerCase();
        if (formMode) return formMode;

        return '';
    }

    static shouldBlockEnterSubmit(form, field) {
        if (field.dataset.champsEnter === 'allow') return false;
        if (field.classList.contains('champs-allow-enter-submit')) return false;

        if (this.isAllowed(form)) return false;

        return form.dataset.champsBlockEnterSubmit === 'true';
    }

    static isAllowed(form) {
        return (
            form.classList.contains('champs-allow-enter-submit') ||
            form.dataset.allowEnterSubmit === 'true'
        );
    }

    static focusNextField(form, currentField) {
        const fields = this.getFocusableFields(form);
        const index = fields.indexOf(currentField);

        if (index !== -1 && index + 1 < fields.length) {
            const nextField = fields[index + 1];
            nextField.focus();

            if (typeof nextField.select === 'function' && nextField.tagName === 'INPUT') {
                nextField.select();
            }
        }
    }

    static getFocusableFields(form) {
        return Array.from(form.querySelectorAll('input, select, textarea, button'))
            .filter((el) => {
                if (el.disabled) return false;
                if (el.type === 'hidden') return false;
                if (el.tabIndex === -1) return false;
                if (el.offsetParent === null) return false;
                return true;
            });
    }

    static submitForm(form, originField = null) {
        form.dispatchEvent(new CustomEvent('champs:before-submit-by-key', {
            bubbles: true,
            detail: { originField }
        }));

        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
            return;
        }

        form.submit();
    }

    static isField(el) {
        return ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    }
}

export function initFormSubmitControl(scope = document) {
    if (!scope.__champsFormSubmitControlInitialized) {
        scope.addEventListener('keydown', FormSubmitControl.handleKeydown.bind(FormSubmitControl), true);
        scope.__champsFormSubmitControlInitialized = true;
    }
}

export default FormSubmitControl;