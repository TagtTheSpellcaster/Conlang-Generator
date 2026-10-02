/* ConLang Generator — fixed morphological examples v0.11.23 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const CASE_TRANSLATIONS = Object.freeze({
        nominative: 'forest',
        accusative: 'forest',
        genitive: 'of the forest',
        dative: 'to the forest',
        locative: 'in the forest',
        ablative: 'from the forest',
        instrumental: 'through the forest',
        absolutive: 'forest',
        ergative: 'by the forest'
    });

    function caseTranslation(caseName, numberLabel) {
        const base = CASE_TRANSLATIONS[norm(caseName)] || 'forest';
        if (numberLabel === 'plural') return base.replace(/\bforest\b/g, 'forests');
        if (numberLabel === 'dual') return base.replace(/\bforest\b/g, 'two forests');
        return base;
    }

    function countSyllables(word, vowels) {
        const set = new Set((vowels || ['a', 'e', 'i', 'o', 'u']).map(String));
        let count = 0;
        let previous = false;
        for (const char of String(word || '').toLowerCase()) {
            const current = set.has(char);
            if (current && !previous) count++;
            previous = current;
        }
        return count;
    }

    function getGoodAdjective(engine) {
        const list = engine.getGenerated();
        const existing = list.find(e => norm(e.concept) === 'good' && (norm(e.word_type) === 'adjective' || norm(e.category).includes('adjective')));
        if (existing?.conlang) return { concept: 'good', conlang: String(existing.conlang) };

        const config = {
            consonants: document.getElementById('consonants')?.value || 'european',
            vowels: document.getElementById('vowels')?.value || 'standard',
            mean: Number(document.getElementById('mean')?.value) || 2.2,
            seed: document.getElementById('seed')?.value || 'auto'
        };
        const vowels = { standard: ['a', 'e', 'i', 'o', 'u'], minimal: ['a', 'i', 'u'], extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ'] }[config.vowels] || ['a', 'e', 'i', 'o', 'u'];
        const factory = window.ConlangPhonology?.createWordFactory?.({ ...config, seed: `${config.seed}|nominal|good` });
        if (!factory) return null;
        const used = new Set(list.map(e => String(e.conlang || '')));
        for (let guard = 0; guard < 100; guard++) {
            const word = factory({ short: false });
            if (word && !used.has(word) && countSyllables(word, vowels) >= 1) return { concept: 'good', conlang: word };
        }
        return null;
    }

    function patchNominalCategories(engine) {
        const card = [...document.querySelectorAll('.card')].find(card => norm(card.querySelector('h3')?.textContent) === 'nominal categories');
        if (!card) return;
        const adjective = getGoodAdjective(engine);
        if (!adjective) return;

        const label = [...card.querySelectorAll('.sub, .morph-noun-label, .morph-adjective-label')]
            .find(el => /^(example noun|example adjective):/i.test(el.textContent.trim()));
        const html = `Example adjective: <strong>good</strong> — <span class="morph-stem">${esc(adjective.conlang)}</span>`;
        if (label) {
            label.classList.add('morph-adjective-label');
            label.innerHTML = html;
        } else {
            const heading = card.querySelector('h3');
            const inserted = document.createElement('div');
            inserted.className = 'sub morph-adjective-label';
            inserted.innerHTML = html;
            heading?.insertAdjacentElement('afterend', inserted);
        }
    }

    function patchMorphologyExample() {
        const card = document.querySelector('.morph-inventory');
        const engine = window.ConlangEngine;
        if (!card || !engine?.getGenerated) return;

        const forest = engine.getGenerated().find(e => norm(e.concept) === 'forest');
        if (!forest?.conlang) return;

        const stem = String(forest.conlang);
        const nounLabel = card.querySelector('.morph-noun-label');
        if (nounLabel) nounLabel.innerHTML = `Example noun: <strong>forest</strong> — <span class="morph-stem">${esc(stem)}</span>`;

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

        patchNominalCategories(engine);
    }

    let observer;
    function start() {
        observer = new MutationObserver(() => {
            observer.disconnect();
            try {
                if (document.querySelector('.morph-inventory')) patchMorphologyExample();
                else patchNominalCategories(window.ConlangEngine);
            } finally {
                observer.observe(document.body, { childList: true, subtree: true });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        patchMorphologyExample();
        patchNominalCategories(window.ConlangEngine);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
