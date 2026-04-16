// injeta o CSS do champs-core-js
(function installCoreStyles() {
    try {
        const href = new URL('../assets/loader.css', import.meta.url).href;

        const id = 'champs-core-css';
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    } catch (e) {
        // se não for ambiente de browser, ignora
    }
})();

// depois reexporta tudo do index padrão
export * from './index.js';
