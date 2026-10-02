/* ConLang Generator — fixed morphological example noun v0.11.20 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const CASE_TRANSLATIONS = Object.freeze({
        nominative: 'stone',
        accusative: 'stone',
        genitive: 'of stone',
        dative: 'to stone',
        locative: 'at stone',
        ablative: 'from stone',
        instrumental: 'with stone',
        absolutive: 'stone',
        ergative: 'by stone'
    });

    function caseTranslation(caseName, numberLabel) {
        const base = CASE_TRANSLATIONS[norm(caseName)] || 'stone';
        if (numberLabel === 'plural') return base.replace(/\bstone\b/g, 'stones');
        if (numberLabel === 'dual') return base.replace(/\bstone\b/g, 'two stones');
        return base;
    }

    function patchMorphologyExample() {
        const card = document.querySelector('.morph-inventory');
        const engine = window.ConlangEngine;
        if (!card || !engine?.getGenerated) return;

        const stone = engine.getGenerated().find(e => norm(e.concept) === 'stone');
        if (!stone?.conlang) return;

        const stem = String(stone.conlang);
        const nounLabel = card.querySelector('.morph-noun-label');
        if (nounLabel) nounLabel.innerHTML = `Example noun: <strong>stone</strong> — <span class="morph-stem">${esc(stem)}</span>`;

        const pluralMode = document.getElementById('plural')?.value || 'suffix';
        let pluralMarker = '';
        const pluralBlock = [...card.querySelectorAll('.morph-number-block')]
            .find(block => block.querySelector('.morph-number-title')?.textContent.trim() === 'Plural');
        if (pluralBlock) {
            const first = pluralBlock.querySelector('.morph-form');
            if (first) {
                const clone = first.cloneNode(true);
                clone.querySelector('.morph-ending')?.remove();
                const pluralBase = clone.textContent.trim();
                pluralMarker = pluralMode === 'prefix'
                    ? (pluralBase.endsWith(stem) ? pluralBase.slice(0, -stem.length) : '')
                    : (pluralBase.startsWith(stem) ? pluralBase.slice(stem.length) : '');
            }
        }

        for (const block of card.querySelectorAll('.morph-number-block')) {
            const label = block.querySelector('.morph-number-title')?.textContent.trim().toLowerCase() || '';
            let base = stem;
            if (label === 'plural') {
                base = pluralMode === 'prefix' ? pluralMarker + stem : stem + pluralMarker;
            } else if (label === 'dual') {
                const dualMode = document.getElementById('dual')?.value || 'suffix';
                const dualMarker = card.dataset.dualMarker || '';
                base = dualMode === 'prefix' ? dualMarker + stem : stem + dualMarker;
            }

            for (const form of block.querySelectorAll('.morph-form')) {
                const ending = form.querySelector('.morph-ending');
                form.innerHTML = `${esc(base)}${ending ? ending.outerHTML : '<span class="morph-empty">∅</span>'}`;
            }
            for (const row of block.querySelectorAll('.morph-example-row')) {
                const caseName = row.querySelector('.morph-case')?.textContent.trim() || '';
                const translation = row.querySelector('.morph-translation');
                if (translation) translation.textContent = caseTranslation(caseName, label);
            }
        }
    }

    let observer;
    function start() {
        observer = new MutationObserver(() => {
            observer.disconnect();
            try {
                if (document.querySelector('.morph-inventory')) patchMorphologyExample();
            } finally {
                observer.observe(document.body, { childList: true, subtree: true });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        patchMorphologyExample();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
