import { initCore } from '../init.js';

/**
 * DomPatch (Champs Core)
 *
 * Operações suportadas:
 * - replace
 * - append
 * - prepend
 * - remove
 * - clear
 * - text
 * - attr
 *
 * Seleção de target suportada:
 * - target: seletor CSS bruto ou Element
 * - id: id do elemento (sem #)
 * - class: classe do elemento (sem .)
 * - data: objeto com pares para montar seletor [data-x="y"]
 *
 * Regras:
 * - replace / append / prepend exigem html
 * - text exige text
 * - attr exige name
 * - attr usa value (ou remove=true para remover o atributo)
 *
 * Prioridade de seleção:
 * - todos os seletores válidos informados são combinados
 * - target continua suportado como modo avançado
 *
 * Exemplos:
 *
 * {
 *   type: "dom-patch",
 *   operation: "text",
 *   id: "empresa-count",
 *   text: "15"
 * }
 *
 * {
 *   type: "dom-patch",
 *   operation: "text",
 *   class: "empresa-count-badge",
 *   text: "15"
 * }
 *
 * {
 *   type: "dom-patch",
 *   operation: "attr",
 *   data: { "empresa-id": "15" },
 *   name: "data-status",
 *   value: "active"
 * }
 */
export default class DomPatch {
    static async execute(action, ctx = {}) {
        if (!action || typeof action !== 'object') {
            console.warn('[DomPatch] action inválida:', action);
            return false;
        }

        const operation = this.normalizeOperation(action.operation);

        if (!operation) {
            console.warn('[DomPatch] operation ausente ou inválida:', action);
            return false;
        }

        const targets = this.resolveTargets(action);

        if (!targets.length) {
            console.warn('[DomPatch] nenhum target encontrado para a action:', action);
            return false;
        }

        if (this.requiresHtml(operation)) {
            const html = this.normalizeHtml(action.html);

            if (!html) {
                console.warn(`[DomPatch.${operation}] html vazio ou ausente.`);
                return false;
            }

            return this.executeHtmlOperation(operation, targets, html, ctx);
        }

        if (operation === 'text') {
            const text = this.normalizeText(action.text);

            if (text === null) {
                console.warn('[DomPatch.text] text ausente.');
                return false;
            }

            return this.executeTextOperation(targets, text);
        }

        if (operation === 'attr') {
            const name = this.normalizeAttrName(action.name);

            if (!name) {
                console.warn('[DomPatch.attr] name ausente ou inválido.');
                return false;
            }

            const hasValue = Object.prototype.hasOwnProperty.call(action, 'value');
            const remove = action.remove === true;

            if (!remove && !hasValue) {
                console.warn('[DomPatch.attr] value ausente.');
                return false;
            }

            return this.executeAttrOperation(targets, name, action.value, action);
        }

        return this.executeSimpleOperation(operation, targets);
    }

    static normalizeOperation(operation) {
        return String(operation || '').trim().toLowerCase();
    }

    static requiresHtml(operation) {
        return ['replace', 'hrml', 'append', 'prepend'].includes(operation);
    }

    static executeHtmlOperation(operation, targets, html, ctx = {}) {
        const affectedCalcContainers = this.collectAffectedCalcContainers(targets);

        switch (operation) {
            case 'replace':
                targets.forEach((target) => {
                    const { fragment, insertedRoots } = this.createFragmentWithRoots(html);
                    target.replaceWith(fragment);
                    this.initInsertedRoots(insertedRoots, ctx);
                });

                this.refreshCalcContainers(affectedCalcContainers);
                return true;

            case 'html':
                targets.forEach((target) => {
                    const { fragment, insertedRoots } = this.createFragmentWithRoots(html);
                    target.innerHTML = '';
                    target.appendChild(fragment);
                    this.initInsertedRoots(insertedRoots, ctx);
                });

                this.refreshCalcContainers(affectedCalcContainers);
                return true;

            case 'append':
                targets.forEach((target) => {
                    const { fragment, insertedRoots } = this.createFragmentWithRoots(html);
                    target.appendChild(fragment);
                    this.initInsertedRoots(insertedRoots, ctx);
                });

                this.refreshCalcContainers(affectedCalcContainers);
                return true;

            case 'prepend':
                targets.forEach((target) => {
                    const { fragment, insertedRoots } = this.createFragmentWithRoots(html);
                    target.prepend(fragment);
                    this.initInsertedRoots(insertedRoots, ctx);
                });

                this.refreshCalcContainers(affectedCalcContainers);
                return true;

            default:
                console.warn(`[DomPatch] operação HTML não suportada: "${operation}"`);
                return false;
        }
    }

    static executeSimpleOperation(operation, targets) {
        switch (operation) {
            case 'remove': {
                const affectedCalcContainers = this.collectAffectedCalcContainers(targets);

                targets.forEach((target) => {
                    target.remove();
                });

                this.refreshCalcContainers(affectedCalcContainers);
                return true;
            }

            case 'clear': {
                const affectedCalcContainers = this.collectAffectedCalcContainers(targets);

                targets.forEach((target) => {
                    target.innerHTML = '';
                });

                this.refreshCalcContainers(affectedCalcContainers);
                return true;
            }

            default:
                console.warn(`[DomPatch] operação simples não suportada: "${operation}"`);
                return false;
        }
    }

    static executeTextOperation(targets, text) {
        targets.forEach((target) => {
            target.textContent = text;
        });

        return true;
    }

    static executeAttrOperation(targets, name, value, action = {}) {
        const remove = action.remove === true;

        targets.forEach((target) => {
            if (remove) {
                target.removeAttribute(name);
                return;
            }

            target.setAttribute(name, String(value));
        });

        return true;
    }

    static resolveTargets(action = {}) {
        const multiple = this.shouldUseMultiple(action);
        const sources = this.buildSelectorSources(action);

        if (!sources.length) {
            return [];
        }

        const resolved = [];
        const seen = new Set();

        sources.forEach((source) => {
            const matches = this.resolveSourceToElements(source, multiple);

            matches.forEach((el) => {
                if (!(el instanceof Element)) return;

                if (!seen.has(el)) {
                    seen.add(el);
                    resolved.push(el);
                }
            });
        });

        return resolved;
    }

    static shouldUseMultiple(action = {}) {
        if (Object.prototype.hasOwnProperty.call(action, 'multiple')) {
            return action.multiple === true;
        }

        if (action.class || action.data) {
            return true;
        }

        return false;
    }

    static buildSelectorSources(action = {}) {
        const sources = [];

        if (action.target) {
            sources.push(action.target);
        }

        if (action.id) {
            sources.push(this.buildIdSelector(action.id));
        }

        if (action.class) {
            sources.push(this.buildClassSelector(action.class));
        }

        if (action.data && typeof action.data === 'object' && !Array.isArray(action.data)) {
            const dataSelector = this.buildDataSelector(action.data);

            if (dataSelector) {
                sources.push(dataSelector);
            }
        }

        return sources.filter(Boolean);
    }

    static buildIdSelector(id) {
        const normalized = String(id || '').trim();
        if (!normalized) return '';

        if (normalized.startsWith('#')) {
            return normalized;
        }

        return `#${this.escapeCssIdentifier(normalized)}`;
    }

    static buildClassSelector(className) {
        const normalized = String(className || '').trim();
        if (!normalized) return '';

        if (normalized.startsWith('.')) {
            return normalized;
        }

        return `.${this.escapeCssIdentifier(normalized)}`;
    }

    static buildDataSelector(data = {}) {
        const parts = [];

        Object.entries(data).forEach(([key, value]) => {
            const normalizedKey = String(key || '').trim();
            if (!normalizedKey) return;

            const attrName = normalizedKey.startsWith('data-')
                ? normalizedKey
                : `data-${normalizedKey}`;

            if (value === null || value === undefined || value === '') {
                parts.push(`[${attrName}]`);
                return;
            }

            parts.push(`[${attrName}="${this.escapeAttributeValue(String(value))}"]`);
        });

        return parts.join('');
    }

    static resolveSourceToElements(source, multiple = false) {
        if (!source) return [];

        if (source instanceof Element) {
            return [source];
        }

        if (typeof source !== 'string') {
            return [];
        }

        try {
            if (multiple) {
                return Array.from(document.querySelectorAll(source));
            }

            const found = document.querySelector(source);
            return found ? [found] : [];
        } catch (error) {
            console.warn('[DomPatch] seletor inválido:', source, error);
            return [];
        }
    }

    static normalizeHtml(html) {
        if (html === null || html === undefined) return '';
        return String(html).trim();
    }

    static normalizeText(text) {
        if (text === null || text === undefined) return null;
        return String(text);
    }

    static normalizeAttrName(name) {
        if (name === null || name === undefined) return '';
        return String(name).trim();
    }

    static createFragmentWithRoots(html) {
        const template = document.createElement('template');
        template.innerHTML = html;

        const fragment = template.content;
        const insertedRoots = Array.from(fragment.childNodes).filter(
            (node) => node.nodeType === Node.ELEMENT_NODE
        );

        return { fragment, insertedRoots };
    }

    static initInsertedRoots(roots, ctx = {}) {
        if (!Array.isArray(roots) || roots.length === 0) {
            return;
        }

        roots.forEach((root) => {
            try {
                initCore(root);
            } catch (error) {
                console.warn('[DomPatch] erro ao reinicializar initCore no fragmento inserido:', error, root);
            }
        });

        if (typeof ctx.afterDomPatch === 'function') {
            try {
                ctx.afterDomPatch(roots);
            } catch (error) {
                console.warn('[DomPatch] erro no callback afterDomPatch:', error);
            }
        }
    }

    static collectAffectedCalcContainers(targets) {
        const containers = new Set();

        targets.forEach((target) => {
            if (!(target instanceof Element)) return;

            const container = target.closest('[data-champs-calc]');
            if (container) {
                containers.add(container);
            }
        });

        return containers;
    }

    static refreshCalcContainers(containers) {
        containers.forEach((container) => {
            if (!(container instanceof Element)) return;

            if (!document.contains(container)) return;

            try {
                initCore(container);
            } catch (error) {
                console.warn('[DomPatch] erro ao recalcular calc container:', error, container);
            }
        });
    }

    static escapeCssIdentifier(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(value);
        }

        return String(value).replace(/[^a-zA-Z0-9\-_]/g, '\\$&');
    }

    static escapeAttributeValue(value) {
        return String(value).replace(/"/g, '\\"');
    }
}