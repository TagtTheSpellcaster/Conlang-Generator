/* ConLang Generator — morphology examples v0.11.31 */
(() => {
    'use strict';
    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    function updateTranslations() {
        document.querySelectorAll('.morph-number-block').forEach(block => {
            const title = norm(block.querySelector('.morph-number-title')?.textContent || 'singular');
            const number = title === 'plural' ? 'plural' : title === 'dual' ? 'dual' : 'singular';
            block.querySelectorAll('.morph-example-row').forEach(row => {
                const tr = row.querySelector('.morph-translation');
                const caseName = row.querySelector('.morph-case')?.textContent.trim() || '';
                if (tr) tr.textContent = caseTranslation(caseName, number);
            });
        });
    }
    function generatedEntries() { return window.ConlangEngine?.getGenerated?.() || []; }
    function findGood() {
        return generatedEntries().find(e => norm(e?.concept) === 'good' && norm(e?.word_type) === 'adjective')
            || generatedEntries().find(e => norm(e?.concept) === 'good' && norm(e?.category).includes('adjective'))
            || null;
    }
    function syllables(word, vowels) {
        const set = new Set(vowels);
        let n = 0, previous = false;
        for (const ch of String(word || '').toLowerCase()) {
            const v = set.has(ch);
            if (v && !previous) n++;
            previous = v;
        }
        return n;
    }
    function adjectiveMorphemes() {
        const state = window.ConlangEngine?.getGeneratedState?.() || {};
        const m = state.morphemes || window.ConlangEngine?.getMorphemes?.() || {};
        const config = state.config || {};
        const vowels = {
            standard: ['a', 'e', 'i', 'o', 'u'],
            minimal: ['a', 'i', 'u'],
            extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
        }[config.vowels || 'standard'] || ['a', 'e', 'i', 'o', 'u'];
        const genders = (document.getElementById('gender')?.value || 'masculine-feminine') === 'masculine-feminine-neuter'
            ? ['masculine', 'feminine', 'neuter'] : ['masculine', 'feminine'];
        const existing = m.genderEndings || {};
        const endings = { ...existing };
        if (!window.ConlangPhonology?.createWordFactory) return { ...m, genderEndings: endings };
        const used = new Set([
            ...Object.values(m.caseEndings || {}).filter(Boolean),
            ...Object.values(m.numberMarkers || {}).filter(Boolean),
            ...Object.values(endings).filter(Boolean)
        ]);
        const factory = window.ConlangPhonology.createWordFactory({
            consonants: config.consonants || 'european',
            vowels: config.vowels || 'standard',
            mean: 1,
            seed: `${config.seed || 'auto'}|morphology|gender-endings`
        });
        for (const gender of genders) {
            if (endings[gender]) continue;
            for (let guard = 0; guard < 200; guard++) {
                const candidate = factory({ short: true });
                if (candidate && syllables(candidate, vowels) <= 1 && !used.has(candidate)) {
                    endings[gender] = candidate;
                    used.add(candidate);
                    break;
                }
            }
        }
        return { ...m, genderEndings: endings };
    }
    function ensureNominalCategories() {
        const grid = document.querySelector('#generation-output .grid');
        const adjective = findGood();
        if (!grid || !adjective?.conlang) return;
        let card = [...grid.querySelectorAll('.card')].find(c => norm(c.querySelector('h3')?.textContent) === 'nominal categories');
        if (!card) {
            card = document.createElement('div');
            card.className = 'card nominal-categories';
            grid.appendChild(card);
        }
        const genderMode = document.getElementById('gender')?.value || 'masculine-feminine';
        const numberMode = document.getElementById('number')?.value || 'singular-plural';
        const genders = genderMode === 'masculine-feminine-neuter' ? ['masculine', 'feminine', 'neuter'] : ['masculine', 'feminine'];
        const numbers = numberMode === 'singular-plural-dual' ? ['singular', 'plural', 'dual'] : numberMode === 'singular-plural' ? ['singular', 'plural'] : ['singular'];
        const m = adjectiveMorphemes();
        const genderEndings = m.genderEndings || {};
        const numberMarkers = m.numberMarkers || {};
        const caseEndings = m.caseEndings || {};
        const cases = Array.isArray(m.cases) ? m.cases : [];
        const numberSuffix = n => n === 'plural' ? (numberMarkers.plural || '') : n === 'dual' ? (numberMarkers.dual || '') : '';
        const form = (g, n, c) => {
            const ge = genderEndings[g] || '';
            const ne = numberSuffix(n);
            const ce = caseEndings[c] || '';
            return `<span class="morph-stem">${esc(adjective.conlang)}</span>`
                + (ge ? `<span class="morph-ending">${esc(ge)}</span>` : '')
                + (ne ? `<span class="morph-ending">${esc(ne)}</span>` : '')
                + (ce ? `<span class="morph-ending">${esc(ce)}</span>` : (cases.length ? '<span class="morph-empty">∅</span>' : ''));
        };
        const rows = [];
        for (const g of genders) for (const n of numbers) for (const c of cases) {
            rows.push(`<div class="morph-example-row" style="display:grid;grid-template-columns:minmax(90px,.8fr) minmax(110px,1fr) minmax(180px,1.5fr);gap:14px;align-items:center;padding:6px 0;border-bottom:1px solid #1d2739"><span style="color:var(--muted)">${esc(g)}</span><span style="color:var(--muted)">${esc(n)} · ${esc(c)}</span><span class="morph-form" style="font-family:ui-monospace,monospace;font-size:14px">${form(g, n, c)}</span></div>`);
        }
        card.innerHTML = `<h3>Nominal categories</h3><div class="sub morph-adjective-label">Example adjective: <strong>good</strong> — <span class="morph-stem">${esc(adjective.conlang)}</span></div><div class="sub" style="margin-top:10px">Adjective declension</div><div class="morph-example-table"><div class="morph-example-head" style="display:grid;grid-template-columns:minmax(90px,.8fr) minmax(110px,1fr) minmax(180px,1.5fr);gap:14px;padding:5px 0;border-bottom:1px solid var(--line);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em"><span>Gender</span><span>Number · Case</span><span>Example</span></div>${rows.join('')}</div>`;
    }
    function run() { updateTranslations(); ensureNominalCategories(); }
    function start() {
        document.getElementById('generate')?.addEventListener('click', () => queueMicrotask(run));
        document.getElementById('regenerate')?.addEventListener('click', () => queueMicrotask(run));
        document.getElementById('gender')?.addEventListener('change', () => queueMicrotask(run));
        document.getElementById('number')?.addEventListener('change', () => queueMicrotask(run));
        run();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
