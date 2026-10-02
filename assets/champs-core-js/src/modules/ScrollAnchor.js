/**
 * ScrollAnchor (Champs Core)
 *
 * Rolagem de listas que crescem pelas duas pontas (chat, log, timeline) num
 * container com overflow:
 *
 *  - data-champs-scroll="bottom"   no container rolável.
 *      Ao aparecer: rola até o alvo do #hash da URL (se estiver dentro dele),
 *      senão até o elemento [data-champs-scroll-anchor], senão até o FIM.
 *      Conteúdo trocado/adicionado depois (dom-patch, poll, "carregar anteriores"):
 *        - se a pessoa estava no fim, continua no fim (chegou mensagem nova);
 *        - senão, mantém na tela o que ela estava vendo (não "pula" quando entra
 *          conteúdo em cima). Imagem que termina de carregar conta como mudança.
 *  - data-champs-scroll-anchor     no item onde a lista deve abrir (ex.: 1ª mensagem não lida).
 *
 * Os itens precisam de `id` estável para manter a posição quando o HTML é trocado inteiro.
 */

const PERTO_DO_FIM = 40; // px: "estava no fim" com tolerância

function topoRelativo(container, el) {
    return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
}

function estaNoFim(container) {
    return container.scrollHeight - container.scrollTop - container.clientHeight <= PERTO_DO_FIM;
}

/**
 * Referências para não "pular": os primeiros itens visíveis no topo. Só
 * "folhas" (id sem outro id dentro) — o wrapper da lista também tem id, mas
 * não se move quando entra conteúdo dentro dele. Três, porque a primeira
 * pode sumir (ex.: o próprio botão "carregar anteriores" é substituído).
 */
function referencias(container) {
    const topo = container.getBoundingClientRect().top;
    const refs = [];
    for (const el of container.querySelectorAll('[id]')) {
        if (el.querySelector('[id]')) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom > topo + 1) {
            refs.push({ id: el.id, deslocamento: r.top - topo });
            if (refs.length === 3) break;
        }
    }

    return refs;
}

function alvoInicial(container) {
    const hash = decodeURIComponent(window.location.hash || '').slice(1);
    if (hash) {
        const doHash = document.getElementById(hash);
        if (doHash && container.contains(doHash)) return doHash;
    }

    return container.querySelector('[data-champs-scroll-anchor]');
}

function posicionar(container) {
    const alvo = alvoInicial(container);
    container.scrollTop = alvo ? Math.max(0, topoRelativo(container, alvo) - 8) : container.scrollHeight;
}

function configurar(container) {
    if (container.__champsScrollAnchor) return;
    container.__champsScrollAnchor = true;

    let estado = { noFim: false, refs: [] };
    const lembrar = () => {
        estado = { noFim: estaNoFim(container), refs: referencias(container) };
    };

    posicionar(container);
    lembrar();

    let agendado = false;
    const reajustar = () => {
        if (agendado) return;
        agendado = true;
        requestAnimationFrame(() => {
            agendado = false;
            if (estado.noFim) {
                container.scrollTop = container.scrollHeight;
            } else {
                for (const ref of estado.refs) {
                    const el = document.getElementById(ref.id);
                    if (el && container.contains(el)) {
                        container.scrollTop += el.getBoundingClientRect().top - container.getBoundingClientRect().top - ref.deslocamento;
                        break;
                    }
                }
            }
            lembrar();
        });
    };

    container.addEventListener('scroll', lembrar, { passive: true });
    // imagem/vídeo que termina de carregar muda a altura: 'load' não sobe, mas captura pega
    container.addEventListener('load', reajustar, true);
    new MutationObserver(reajustar).observe(container, { childList: true, subtree: true });
}

export function initScrollAnchor(scope = document) {
    const root = scope?.querySelectorAll ? scope : document;
    const containers = [];
    if (root instanceof Element && root.matches('[data-champs-scroll="bottom"]')) containers.push(root);
    containers.push(...root.querySelectorAll('[data-champs-scroll="bottom"]'));
    containers.forEach(configurar);
}

export default {
    initScrollAnchor,
};
