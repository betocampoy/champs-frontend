/**
 * Champs Core — NotificationCenter
 *
 * Objetivo:
 * - Central de notificações via Bootstrap Offcanvas
 * - Contador de não lidas
 * - Atualização automática configurável
 * - Carregamento sob demanda da lista
 * - Ações por item (lida / excluir)
 * - Estrutura preparada para domPatch / remove
 *
 * Data attributes:
 *
 * Trigger:
 * data-champs-notification-center
 * data-champs-notification-center-target="#notificationCenter"
 * data-champs-notification-center-url="/notifications/list"
 * data-champs-notification-center-counter-url="/notifications/counter"
 * data-champs-notification-center-read-url="/notifications/read"
 * data-champs-notification-center-delete-url="/notifications/delete"
 * data-champs-notification-center-refresh="60"
 * data-champs-notification-center-open-if-unread="true"       (opcional, default false)
 * data-champs-notification-center-open-if-unread-once="true"  (opcional, default true)
 * data-champs-notification-center-read-action="notification-center-mark-read"       (opcional)
 * data-champs-notification-center-delete-action="notification-center-delete"        (opcional)
 *
 * Counter:
 * data-champs-notification-center-counter
 *
 * List:
 * data-champs-notification-center-list
 *
 * Item:
 * data-champs-notification-center-item
 * data-champs-notification-center-id="123"
 *
 * Action buttons gerados pelo módulo:
 * data-champs-ajax="true"
 * data-champs-ajax-route="..."
 * data-champs-ajax-field-action="notification-center-mark-read|notification-center-delete"
 * data-champs-ajax-field-notification_id="123"
 * data-champs-ajax-module="notification-center"
 *
 * Integração com AjaxForm:
 * - Escuta champs:ajax:success.
 * - Se context.module === "notification-center", atualiza contador/lista.
 * - Se response.data.counter/unread vier no AjaxResponse, usa esse valor sem nova consulta do contador.
 *
 * Auto abertura:
 * - Se data-champs-notification-center-open-if-unread="true", ao carregar o contador,
 *   se houver notificações não lidas, a sidebar será aberta automaticamente.
 * - Por padrão abre apenas uma vez por sessão do navegador.
 *
 * Recursos:
 * - Bootstrap 5 Offcanvas quando disponível
 * - Fallback próprio para BS3/BS4/sem Offcanvas
 * - CSS injetado automaticamente para o fallback
 * - Contador de não lidas
 * - Refresh automático configurável
 * - Pausa refresh quando a aba fica oculta
 * - Lista carregada ao abrir
 * - Abertura automática opcional quando houver não lidas
 * - Ações: marcar como lida / excluir via Champs Ajax
 * - Preparado para actions: domPatch / remove
 */

class NotificationCenter {
    static selector = '[data-champs-notification-center]';
    static stylesId = 'champs-notification-center-styles';

    static initAll(scope = document) {
        scope.querySelectorAll(this.selector).forEach((element) => {
            if (element.dataset.champsNotificationCenterInitialized === '1') {
                return;
            }

            element.dataset.champsNotificationCenterInitialized = '1';
            new NotificationCenter(element);
        });
    }

    static ensureStyles() {
        if (document.getElementById(this.stylesId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = this.stylesId;

        style.textContent = `
            .champs-notification-sidebar {
                position: fixed;
                top: 0;
                bottom: 0;
                width: 380px;
                max-width: 100%;
                background-color: #fff;
                z-index: 1055;
                overflow-y: auto;
                visibility: hidden;
                transition: transform .2s ease-in-out, visibility .2s ease-in-out;
                box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .15);
            }

            .champs-notification-sidebar.show {
                visibility: visible;
            }

            .champs-notification-sidebar-end {
                right: 0;
                transform: translateX(100%);
            }

            .champs-notification-sidebar-end.show {
                transform: translateX(0);
            }

            .champs-notification-sidebar-start {
                left: 0;
                transform: translateX(-100%);
            }

            .champs-notification-sidebar-start.show {
                transform: translateX(0);
            }

            .champs-notification-center-open {
                overflow: hidden;
            }

            .champs-notification-center-backdrop {
                position: fixed;
                inset: 0;
                background-color: rgba(0, 0, 0, .35);
                z-index: 1050;
            }

            .champs-notification-counter-hidden {
                display: none !important;
            }

            .champs-notification-bs3-trigger {
                position: relative;
            }

            .champs-notification-bs3-icon-wrap {
                position: relative;
                display: inline-block;
                width: 18px;
            }

            .champs-notification-bs3-icon-wrap
            [data-champs-notification-center-counter] {
                position: absolute;
                top: -8px;
                right: -14px;
                font-size: 10px;
                min-width: 18px;
                padding: 3px 5px;
                line-height: 1;
            }
        `;

        document.head.appendChild(style);
    }

    constructor(element) {
        this.element = element;

        this.targetSelector = element.dataset.champsNotificationCenterTarget || null;
        this.url = element.dataset.champsNotificationCenterUrl || null;
        this.counterUrl = element.dataset.champsNotificationCenterCounterUrl || this.url;
        this.readUrl = element.dataset.champsNotificationCenterReadUrl || null;
        this.deleteUrl = element.dataset.champsNotificationCenterDeleteUrl || null;

        this.readAction = element.dataset.champsNotificationCenterReadAction || 'notification-center-mark-read';
        this.deleteAction = element.dataset.champsNotificationCenterDeleteAction || 'notification-center-delete';

        this.openIfUnread = (element.dataset.champsNotificationCenterOpenIfUnread || 'false') === 'true';
        this.openIfUnreadOnce = (element.dataset.champsNotificationCenterOpenIfUnreadOnce || 'true') === 'true';
        this.autoOpenStorageKey = this.resolveAutoOpenStorageKey();
        this.hasAutoOpened = false;

        this.refreshSeconds = parseInt(
            element.dataset.champsNotificationCenterRefresh || '0',
            10
        );

        this.sidebar = this.targetSelector
            ? document.querySelector(this.targetSelector)
            : null;

        this.counter = element.querySelector('[data-champs-notification-center-counter]');
        this.list = this.sidebar?.querySelector('[data-champs-notification-center-list]') || null;

        this.controller = null;
        this.refreshTimer = null;

        this.isLoadingList = false;
        this.isRefreshingCounter = false;

        this.init();
    }

    resolveAutoOpenStorageKey() {
        const keyBase = this.targetSelector || this.url || 'default';
        return `champs:notification-center:auto-opened:${keyBase}`;
    }

    shouldAutoOpen(unread) {
        if (!this.openIfUnread || unread <= 0 || this.hasAutoOpened) {
            return false;
        }

        if (!this.openIfUnreadOnce) {
            return true;
        }

        try {
            return window.sessionStorage.getItem(this.autoOpenStorageKey) !== '1';
        } catch (error) {
            return true;
        }
    }

    markAutoOpened() {
        this.hasAutoOpened = true;

        if (!this.openIfUnreadOnce) {
            return;
        }

        try {
            window.sessionStorage.setItem(this.autoOpenStorageKey, '1');
        } catch (error) {
            // sessionStorage indisponível: apenas evita reabrir nesta instância
        }
    }

    resolveUnread(data) {
        if (typeof data?.unread !== 'undefined') {
            return parseInt(data.unread || 0, 10);
        }

        if (typeof data?.counter !== 'undefined') {
            return parseInt(data.counter || 0, 10);
        }

        return 0;
    }

    init() {
        if (!this.sidebar || !this.list || !this.url) {
            return;
        }

        NotificationCenter.ensureStyles();

        this.prepareFallbackSidebar();
        this.controller = this.createSidebarController();

        this.bindEvents();
        this.bindAjaxEvents();

        this.refreshCounter();
        this.startAutoRefresh();
    }

    bindEvents() {
        this.element.addEventListener('click', () => {
            this.open();
        });

        this.sidebar.addEventListener('click', (event) => {
            const close = event.target.closest('[data-champs-notification-center-close]');

            if (close) {
                this.close();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.refreshCounter();
                this.startAutoRefresh();
                return;
            }

            this.stopAutoRefresh();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.close();
            }
        });
    }

    bindAjaxEvents() {
        document.addEventListener('champs:ajax:success', (event) => {
            const detail = event.detail || {};
            const context = detail.context || {};

            if (context.module !== 'notification-center') {
                return;
            }

            const trigger = detail.trigger || detail.triggerEl || null;

            if (trigger && this.sidebar && !this.sidebar.contains(trigger)) {
                return;
            }

            const data = detail.data || {};
            const response = detail.response || {};
            const unreadValue = data.unread ?? data.counter ?? response.unread ?? response.counter;

            if (typeof unreadValue !== 'undefined' && unreadValue !== null) {
                this.updateCounter(parseInt(unreadValue || 0, 10));
            } else {
                this.refreshCounter();
            }

            this.loadList();
        });
    }

    detectBootstrapVersion() {
        if (typeof bootstrap !== 'undefined') {
            if (bootstrap.Offcanvas) {
                return 5;
            }

            if (bootstrap.Modal) {
                return 5;
            }
        }

        if (
            typeof window.jQuery !== 'undefined' &&
            typeof window.jQuery.fn !== 'undefined' &&
            typeof window.jQuery.fn.modal !== 'undefined'
        ) {
            return 3;
        }

        return null;
    }

    prepareFallbackSidebar() {
        const version = this.detectBootstrapVersion();

        if (
            version === 5 &&
            typeof bootstrap !== 'undefined' &&
            bootstrap.Offcanvas
        ) {
            return;
        }

        this.sidebar.classList.add('champs-notification-sidebar');

        if (
            !this.sidebar.classList.contains('champs-notification-sidebar-start') &&
            !this.sidebar.classList.contains('champs-notification-sidebar-end')
        ) {
            const isStart =
                this.sidebar.classList.contains('offcanvas-start') ||
                this.sidebar.classList.contains('champs-start');

            this.sidebar.classList.add(
                isStart
                    ? 'champs-notification-sidebar-start'
                    : 'champs-notification-sidebar-end'
            );
        }

        this.sidebar.setAttribute('aria-hidden', 'true');

        const closeButton = this.sidebar.querySelector('[data-bs-dismiss="offcanvas"]');

        if (closeButton && !closeButton.hasAttribute('data-champs-notification-center-close')) {
            closeButton.setAttribute('data-champs-notification-center-close', '');
        }
    }

    createSidebarController() {
        const version = this.detectBootstrapVersion();

        if (
            version === 5 &&
            typeof bootstrap !== 'undefined' &&
            bootstrap.Offcanvas
        ) {
            const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(this.sidebar);

            return {
                type: 'bs5-offcanvas',
                show: () => offcanvas.show(),
                hide: () => offcanvas.hide()
            };
        }

        return {
            type: 'champs-fallback',
            show: () => {
                this.sidebar.classList.add('show');
                this.sidebar.setAttribute('aria-hidden', 'false');
                document.body.classList.add('champs-notification-center-open');
                this.createBackdrop();
            },
            hide: () => {
                this.sidebar.classList.remove('show');
                this.sidebar.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('champs-notification-center-open');
                this.removeBackdrop();
            }
        };
    }

    async open() {
        await this.loadList();
        this.controller.show();
    }

    close() {
        if (!this.controller) {
            return;
        }

        this.controller.hide();
    }

    createBackdrop() {
        this.removeBackdrop();

        const backdrop = document.createElement('div');

        backdrop.className = 'champs-notification-center-backdrop';
        backdrop.dataset.champsNotificationCenterBackdrop = '1';

        backdrop.addEventListener('click', () => {
            this.close();
        });

        document.body.appendChild(backdrop);
    }

    removeBackdrop() {
        document
            .querySelectorAll('[data-champs-notification-center-backdrop]')
            .forEach((element) => element.remove());
    }

    startAutoRefresh() {
        this.stopAutoRefresh();

        if (!this.refreshSeconds || this.refreshSeconds <= 0) {
            return;
        }

        if (document.visibilityState !== 'visible') {
            return;
        }

        this.refreshTimer = window.setInterval(() => {
            this.refreshCounter();
        }, this.refreshSeconds * 1000);
    }

    stopAutoRefresh() {
        if (!this.refreshTimer) {
            return;
        }

        window.clearInterval(this.refreshTimer);
        this.refreshTimer = null;
    }

    async refreshCounter() {
        if (!this.counterUrl || this.isRefreshingCounter) {
            return;
        }

        this.isRefreshingCounter = true;

        try {
            const data = await this.getJson(this.counterUrl);
            const unread = this.resolveUnread(data);

            this.updateCounter(unread);

            if (this.shouldAutoOpen(unread)) {
                this.markAutoOpened();
                await this.open();
            }
        } catch (error) {
            console.warn('[NotificationCenter]', error.message);
        } finally {
            this.isRefreshingCounter = false;
        }
    }

    async loadList() {
        if (this.isLoadingList) {
            return;
        }

        this.isLoadingList = true;
        this.renderLoading();

        try {
            const data = await this.getJson(this.url);

            this.updateCounter(this.resolveUnread(data));
            this.renderItems(data.items || []);
        } catch (error) {
            this.renderError(error.message);
        } finally {
            this.isLoadingList = false;
        }
    }

    async getJson(url) {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || 'Não foi possível carregar as notificações.'
            );
        }

        return data;
    }

    updateCounter(total) {
        if (!this.counter) {
            return;
        }

        total = parseInt(total || 0, 10);

        this.counter.textContent = total;

        const hidden = total <= 0;

        this.counter.classList.toggle('d-none', hidden);
        this.counter.classList.toggle('champs-notification-counter-hidden', hidden);
    }

    renderLoading() {
        this.list.innerHTML = `
            <div class="p-3 text-muted small">
                Carregando notificações...
            </div>
        `;
    }

    renderError(message) {
        this.list.innerHTML = `
            <div class="p-3 text-danger small">
                ${this.escapeHtml(message)}
            </div>
        `;
    }

    renderItems(items) {
        if (!items.length) {
            this.list.innerHTML = `
                <div class="p-3 text-muted small">
                    Nenhuma notificação encontrada.
                </div>
            `;
            return;
        }

        this.list.innerHTML = items
            .map((item) => this.renderItem(item))
            .join('');
    }

    renderItem(item) {
        const read = Boolean(item.read || item.is_read || item.read_at);
        const readClass = read ? 'opacity-75' : 'fw-semibold';

        const unreadBadge = read
            ? ''
            : `<span class="badge bg-primary rounded-pill">Nova</span>`;

        return `
            <div
                class="list-group-item ${readClass}"
                data-champs-notification-center-item
                data-champs-notification-center-id="${this.escapeAttribute(item.id)}"
            >
                <div class="d-flex justify-content-between gap-2">
                    <div class="flex-grow-1">
                        <div class="mb-1">
                            ${this.escapeHtml(item.subject || 'Sem assunto')}
                        </div>

                        ${item.body ? `
                            <div class="small text-muted">
                                ${this.escapeHtml(item.body)}
                            </div>
                        ` : ''}

                        ${(item.createdAt || item.created_at) ? `
                            <div class="small text-muted mt-1">
                                ${this.escapeHtml(item.createdAt || item.created_at)}
                            </div>
                        ` : ''}
                    </div>

                    <div>${unreadBadge}</div>
                </div>

                ${item.media ? this.renderMedia(item.media) : ''}

                <div class="d-flex gap-2 mt-2 flex-wrap">
                    ${item.link ? `
                        <a href="${this.escapeAttribute(item.link)}" class="btn btn-sm btn-outline-primary">
                            Abrir
                        </a>
                    ` : ''}

                    ${(!read && this.readUrl) ? `
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            data-champs-ajax="true"
                            data-champs-ajax-module="notification-center"
                            data-champs-ajax-route="${this.escapeAttribute(this.readUrl)}"
                            data-champs-ajax-field-action="${this.escapeAttribute(this.readAction)}"
                            data-champs-ajax-field-notification_id="${this.escapeAttribute(item.id)}"
                            data-champs-loader-target="[data-champs-notification-center-id='${this.escapeAttribute(item.id)}']"
                        >
                            Marcar como lida
                        </button>
                    ` : ''}

                    ${this.deleteUrl ? `
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            data-champs-ajax="true"
                            data-champs-ajax-module="notification-center"
                            data-champs-ajax-route="${this.escapeAttribute(this.deleteUrl)}"
                            data-champs-ajax-field-action="${this.escapeAttribute(this.deleteAction)}"
                            data-champs-ajax-field-notification_id="${this.escapeAttribute(item.id)}"
                            data-champs-ajax-confirm="Deseja excluir esta notificação?"
                            data-champs-loader-target="[data-champs-notification-center-id='${this.escapeAttribute(item.id)}']"
                        >
                            Excluir
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderMedia(media) {
        if (typeof media === 'string') {
            return `
                <div class="mt-2">
                    <img
                        src="${this.escapeAttribute(media)}"
                        class="img-fluid rounded"
                        alt=""
                    >
                </div>
            `;
        }

        if (media.type === 'image' && media.url) {
            return `
                <div class="mt-2">
                    <img
                        src="${this.escapeAttribute(media.url)}"
                        class="img-fluid rounded"
                        alt=""
                    >
                </div>
            `;
        }

        return '';
    }

    removeElement(selector) {
        const element = document.querySelector(selector);

        if (element) {
            element.remove();
        }
    }

    patchElement(selector, html) {
        const element = document.querySelector(selector);

        if (!element) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html.trim();

        const newElement = wrapper.firstElementChild;

        if (newElement) {
            element.replaceWith(newElement);
        }
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value);
    }
}

export function initNotificationCenter(scope = document) {
    NotificationCenter.initAll(scope);
}
