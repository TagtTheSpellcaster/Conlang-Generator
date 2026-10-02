/* ConLang Generator — fixed morphological examples v0.11.25 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const vowelsFor = key => ({ standard: ['a', 'e', 'i', 'o', 'u'], minimal: ['a', 'i', 'u'], extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ'] }[key] || ['a', 'e', 'i', 'o', 'u']);

    const CASE_TRANSLATIONS = Object.freeze({
        nominative: 'forest', accusative: 'forest', genitive: 'of the forest', dative: 'to the forest',
        locative: 'in the forest', ablative: 'from the forest', instrumental: 'through the forest',
        absolutive: 'forest', ergative: 'by the forest'
    });

    function caseTranslation(caseName, numberLabel) {
        const base = CASE_TRANSLATIONS[norm(caseName)] || 'forest';
        if (numberLabel === 'plural') return base.replace(/\bforest\b/g, 'forests');
        if (numberLabel === 'dual') return base.replace(/\bforest\b/g, 'two forests');
        return base;
    }

    function countSyllables(word, vowels) {
        const set = new Set((vowels || ['a', 'e', 'i', 'o', 'u']).map(String));
        let count = 0, previous = false;
        for (const char of String(word || '').toLowerCase()) {
            const current = set.has(char);
            if (current && !previous) count++;
            previous = current;
        }
        return count;
    }

    function getGoodAdjective(engine) {
        const existing = engine.getGenerated().find(e => norm(e.concept) === 'good' && (norm(e.word_type) === 'adjective' || norm(e.category).includes('adjective')));
        return existing?.conlang ? { concept: 'good', conlang: String(existing.conlang) } : null;
    }

    function createFactory(config, suffix) {
        return window.ConlangPhonology?.createWordFactory?.({ consonants: config.consonants, vowels: config.vowels, mean: 1, seed: `${config.seed}|${suffix}` }) || null;
    }

    function generateUniqueEnding(factory, vowels, used) {
        if (!factory) return '';
        for (let guard = 0; guard < 200; guard++) {
            const candidate = factory({ short: true });
            if (candidate && countSyllables(candidate, vowels) <= 1 && !used.has(candidate)) { used.add(candidate); return candidate; }
        }
        return '';
    }

    function extractCaseEndings() {
        const used = new Set();
        document.querySelectorAll('.morph-inventory .morph-ending').forEach(el => { const value = el.textContent.trim(); if (value) used.add(value); });
        return used;
    }

    function extractGeneratedPluralMarker(stem, mode) {
        if (mode === 'none') return '';
        const blocks = [...document.querySelectorAll('.morph-inventory .morph-number-block')];
        const pluralBlock = blocks.find(block => norm(block.querySelector('.morph-number-title')?.textContent) === 'plural');
        const singularBlock = blocks.find(block => norm(block.querySelector('.morph-number-title')?.textContent) === 'singular');
        const pluralForm = pluralBlock?.querySelector('.morph-example-row .morph-form');
        const singularForm = singularBlock?.querySelector('.morph-example-row .morph-form');
        if (!pluralForm || !singularForm) return '';
        const plural = pluralForm.textContent.replace(/∅/g, '').trim();
        const singular = singularForm.textContent.replace(/∅/g, '').trim();
        if (mode === 'prefix' && plural.endsWith(stem)) return plural.slice(0, -stem.length);
        if (mode !== 'prefix' && plural.startsWith(stem)) return plural.slice(stem.length);
        if (singular && mode !== 'prefix' && plural.startsWith(singular)) return plural.slice(singular.length);
        return '';
    }

    function generateNumberMarkers(config, stem) {
        const result = { plural: extractGeneratedPluralMarker(stem, config.plural), dual: '' };
        if (!config) return result;
        const factory = createFactory(config, 'morphology|number|dual');
        if (config.number !== 'singular-plural-dual' || !factory) return result;
        const used = extractCaseEndings();
        if (result.plural) used.add(result.plural);
        result.dual = generateUniqueEnding(factory, vowelsFor(config.vowels), used);
        return result;
    }

    function formHtml(stem, ending) {
        return `<span class="stem">${esc(stem)}</span>${ending ? `<span class="ending">${esc(ending)}</span>` : '<span class="zero">∅</span>'}`;
    }

    function row(label, stem, ending, description = '') {
        const el = document.createElement('div');
        el.className = 'morph-category-row';
        el.innerHTML = `<span class="label">${esc(label)}</span><span class="morph-form">${formHtml(stem, ending)}</span><span class="label">${esc(description)}</span>`;
        return el;
    }

    function ensureSection(card, title) {
        return [...card.querySelectorAll('.morph-category-section')].find(section => norm(section.querySelector('.morph-category-title')?.textContent) === norm(title));
    }

    function patchNominalCategories(engine) {
        const card = [...document.querySelectorAll('.card')].find(card => norm(card.querySelector('h3')?.textContent) === 'nominal categories');
        if (!card || !engine?.getGenerated) return;
        const adjective = getGoodAdjective(engine);
        if (!adjective) return;
        const config = {
            consonants: document.getElementById('consonants')?.value || 'european',
            vowels: document.getElementById('vowels')?.value || 'standard',
            seed: document.getElementById('seed')?.value || 'auto',
            plural: document.getElementById('plural')?.value || 'suffix',
            gender: document.getElementById('gender')?.value || 'none',
            number: document.getElementById('number')?.value || 'singular-plural'
        };
        const adjectiveStem = adjective.conlang;
        const label = [...card.querySelectorAll('.sub, .morph-noun-label, .morph-adjective-label')].find(el => /^(example noun|example adjective):/i.test(el.textContent.trim()));
        if (label) label.innerHTML = `Example adjective: <strong>good</strong> — <span class="morph-stem">${esc(adjectiveStem)}</span>`;

        const genderValues = { none: [], 'masculine-feminine': ['masculine', 'feminine'], 'masculine-feminine-neuter': ['masculine', 'feminine', 'neuter'] }[config.gender] || [];
        let genderSection = ensureSection(card, 'gender');
        if (genderValues.length) {
            if (!genderSection) {
                genderSection = document.createElement('div');
                genderSection.className = 'morph-category-section';
                genderSection.innerHTML = '<div class="morph-category-title">Gender</div>';
                const numberSection = ensureSection(card, 'number');
                card.querySelector('h3')?.insertAdjacentElement('afterend', genderSection);
                if (numberSection) card.insertBefore(genderSection, numberSection);
            }
            const used = new Set();
            const factory = createFactory(config, 'morphology|nominal-categories');
            const vowels = vowelsFor(config.vowels);
            const existingRows = [...genderSection.querySelectorAll('.morph-category-row')];
            genderSection.querySelectorAll('.morph-category-row').forEach(r => r.remove());
            for (const gender of genderValues) {
                const old = existingRows.find(r => norm(r.querySelector('.label')?.textContent) === gender);
                const ending = old?.querySelector('.ending')?.textContent.trim() || generateUniqueEnding(factory, vowels, used);
                genderSection.appendChild(row(gender, adjectiveStem, ending, 'stem + gender ending'));
            }
        } else if (genderSection) genderSection.remove();

        let numberSection = ensureSection(card, 'number');
        if (!numberSection) {
            numberSection = document.createElement('div');
            numberSection.className = 'morph-category-section';
            numberSection.innerHTML = '<div class="morph-category-title">Number</div>';
            card.appendChild(numberSection);
        }
        const markers = generateNumberMarkers(config, document.querySelector('.morph-inventory .morph-noun-label .morph-stem')?.textContent.trim() || '');
        numberSection.querySelectorAll('.morph-category-row').forEach(r => r.remove());
        numberSection.appendChild(row('singular', adjectiveStem, '', 'stem + number ending'));
        if (config.plural !== 'none') numberSection.appendChild(row('plural', adjectiveStem, markers.plural, 'stem + number ending'));
        if (config.number === 'singular-plural-dual') numberSection.appendChild(row('dual', adjectiveStem, markers.dual, 'stem + number ending'));
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
        for (const block of card.querySelectorAll('.morph-number-block')) {
            const label = block.querySelector('.morph-number-title')?.textContent.trim().toLowerCase() || '';
            for (const form of block.querySelectorAll('.morph-form')) {
                const ending = form.querySelector('.morph-ending');
                form.innerHTML = `${esc(stem)}${ending ? ending.outerHTML : '<span class="morph-empty">∅</span>'}`;
            }
            for (const rowEl of block.querySelectorAll('.morph-example-row')) {
                const caseName = rowEl.querySelector('.morph-case')?.textContent.trim() || '';
                const translation = rowEl.querySelector('.morph-translation');
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
