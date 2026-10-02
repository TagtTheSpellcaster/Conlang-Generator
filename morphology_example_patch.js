/* ConLang Generator — morphology examples v0.11.30 */
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
        const gender = document.getElementById('gender')?.value || 'masculine-feminine';
        const number = document.getElementById('number')?.value || 'singular-plural';
        const genders = gender === 'masculine-feminine-neuter' ? ['masculine', 'feminine', 'neuter'] : ['masculine', 'feminine'];
        const numbers = number === 'singular-plural-dual' ? ['singular', 'plural', 'dual'] : number === 'singular-plural' ? ['singular', 'plural'] : ['singular'];
        const genderRows = genders.map(x => `<div class="kv"><b>${esc(x)}</b><span><span class="morph-stem">${esc(adjective.conlang)}</span> + gender ending</span></div>`).join('');
        const numberRows = numbers.map(x => `<div class="kv"><b>${esc(x)}</b><span><span class="morph-stem">${esc(adjective.conlang)}</span> + number ending</span></div>`).join('');
        card.innerHTML = `<h3>Nominal categories</h3><div class="sub morph-adjective-label">Example adjective: <strong>good</strong> — <span class="morph-stem">${esc(adjective.conlang)}</span></div><div class="sub" style="margin-top:10px">Gender</div>${genderRows}<div class="sub" style="margin-top:10px">Number</div>${numberRows}`;
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
