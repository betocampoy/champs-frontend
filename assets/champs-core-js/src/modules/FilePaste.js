/**
 * FilePaste (Champs Core)
 *
 * Colar (Ctrl+V) uma imagem num campo de texto vira anexo num <input type="file">,
 * sem salvar o arquivo antes — ex.: print de tela no chat.
 *
 * Campo que recebe o Ctrl+V (textarea, input...):
 *  - data-champs-paste-file="#seletor-do-input-file"
 *    Só intercepta quando a área de transferência tem IMAGEM; texto continua
 *    colando normal. O arquivo recebe nome "print-AAAAMMDD-HHMMSS.png".
 *
 * <input type="file"> (opcional, vale também para arquivo escolhido na mão):
 *  - data-champs-file-preview="#seletor-do-container"
 *    Mostra miniatura (imagem) ou nome do arquivo, com botão para remover.
 *  - data-champs-file-remove-label="Remover"   (texto/aria do botão)
 *
 * Evento:
 *  - champs:file-pasted (bubbles, no input file) — detail: { file }
 */

function pad(n) {
    return String(n).padStart(2, '0');
}

function nomeDoPrint(file) {
    const d = new Date();
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');

    return `print-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${ext}`;
}

function imagemDaAreaDeTransferencia(event) {
    const items = Array.from(event.clipboardData?.items || []);
    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            return item.getAsFile();
        }
    }

    return null;
}

function formatarTamanho(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderPreview(input) {
    const selector = input.getAttribute('data-champs-file-preview');
    if (!selector) return;

    const container = document.querySelector(selector);
    if (!container) return;

    if (container.dataset.champsPreviewUrl) {
        URL.revokeObjectURL(container.dataset.champsPreviewUrl);
        delete container.dataset.champsPreviewUrl;
    }
    container.replaceChildren();

    const file = input.files?.[0];
    if (!file) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex align-items-center gap-2 border rounded p-1 mt-1 champs-file-preview';

    if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        container.dataset.champsPreviewUrl = url;
        const img = document.createElement('img');
        img.src = url;
        img.alt = file.name;
        img.style.maxHeight = '96px';
        img.style.maxWidth = '160px';
        img.className = 'rounded';
        wrapper.appendChild(img);
    } else {
        const icon = document.createElement('i');
        icon.className = 'bi bi-paperclip';
        wrapper.appendChild(icon);
    }

    const info = document.createElement('div');
    info.className = 'small text-muted flex-grow-1 text-truncate';
    info.textContent = `${file.name} · ${formatarTamanho(file.size)}`;
    wrapper.appendChild(info);

    const label = input.getAttribute('data-champs-file-remove-label') || 'Remover';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-sm btn-outline-secondary';
    remove.title = label;
    remove.setAttribute('aria-label', label);
    remove.innerHTML = '<i class="bi bi-x-lg"></i>';
    remove.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    wrapper.appendChild(remove);

    container.appendChild(wrapper);
}

export function handlePaste(event) {
    const field = event.target?.closest?.('[data-champs-paste-file]');
    if (!field) return;

    const file = imagemDaAreaDeTransferencia(event);
    if (!file) return; // texto: cola normal

    const input = document.querySelector(field.getAttribute('data-champs-paste-file'));
    if (!input || input.type !== 'file' || typeof DataTransfer === 'undefined') return;

    event.preventDefault();

    const nomeado = new File([file], nomeDoPrint(file), { type: file.type, lastModified: Date.now() });
    const transfer = new DataTransfer();
    transfer.items.add(nomeado);
    input.files = transfer.files;

    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new CustomEvent('champs:file-pasted', { bubbles: true, detail: { file: nomeado } }));
}

export function initFilePaste(scope = document) {
    if (document.documentElement.dataset.champsFilePasteBound === '1') return;
    document.documentElement.dataset.champsFilePasteBound = '1';

    // delegado: vale para campos que chegam depois por dom-patch
    document.addEventListener('paste', handlePaste);
    document.addEventListener('change', (event) => {
        const input = event.target;
        if (input instanceof HTMLInputElement && input.type === 'file' && input.hasAttribute('data-champs-file-preview')) {
            renderPreview(input);
        }
    });
}

export default {
    handlePaste,
    initFilePaste,
};
