window.CONLANG_GENERATOR_VERSION = '0.11.4';

(() => {
    function renderVersionPill() {
        const pill = document.getElementById('app-version');
        if (!pill) return;

        pill.textContent = `v${window.CONLANG_GENERATOR_VERSION}`;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderVersionPill, { once: true });
    } else {
        renderVersionPill();
    }
})();