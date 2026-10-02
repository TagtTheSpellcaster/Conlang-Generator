window.CONLANG_GENERATOR_VERSION = '0.11.19';

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

    function loadMorphologyExamplePatch() {
        if (document.querySelector('script[data-morphology-example-patch]')) return;
        const script = document.createElement('script');
        script.src = 'morphology_example_patch.js';
        script.dataset.morphologyExamplePatch = 'true';
        script.defer = true;
        document.head.appendChild(script);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderVersionPill();
            loadErgativeUI();
            loadMorphologyExamplePatch();
        }, { once: true });
    } else {
        renderVersionPill();
        loadErgativeUI();
        loadMorphologyExamplePatch();
    }
})();
