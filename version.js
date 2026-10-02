window.CONLANG_GENERATOR_VERSION = '0.11.2';

(() => {
    function renderVersionPill() {
        const headerTools = document.querySelector('.header-tools');
        if (!headerTools) return;

        let pill = document.getElementById('app-version');
        if (!pill) {
            pill = document.createElement('span');
            pill.id = 'app-version';
            pill.className = 'chip';
            headerTools.appendChild(pill);
        }

        pill.textContent = `Conlang Generator v${window.CONLANG_GENERATOR_VERSION}`;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderVersionPill, { once: true });
    } else {
        renderVersionPill();
    }
})();
