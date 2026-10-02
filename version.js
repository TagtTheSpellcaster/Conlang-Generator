// Auxiliary UI loaders. The displayed application version is hardwired in index.html.
(() => {
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
        script.src = 'morphology_example_patch.js?v=0.11.24';
        script.dataset.morphologyExamplePatch = 'true';
        script.defer = true;
        document.head.appendChild(script);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadErgativeUI();
            loadMorphologyExamplePatch();
        }, { once: true });
    } else {
        loadErgativeUI();
        loadMorphologyExamplePatch();
    }
})();
