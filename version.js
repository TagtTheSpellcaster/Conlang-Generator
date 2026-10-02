// Auxiliary UI loaders. The displayed application version is hardwired in index.html.
(() => {
    function loadErgativeUI() {
        if (document.querySelector('script[data-ergative-ui]')) return;
        const script = document.createElement('script');
        script.src = 'ergative_ui.js?v=0.11.29';
        script.dataset.ergativeUi = 'true';
        script.defer = true;
        document.head.appendChild(script);
    }

    function loadMorphologyExamplePatch() {
        if (document.querySelector('script[data-morphology-example-patch]')) return;
        const script = document.createElement('script');
        script.src = 'morphology_example_patch.js?v=0.11.29';
        script.dataset.morphologyExamplePatch = 'true';
        script.defer = true;
        document.head.appendChild(script);
    }

    function loadSentenceAuditPatch() {
        if (document.querySelector('script[data-sentence-audit-patch]')) return;
        const script = document.createElement('script');
        script.src = 'sentence_audit_patch.js?v=0.11.29';
        script.dataset.sentenceAuditPatch = 'true';
        script.defer = true;
        document.head.appendChild(script);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadErgativeUI();
            loadMorphologyExamplePatch();
            loadSentenceAuditPatch();
        }, { once: true });
    } else {
        loadErgativeUI();
        loadMorphologyExamplePatch();
        loadSentenceAuditPatch();
    }
})();
