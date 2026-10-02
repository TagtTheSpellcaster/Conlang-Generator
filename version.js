window.CONLANG_GENERATOR_VERSION = '0.11.13';

(() => {
    function renderVersionPill() {
        const pill = document.getElementById('app-version');
        if (!pill) return;
        pill.textContent = `v${window.CONLANG_GENERATOR_VERSION}`;
    }

    function loadErgativeUI() {
        if (document.querySelector('script[data-ergative-ui]')) return;
        const script = document.createElement('script');
        script.src = 'ergative_ui.js';
        script.dataset.ergativeUi = 'true';
        script.defer = true;
        document.head.appendChild(script);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderVersionPill();
            loadErgativeUI();
        }, { once: true });
    } else {
        renderVersionPill();
        loadErgativeUI();
    }
})();
