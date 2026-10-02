/* ConLang Generator — morphology examples v0.11.26 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const VOWELS = {
        standard: ['a', 'e', 'i', 'o', 'u'],
        minimal: ['a', 'i', 'u'],
        extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
    };

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
        const set = new Set((vowels || VOWELS.standard).map(String));
        let count = 0, previous = false;
        for (const char of String(word || '').toLowerCase()) {
            const current = set.has(char);
            if (current && !previous) count++;
            previous = current;
        }
        return count;
    }

    function factory(config, purpose) {
        return window.ConlangPhonology?.createWordFactory?.({
            consonants: config.consonants,
            vowels: config.vowels,
            mean: 1,
            seed: `${config.seed}|morphology|${purpose}`
        }) || null;
    }

    function uniqueMarker(config, purpose, used) {
        const f = factory(config, purpose);
        if (!f) return '';
        const vowels = VOWELS[config.vowels] || VOWELS.standard;
        for (let i = 0; i < 300; i++) {
            const candidate = f({ short: true });
            if (candidate && countSyllables(candidate, vowels) <= 1 && !used.has(candidate)) {
                used.add(candidate);
                return candidate;
            }
        }
        return '';
    }

    function readConfig() {
        return {
            consonants: document.getElementById('consonants')?.value || 'european',
            vowels: document.getElementById('vowels')?.value || 'standard',
            seed: document.getElementById('seed')?.value || 'auto',
            plural: document.getElementById('plural')?.value || 'suffix',
            number: document.getElementById('number')?.value || 'singular-plural'
        };
    }

    function getMorphCard() {
        return document.querySelector('.morph-inventory');
    }

    function getExampleNoun(card) {
        const stem = card?.querySelector('.morph-noun-label .morph-stem');
        return stem?.textContent.trim() || '';
    }

    function getCaseEnding(row) {
        const ending = row.querySelector('.morph-ending');
        return ending?.textContent.trim() || '';
    }

    function getCaseRows(card, number) {
        const block = [...card.querySelectorAll('.morph-number-block')].find(b => norm(b.querySelector('.morph-number-title')?.textContent) === number);
        return block ? [...block.querySelectorAll('.morph-example-row')] : [];
    }

    function formHTML(stem, numberMarker, caseEnding, prefix) {
        const number = numberMarker ? `<span class="morph-number-ending">${esc(numberMarker)}</span>` : '';
        const ending = caseEnding ? `<span class="morph-ending">${esc(caseEnding)}</span>` : '<span class="morph-empty">∅</span>';
        if (prefix && numberMarker) return `<span class="morph-number-ending">${esc(numberMarker)}</span><span class="morph-stem">${esc(stem)}</span>${ending}`;
        return `<span class="morph-stem">${esc(stem)}</span>${number}${ending}`;
    }

    function ensureBlock(card, title, beforeNode = null) {
        let block = [...card.querySelectorAll('.morph-number-block')].find(b => norm(b.querySelector('.morph-number-title')?.textContent) === norm(title));
        if (block) return block;
        block = document.createElement('div');
        block.className = 'morph-number-block';
        block.style.marginTop = '12px';
        block.innerHTML = `<div class="morph-number-title" style="font-weight:700;color:var(--text);margin-bottom:4px">${esc(title)}</div><div class="morph-example-table"></div>`;
        if (beforeNode) card.insertBefore(block, beforeNode);
        else card.appendChild(block);
        return block;
    }

    function ensureHeader(block) {
        const table = block.querySelector('.morph-example-table');
        if (!table) return null;
        let head = table.querySelector('.morph-example-head');
        if (!head) {
            head = document.createElement('div');
            head.className = 'morph-example-head';
            head.style.cssText = 'display:grid;grid-template-columns:minmax(100px,1fr) minmax(180px,1.4fr) minmax(130px,1fr);gap:14px;padding:5px 0;border-bottom:1px solid var(--line);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em';
            head.innerHTML = '<span>Case</span><span>Example</span><span>Translation</span>';
            table.appendChild(head);
        }
        return table;
    }

    function buildNumberBlock(card, title, stem, marker, prefix, caseRows, sourceBlock) {
        const block = ensureBlock(card, title);
        const table = ensureHeader(block);
        table.querySelectorAll('.morph-example-row').forEach(r => r.remove());
        for (const source of caseRows) {
            const caseName = source.querySelector('.morph-case')?.textContent.trim() || '';
            const ending = getCaseEnding(source);
            const row = document.createElement('div');
            row.className = 'morph-example-row';
            row.style.cssText = 'display:grid;grid-template-columns:minmax(100px,1fr) minmax(180px,1.4fr) minmax(130px,1fr);gap:14px;align-items:center;padding:6px 0;border-bottom:1px solid #1d2739';
            row.innerHTML = `<span class="morph-case" style="color:var(--muted)">${esc(caseName)}</span><span class="morph-form" style="font-family:ui-monospace,monospace;font-size:14px">${formHTML(stem, marker, ending, prefix)}</span><span class="morph-translation" style="color:#d9e2ef">${esc(caseTranslation(caseName, title.toLowerCase()))}</span>`;
            table.appendChild(row);
        }
        return block;
    }

    function patchGrammaticalMorphemes() {
        const card = getMorphCard();
        if (!card) return;
        const stem = getExampleNoun(card);
        if (!stem) return;

        const config = readConfig();
        const singularRows = getCaseRows(card, 'singular');
        if (!singularRows.length) return;

        const used = new Set();
        singularRows.forEach(row => { const ending = getCaseEnding(row); if (ending) used.add(ending); });

        // Generate the productive number markers independently from the case endings.
        // They are always one syllable and are attached to the lexical stem.
        const pluralMarker = config.plural === 'none' || config.number === 'singular' ? '' : uniqueMarker(config, 'plural-marker', used);
        const dualMarker = config.number === 'singular-plural-dual' ? uniqueMarker(config, 'dual-marker', used) : '';

        const singularBlock = [...card.querySelectorAll('.morph-number-block')].find(b => norm(b.querySelector('.morph-number-title')?.textContent) === 'singular');
        const pluralBlock = [...card.querySelectorAll('.morph-number-block')].find(b => norm(b.querySelector('.morph-number-title')?.textContent) === 'plural');
        const dualBlock = [...card.querySelectorAll('.morph-number-block')].find(b => norm(b.querySelector('.morph-number-title')?.textContent) === 'dual');

        if (singularBlock) {
            singularBlock.querySelectorAll('.morph-example-row').forEach(row => {
                const ending = getCaseEnding(row);
                const form = row.querySelector('.morph-form');
                if (form) form.innerHTML = formHTML(stem, '', ending, false);
                const caseName = row.querySelector('.morph-case')?.textContent.trim() || '';
                const tr = row.querySelector('.morph-translation');
                if (tr) tr.textContent = caseTranslation(caseName, 'singular');
            });
        }

        if (pluralMarker) {
            const block = pluralBlock || ensureBlock(card, 'Plural');
            const sourceRows = singularRows;
            buildNumberBlock(card, 'Plural', stem, pluralMarker, config.plural === 'prefix', sourceRows, singularBlock);
        } else if (pluralBlock) {
            pluralBlock.remove();
        }

        if (dualMarker) {
            buildNumberBlock(card, 'Dual', stem, dualMarker, config.plural === 'prefix', singularRows, singularBlock);
        } else if (dualBlock) {
            dualBlock.remove();
        }

        let note = card.querySelector('.morph-number-marker-note');
        if (!note) {
            note = document.createElement('div');
            note.className = 'morph-note morph-number-marker-note';
            card.appendChild(note);
        }
        const markers = [];
        if (pluralMarker) markers.push(`Plural marker: <span class="morph-ending">${esc(pluralMarker)}</span>`);
        if (dualMarker) markers.push(`Dual marker: <span class="morph-ending">${esc(dualMarker)}</span>`);
        note.innerHTML = markers.length ? markers.join(' · ') : 'No productive number markers.';
    }

    function getGoodAdjective(engine) {
        const existing = engine?.getGenerated?.().find(e => norm(e.concept) === 'good' && (norm(e.word_type) === 'adjective' || norm(e.category).includes('adjective')));
        return existing?.conlang ? String(existing.conlang) : null;
    }

    function patchNominalCategories(engine) {
        const card = [...document.querySelectorAll('.card')].find(card => norm(card.querySelector('h3')?.textContent) === 'nominal categories');
        if (!card || !engine?.getGenerated) return;
        const adjectiveStem = getGoodAdjective(engine);
        if (!adjectiveStem) return;
        const label = [...card.querySelectorAll('.sub, .morph-adjective-label')].find(el => /^(example noun|example adjective):/i.test(el.textContent.trim()));
        if (label) label.innerHTML = `Example adjective: <strong>good</strong> — <span class="morph-stem">${esc(adjectiveStem)}</span>`;
    }

    function start() {
        let scheduled = false;
        const run = () => {
            scheduled = false;
            patchGrammaticalMorphemes();
            patchNominalCategories(window.ConlangEngine);
        };
        const schedule = () => {
            if (scheduled) return;
            scheduled = true;
            queueMicrotask(run);
        };
        const observer = new MutationObserver(schedule);
        observer.observe(document.body, { childList: true, subtree: true });
        document.getElementById('generate')?.addEventListener('click', schedule);
        document.getElementById('regenerate')?.addEventListener('click', schedule);
        document.getElementById('number')?.addEventListener('change', schedule);
        document.getElementById('plural')?.addEventListener('change', schedule);
        run();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
