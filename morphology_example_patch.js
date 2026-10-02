/* ConLang Generator — fixed morphological example noun v0.11.17 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
            let translation = 'stone';
            if (label === 'plural') {
                base = pluralMode === 'prefix' ? pluralMarker + stem : stem + pluralMarker;
                translation = 'stones';
            } else if (label === 'dual') {
                translation = 'two stones';
            }

            for (const form of block.querySelectorAll('.morph-form')) {
                const ending = form.querySelector('.morph-ending');
                form.innerHTML = `${esc(base)}${ending ? ending.outerHTML : '<span class="morph-empty">∅</span>'}`;
            }
            for (const cell of block.querySelectorAll('.morph-translation')) cell.textContent = translation;
        }
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector('.morph-inventory')) patchMorphologyExample();
    });

    function start() {
        observer.observe(document.body, { childList: true, subtree: true });
        patchMorphologyExample();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
