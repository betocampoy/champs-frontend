/**
 * Champs Core — Onboarding
 *
 * Tours guiados de interface, consumindo os endpoints do bundle
 * betocampoy/champs-onboarding. Só Bootstrap (classes .card/.btn e variáveis
 * --bs-*), sem dependência extra: segue o tema e o modo escuro do projeto.
 *
 * Data attributes:
 *
 * Raiz (uma por página, normalmente o <body>):
 * data-champs-onboarding                      ativa o módulo
 * data-champs-onboarding-route="app_x"        nome da rota Symfony atual (obrigatório)
 * data-champs-onboarding-url="/onboarding"    prefixo dos endpoints (default /onboarding)
 * data-champs-onboarding-autostart="false"    não busca tour ao carregar (default true)
 * data-champs-onboarding-labels='{"next":"Próximo"}'  textos (JSON, opcional)
 *
 * Âncora de um passo:
 * data-champs-tour="btn-importar"             = TourStep.anchor
 *
 * Botão de ajuda ("?"):
 * data-champs-onboarding-help                 lista os tours da página (abre direto se houver um só)
 * data-champs-onboarding-help="slug"          abre esse tour
 *
 * Eventos (document): champs:onboarding:start | step | complete | skip | error
 * detail: { tour, step, status, error }
 *
 * API: Onboarding.start(slug), Onboarding.stop()
 *
 * Regras:
 * - "Próximo" grava no servidor (POST /progress, cabeçalho X-Champs-Ajax);
 *   "Voltar" é só local (o servidor guarda o passo mais avançado).
 * - Passo em outra rota: grava e navega para a url do passo; ao carregar
 *   a outra página o tour é retomado (GET /tour devolve o tour em andamento).
 * - Tour obrigatório: sem "Pular", sem fechar.
 * - Âncora não encontrada: o passo aparece centralizado (console.warn).
 * - 401: desiste em silêncio. Conteúdo do passo é texto (escapado), quebras de linha viram <br>.
 */

const DEFAULT_LABELS = {
    next: 'Próximo',
    back: 'Voltar',
    done: 'Concluir',
    skip: 'Pular',
    close: 'Fechar',
    help: 'Saiba mais',
    of: 'de',
    chooseTour: 'Escolha um tour',
    noTours: 'Não há tours para esta página.',
    otherPage: 'Este passo continua em outra tela do sistema.',
};

const STYLES_ID = 'champs-onboarding-styles';
const Z_INDEX = 1085; // acima de modal (1055) e tooltip (1080), abaixo de toast (1090)

function ensureStyles() {
    if (document.getElementById(STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = `
        .champs-onboarding-layer { position: fixed; inset: 0; z-index: ${Z_INDEX}; }
        .champs-onboarding-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, .5); }
        .champs-onboarding-spotlight {
            position: fixed; border-radius: var(--bs-border-radius, .375rem);
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, .5);
            outline: 2px solid var(--bs-primary, #0d6efd); outline-offset: 2px;
            pointer-events: none; transition: all .2s ease;
        }
        .champs-onboarding-card {
            position: fixed; width: 340px; max-width: calc(100vw - 24px);
            box-shadow: var(--bs-box-shadow-lg, 0 1rem 3rem rgba(0, 0, 0, .175));
            transition: top .2s ease, left .2s ease;
        }
        .champs-onboarding-card .card-text { white-space: normal; }
        .champs-onboarding-card .champs-onboarding-counter { font-size: .8rem; }
    `;
    document.head.appendChild(style);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML.replace(/\n/g, '<br>');
}

function strToBool(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    return !['0', 'false', 'no', 'off'].includes(String(v).trim().toLowerCase());
}

export default class Onboarding {
    static instance = null;

    static start(slug) {
        return Onboarding.instance?.startManual(slug);
    }

    static stop() {
        Onboarding.instance?.close();
    }

    constructor(root) {
        this.root = root;
        this.route = root.dataset.champsOnboardingRoute || '';
        this.baseUrl = (root.dataset.champsOnboardingUrl || '/onboarding').replace(/\/$/, '');
        this.labels = { ...DEFAULT_LABELS, ...this.parseLabels(root.dataset.champsOnboardingLabels) };

        this.tour = null;   // payload do servidor
        this.index = 0;     // posição exibida
        this.layer = null;
        this.onReposition = () => this.position();
        this.onKeydown = (e) => this.handleKey(e);
    }

    parseLabels(json) {
        if (!json) return {};
        try { return JSON.parse(json); } catch { console.warn('[Onboarding] data-champs-onboarding-labels inválido'); return {}; }
    }

    // ------------------------------------------------------------ servidor

    async request(path, { method = 'GET', body = null, keepalive = false } = {}) {
        const headers = { Accept: 'application/json', 'X-Champs-Ajax': '1' };
        if (body !== null) headers['Content-Type'] = 'application/json';

        const res = await fetch(this.baseUrl + path, {
            method,
            headers,
            credentials: 'same-origin',
            body: body !== null ? JSON.stringify(body) : undefined,
            keepalive,
        });

        if (res.status === 401) {
            const err = new Error('unauthenticated');
            err.silent = true;
            throw err;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        return data;
    }

    fail(error) {
        if (!error?.silent) console.warn('[Onboarding]', error?.message || error);
        this.emit('error', { error });
    }

    async autostart() {
        if (!this.route) {
            console.warn('[Onboarding] data-champs-onboarding-route não informado.');
            return;
        }
        try {
            const data = await this.request(`/tour?route=${encodeURIComponent(this.route)}`);
            if (data.tour) this.open(data.tour);
        } catch (e) {
            this.fail(e);
        }
    }

    async startManual(slug) {
        try {
            const data = await this.request(`/tour/${encodeURIComponent(slug)}`);
            if (!data.tour) return;

            const first = data.tour.steps[data.tour.currentStep];
            if (first && first.route !== this.route && first.url) {
                window.location.href = first.url; // o tour começa em outra tela: retoma lá
                await this.waitNavigation();
                return;
            }
            this.open(data.tour);
        } catch (e) {
            this.fail(e);
        }
    }

    async help(slug) {
        if (slug) return this.startManual(slug);

        try {
            const { tours } = await this.request(`/available?route=${encodeURIComponent(this.route)}`);
            if (!tours?.length) return this.showMessage(this.labels.noTours);
            if (tours.length === 1) return this.startManual(tours[0].slug);
            this.showChooser(tours);
        } catch (e) {
            this.fail(e);
        }
    }

    record(action, step, keepalive = false) {
        return this.request('/progress', {
            method: 'POST',
            body: { tour: this.tour.tour, step, action },
            keepalive,
        });
    }

    // ------------------------------------------------------------ fluxo

    open(tour) {
        this.close();
        this.tour = tour;
        this.index = Math.min(tour.currentStep || 0, tour.steps.length - 1);

        ensureStyles();
        this.layer = document.createElement('div');
        this.layer.className = 'champs-onboarding-layer';
        this.layer.setAttribute('role', 'dialog');
        this.layer.setAttribute('aria-modal', 'true');
        document.body.appendChild(this.layer);

        window.addEventListener('resize', this.onReposition);
        window.addEventListener('scroll', this.onReposition, true);
        document.addEventListener('keydown', this.onKeydown);

        this.emit('start');
        this.render();
    }

    close() {
        this.unbindAnchorClick?.();
        this.unbindAnchorClick = null;
        window.removeEventListener('resize', this.onReposition);
        window.removeEventListener('scroll', this.onReposition, true);
        document.removeEventListener('keydown', this.onKeydown);
        this.layer?.remove();
        this.layer = null;
        this.tour = null;
    }

    get step() {
        return this.tour?.steps[this.index] ?? null;
    }

    get isLast() {
        return this.index >= this.tour.steps.length - 1;
    }

    async next() {
        const from = this.index;
        const tour = this.tour;
        const target = tour.steps[from + 1];

        // Próximo passo em outra tela: grava antes de navegar (keepalive sobrevive à troca de página).
        if (target && target.route !== this.route) {
            try { await this.record('next', from, true); } catch (e) { return this.fail(e); }
            if (target.url) {
                window.location.href = target.url;
                await this.waitNavigation(); // spinner continua até a outra página carregar
            } else {
                this.close();
                this.showMessage(this.labels.otherPage);
            }
            return;
        }

        try {
            const res = await this.record('next', from);
            if (res.status === 'completed') {
                this.emit('complete', { status: res.status });
                return this.close();
            }
            this.index = res.currentStep;
            this.render();
        } catch (e) {
            this.fail(e);
        }
    }

    /** Segura o estado "carregando" durante a troca de página (destrava após 10 s se a navegação não acontecer). */
    waitNavigation() {
        return new Promise((resolve) => setTimeout(resolve, 10000));
    }

    back() {
        if (this.index === 0) return;
        const prev = this.tour.steps[this.index - 1];
        if (prev.route !== this.route) return; // voltar entre telas não é suportado
        this.index--;
        this.render();
    }

    async skip() {
        if (!this.tour || this.tour.mandatory) return;
        const slug = this.tour.tour;
        const step = this.index;
        this.close(); // fecha na hora; o registro vai em segundo plano
        try {
            await this.request('/progress', { method: 'POST', body: { tour: slug, step, action: 'skip' } });
            this.emit('skip', { tour: slug, step, status: 'skipped' });
        } catch (e) {
            this.fail(e);
        }
    }

    handleKey(e) {
        if (!this.layer) return;
        if (e.key === 'Escape' && !this.tour.mandatory) { e.preventDefault(); this.run(null, () => this.skip()); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.run(this.layer.querySelector('[data-onb="next"]'), () => this.next()); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.run(null, () => this.back()); }
    }

    /**
     * Uma ação por vez: enquanto a requisição não volta, cliques e teclas são
     * ignorados, os botões do card ficam desabilitados e o botão acionado mostra
     * um spinner (o servidor pode demorar e o usuário clicaria várias vezes).
     */
    async run(button, action) {
        if (this.busy) return;
        this.busy = true;

        const restore = this.setLoading(button, this.layer?.querySelectorAll('[data-onb]') ?? []);
        try {
            await action();
        } finally {
            this.busy = false;
            restore(); // se o card foi redesenhado, os botões antigos já saíram da tela
        }
    }

    /** Desabilita os botões e põe spinner no acionado. Devolve a função que desfaz. */
    setLoading(button, buttons) {
        const list = [...buttons];
        if (button && !list.includes(button)) list.push(button);

        const original = button?.innerHTML;
        list.forEach((b) => { b.disabled = true; b.setAttribute('aria-busy', 'true'); });

        if (button && !button.classList.contains('btn-close')) {
            const width = button.offsetWidth;
            button.style.minWidth = `${width}px`; // não "pula" de tamanho
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        }

        return () => {
            list.forEach((b) => { b.disabled = false; b.removeAttribute('aria-busy'); });
            if (button && original !== undefined && !button.classList.contains('btn-close')) {
                button.innerHTML = original;
                button.style.minWidth = '';
            }
        };
    }

    // ------------------------------------------------------------ tela

    findAnchor(step) {
        if (!step.anchor) return null;
        const el = document.querySelector(`[data-champs-tour="${CSS.escape(step.anchor)}"]`);
        if (!el) console.warn(`[Onboarding] âncora "${step.anchor}" não encontrada; passo exibido centralizado.`);
        return el;
    }

    render() {
        const step = this.step;
        if (!step || !this.layer) return;

        this.lastTour = this.tour.tour;
        this.unbindAnchorClick?.();
        this.unbindAnchorClick = null;

        const anchor = this.findAnchor(step);
        this.anchor = anchor;

        const total = this.tour.steps.length;
        const prevSameRoute = this.index > 0 && this.tour.steps[this.index - 1].route === this.route;
        const L = this.labels;

        this.layer.innerHTML = `
            ${anchor ? '<div class="champs-onboarding-spotlight"></div>' : '<div class="champs-onboarding-backdrop"></div>'}
            <div class="card champs-onboarding-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${escapeHtml(step.title)}</h6>
                        ${this.tour.mandatory ? '' : `<button type="button" class="btn-close ms-2" data-onb="skip" aria-label="${escapeHtml(L.close)}"></button>`}
                    </div>
                    <p class="card-text small mb-3">${escapeHtml(step.content)}</p>
                    ${step.helpUrl ? `<p class="mb-3"><a href="${escapeHtml(step.helpUrl)}" target="_blank" rel="noopener" class="small">${escapeHtml(step.helpLabel || L.help)} <i class="bi bi-box-arrow-up-right"></i></a></p>` : ''}
                    <div class="d-flex align-items-center gap-2">
                        <span class="text-body-secondary champs-onboarding-counter me-auto">${this.index + 1} ${escapeHtml(L.of)} ${total}</span>
                        ${this.tour.mandatory ? '' : `<button type="button" class="btn btn-sm btn-link text-body-secondary" data-onb="skip">${escapeHtml(L.skip)}</button>`}
                        ${prevSameRoute ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-onb="back">${escapeHtml(L.back)}</button>` : ''}
                        ${step.advanceOnClick && anchor ? '' : `<button type="button" class="btn btn-sm btn-primary" data-onb="next">${escapeHtml(this.isLast ? L.done : L.next)}</button>`}
                    </div>
                </div>
            </div>`;

        this.card = this.layer.querySelector('.champs-onboarding-card');
        this.spotlight = this.layer.querySelector('.champs-onboarding-spotlight');

        this.layer.querySelectorAll('[data-onb]').forEach((btn) => {
            btn.addEventListener('click', () => this.run(btn, () => this[btn.dataset.onb]()));
        });

        if (anchor && step.advanceOnClick) this.bindAnchorClick(anchor);

        if (anchor) {
            anchor.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
        this.position();
        this.layer.querySelector('[data-onb="next"]')?.focus({ preventScroll: true });

        this.emit('step', { step: this.index });
    }

    /**
     * advanceOnClick: o próprio elemento destacado avança o tour. Nesse passo
     * a camada não bloqueia cliques (o escurecido é só visual); o clique na
     * âncora segue normalmente (pode navegar) e o progresso vai com keepalive.
     */
    bindAnchorClick(anchor) {
        this.layer.style.pointerEvents = 'none';
        this.card.style.pointerEvents = 'auto';

        const handler = () => {
            const from = this.index;
            const done = this.isLast;
            this.record('next', from, true).catch((e) => this.fail(e));
            if (done) {
                this.emit('complete', { status: 'completed' });
                this.close();
            } else {
                this.index++;
                // se o clique navegar, a próxima página retoma; senão, segue aqui
                setTimeout(() => this.layer && this.render(), 50);
            }
        };

        anchor.addEventListener('click', handler, { once: true });
        this.unbindAnchorClick = () => {
            anchor.removeEventListener('click', handler);
            if (this.layer) this.layer.style.pointerEvents = '';
        };
    }

    position() {
        if (!this.card) return;

        const gap = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const card = this.card.getBoundingClientRect();

        if (!this.anchor || !this.spotlight) {
            this.card.style.top = `${Math.max(gap, (vh - card.height) / 2)}px`;
            this.card.style.left = `${Math.max(gap, (vw - card.width) / 2)}px`;
            return;
        }

        const r = this.anchor.getBoundingClientRect();
        const pad = 4;
        Object.assign(this.spotlight.style, {
            top: `${r.top - pad}px`,
            left: `${r.left - pad}px`,
            width: `${r.width + pad * 2}px`,
            height: `${r.height + pad * 2}px`,
        });

        const space = { top: r.top, bottom: vh - r.bottom, left: r.left, right: vw - r.right };
        let placement = this.step.placement || 'auto';
        const fits = {
            top: space.top >= card.height + gap,
            bottom: space.bottom >= card.height + gap,
            left: space.left >= card.width + gap,
            right: space.right >= card.width + gap,
        };
        if (placement === 'auto' || !fits[placement]) {
            placement = ['bottom', 'top', 'right', 'left'].find((p) => fits[p]) || 'bottom';
        }

        let top;
        let left;
        if (placement === 'top' || placement === 'bottom') {
            top = placement === 'top' ? r.top - card.height - gap : r.bottom + gap;
            left = r.left + r.width / 2 - card.width / 2;
        } else {
            top = r.top + r.height / 2 - card.height / 2;
            left = placement === 'left' ? r.left - card.width - gap : r.right + gap;
        }

        this.card.style.top = `${Math.min(Math.max(gap, top), vh - card.height - gap)}px`;
        this.card.style.left = `${Math.min(Math.max(gap, left), vw - card.width - gap)}px`;
    }

    /** Aviso simples no mesmo visual (sem tour aberto). */
    showMessage(text) {
        this.showPanel(`<p class="card-text small mb-3">${escapeHtml(text)}</p>`);
    }

    showChooser(tours) {
        const items = tours.map((t) => `
            <button type="button" class="list-group-item list-group-item-action" data-onb-slug="${escapeHtml(t.slug)}">
                <div class="fw-semibold">${escapeHtml(t.name)}</div>
                ${t.description ? `<div class="small text-body-secondary">${escapeHtml(t.description)}</div>` : ''}
            </button>`).join('');

        const panel = this.showPanel(`
            <h6 class="card-title">${escapeHtml(this.labels.chooseTour)}</h6>
            <div class="list-group list-group-flush mb-3">${items}</div>`);

        panel.querySelectorAll('[data-onb-slug]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (this.busy) return;
                this.busy = true;
                const restore = this.setLoading(null, panel.querySelectorAll('button'));
                btn.insertAdjacentHTML('beforeend', ' <span class="spinner-border spinner-border-sm ms-1" aria-hidden="true"></span>');
                try {
                    await this.startManual(btn.dataset.onbSlug);
                } finally {
                    this.busy = false;
                    restore();
                    panel.remove();
                }
            });
        });
    }

    showPanel(innerHtml) {
        ensureStyles();
        const layer = document.createElement('div');
        layer.className = 'champs-onboarding-layer';
        layer.innerHTML = `
            <div class="champs-onboarding-backdrop"></div>
            <div class="card champs-onboarding-card"><div class="card-body">
                ${innerHtml}
                <div class="text-end"><button type="button" class="btn btn-sm btn-secondary" data-onb-close>${escapeHtml(this.labels.close)}</button></div>
            </div></div>`;
        document.body.appendChild(layer);

        const close = () => layer.remove();
        layer.querySelector('[data-onb-close]').addEventListener('click', close);
        layer.querySelector('.champs-onboarding-backdrop').addEventListener('click', close);

        const card = layer.querySelector('.champs-onboarding-card');
        const rect = card.getBoundingClientRect();
        card.style.top = `${Math.max(12, (window.innerHeight - rect.height) / 2)}px`;
        card.style.left = `${Math.max(12, (window.innerWidth - rect.width) / 2)}px`;

        return layer;
    }

    emit(name, detail = {}) {
        document.dispatchEvent(new CustomEvent(`champs:onboarding:${name}`, {
            detail: { tour: this.tour?.tour ?? this.lastTour ?? null, step: this.index, ...detail },
        }));
    }
}

let helpBound = false;

export function initOnboarding(scope = document) {
    // Botões "?" podem chegar em fragmentos injetados (modal/AjaxForm): delegação, uma vez só.
    if (!helpBound) {
        helpBound = true;
        document.addEventListener('click', (e) => {
            const btn = e.target.closest?.('[data-champs-onboarding-help]');
            if (!btn || !Onboarding.instance) return;
            e.preventDefault();
            Onboarding.instance.run(btn, () => Onboarding.instance.help(btn.dataset.champsOnboardingHelp || ''));
        });
    }

    if (Onboarding.instance) return; // a raiz é da página, não de fragmentos

    const root = scope === document
        ? document.querySelector('[data-champs-onboarding]')
        : (scope.matches?.('[data-champs-onboarding]') ? scope : scope.querySelector?.('[data-champs-onboarding]'));
    if (!root) return;

    Onboarding.instance = new Onboarding(root);
    window.ChampsOnboarding = Onboarding;

    if (strToBool(root.dataset.champsOnboardingAutostart, true)) {
        Onboarding.instance.autostart();
    }
}
