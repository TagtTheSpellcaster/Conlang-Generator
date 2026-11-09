// Generator page controller: reads the form, calls the pure engine, renders the result.
import { VERSION } from '../version.js';
import { generateLanguage } from '../engine.js';
import { assertVocabulary } from '../lexicon/schema.js';
import { esc, uniq } from '../core/text.js';
import { resultHtml, samplesHtml, lexiconHtml, dictionaryHtml, lexiconRows, phonotacticInfoHtml } from './render.js';

const $ = id => document.getElementById(id);
const FILTERS = ['region', 'culture', 'biome', 'era', 'tags'];
const say = text => { if ($('message')) $('message').textContent = text; };

let vocabulary = [];
let templates = [];
let current = null;          // last generated language
let importedLexicon = null;  // rows imported for re-export only

const selected = id => { const e = $(id); return e ? [...e.selectedOptions].map(o => o.value).filter(Boolean) : []; };

function readInput() {
    const v = id => $(id)?.value;
    return {
        region: selected('region'), culture: selected('culture'), biome: selected('biome'), era: selected('era'), tags: selected('tags'),
        vowels: v('vowels'), consonants: v('consonants'), mean: v('mean'), seed: $('seed')?.value.trim(),
        order: v('word-order'), morphology: v('morphology'), articles: v('articles'), plural: v('plural'), number: v('number'),
        gender: v('gender'), relations: v('relations'), caseSystem: v('case-system'), adjPosition: v('adj-position')
    };
}

function populateFilters() {
    for (const id of FILTERS) {
        const el = $(id);
        if (!el) continue;
        const values = uniq(vocabulary.flatMap(e => e[id])).sort((a, b) => a.localeCompare(b));
        el.innerHTML = '<option value="">Any</option>' + values.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
    }
}

function renderDictionary() {
    if (!current) return;
    $('dictionary-output').innerHTML = dictionaryHtml(current.lexicon, $('dictionary-direction')?.value || 'conlang-en', $('dictionary-search')?.value);
}

function render(lang) {
    const box = $('generation-output');
    box.className = 'result';
    box.innerHTML = resultHtml(lang);
    $('keep-seed')?.addEventListener('click', () => { $('seed').value = lang.spec.seed; say('Seed copied into the Seed field.'); });
    const samples = $('sample-sentences-output');
    samples.className = '';
    samples.innerHTML = samplesHtml(lang);
    const lex = $('lexicon-output');
    lex.className = 'card';
    lex.innerHTML = lexiconHtml(lang.lexicon);
    renderDictionary();
}

function generate() {
    try {
        current = generateLanguage(readInput(), vocabulary, templates);
        render(current);
        say(`Generated ${current.lexicon.length} entries.`);
    } catch (e) {
        console.error(e);
        say('Generation error: ' + e.message);
        const box = $('generation-output');
        box.className = 'result';
        box.innerHTML = `<div class="error">${esc(e.message)}</div>`;
    }
}

function randomize() {
    for (const id of FILTERS) {
        const e = $(id);
        if (e && e.options.length > 1) e.value = [...e.options].slice(1)[Math.floor(Math.random() * (e.options.length - 1))].value;
    }
    for (const id of ['vowels', 'consonants', 'word-order', 'morphology', 'adj-position', 'articles', 'plural', 'number', 'gender', 'relations']) {
        const e = $(id);
        if (e?.options.length) e.value = e.options[Math.floor(Math.random() * e.options.length)].value;
    }
    $('relations')?.dispatchEvent(new Event('change'));
    if ($('mean')) { $('mean').value = (1 + Math.random() * 2.5).toFixed(1); $('mean').dispatchEvent(new Event('input')); }
    if ($('seed')) $('seed').value = 'auto';
    $('consonants')?.dispatchEvent(new Event('change'));
}

const PRESETS = {
    historical: { era: 'medieval' }, fantasy: { tags: 'fantasy' }, modern: { era: 'modern' }, scifi: { tags: 'sci-fi' }
};

function preset(type) {
    const p = PRESETS[type];
    if (!p) return;
    for (const id of FILTERS) if ($(id)) $(id).value = p[id] || '';
}

function installMeanSlider() {
    const mean = $('mean');
    if (!mean) return;
    mean.type = 'range'; mean.min = '1'; mean.max = '5'; mean.step = '0.1';
    const label = mean.closest('.field')?.querySelector('label[for="mean"]');
    if (label && !label.querySelector('.mean-value')) {
        const value = document.createElement('span');
        value.className = 'mean-value';
        value.style.cssText = 'float:right;color:var(--text);font-variant-numeric:tabular-nums';
        label.appendChild(value);
    }
    const update = () => {
        const display = label?.querySelector('.mean-value');
        if (display) display.textContent = (Number(mean.value) || 2.2).toFixed(1);
    };
    mean.addEventListener('input', update);
    update();
}

function installPhonotacticInfo() {
    const select = $('consonants');
    const grid = select?.closest('.compact-grid');
    if (!select || !grid) return;
    const label = select.closest('.field')?.querySelector('label[for="consonants"]');
    if (label) label.textContent = 'Phonotactic pattern';
    const info = document.createElement('div');
    info.className = 'phonotactic-info';
    info.style.cssText = 'grid-column:1 / -1;margin-top:0;padding-top:8px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;line-height:1.45';
    const seedField = [...grid.querySelectorAll(':scope > .field')].find(f => f.querySelector('#seed'));
    (seedField || grid.lastElementChild).insertAdjacentElement('afterend', info);
    const refresh = () => { info.innerHTML = phonotacticInfoHtml(select.value, Number($('mean')?.value) || 2.2); };
    select.addEventListener('change', refresh);
    $('mean')?.addEventListener('input', refresh);
    refresh();
}

const CASE_SYSTEM_OPTIONS = {
    accusative: [['minimal', 'Minimal — nominative / accusative'], ['moderate', 'Moderate — nominative / accusative / genitive / dative'], ['extensive', 'Extensive — nominative / accusative / genitive / dative / locative / ablative / instrumental']],
    ergative: [['minimal', 'Minimal — absolutive / ergative'], ['moderate', 'Moderate — absolutive / ergative / genitive / dative'], ['extensive', 'Extensive — absolutive / ergative / genitive / dative / locative / ablative / instrumental']]
};

function installRelationControls() {
    const relations = $('relations'), caseSystem = $('case-system');
    if (!relations || !caseSystem) return;
    const sync = () => {
        $('case-options')?.classList.toggle('visible', ['cases', 'mixed', 'ergative'].includes(relations.value));
        const options = CASE_SYSTEM_OPTIONS[relations.value === 'ergative' ? 'ergative' : 'accusative'];
        const keep = caseSystem.value;
        caseSystem.innerHTML = options.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
        caseSystem.value = options.some(([v]) => v === keep) ? keep : 'moderate';
    };
    relations.addEventListener('change', sync);
    sync();
}

function installTabs() {
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
        $(tab.dataset.tab)?.classList.add('active');
    }));
}

function installVocabularyTools() {
    $('open-vocabulary')?.addEventListener('click', () => { window.location.href = 'vocabulary.html'; });
    const rows = () => importedLexicon || (current ? lexiconRows(current.lexicon) : []);
    $('copy-vocabulary')?.addEventListener('click', async () => {
        const r = current ? lexiconRows(current.lexicon) : [];
        if (!r.length) return say('Generate a language before copying its vocabulary.');
        const text = r.map(x => [x.word, x.english, x.meta].filter(Boolean).join('\t')).join('\n');
        try { await navigator.clipboard.writeText(text); } catch {
            const area = Object.assign(document.createElement('textarea'), { value: text });
            area.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
        }
        say(`Copied ${r.length} vocabulary entries to the clipboard.`);
        const b = $('copy-vocabulary'); b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy to Clipboard'; }, 1200);
    });
    $('export-vocabulary')?.addEventListener('click', () => {
        const lexicon = rows();
        if (!lexicon.length) return say('Generate a language before exporting its vocabulary.');
        const payload = { format: 'Conlang Generator vocabulary', version: 1, generator: VERSION, seed: current?.spec.seed, exported_at: new Date().toISOString(), lexicon };
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        Object.assign(document.createElement('a'), { href: url, download: 'conlang-vocabulary.json' }).click();
        URL.revokeObjectURL(url);
        say(`Exported ${lexicon.length} entries.`);
    });
    $('import-vocabulary')?.addEventListener('click', () => $('import-vocabulary-file')?.click());
    $('import-vocabulary-file')?.addEventListener('change', async ev => {
        const file = ev.target.files?.[0];
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            const raw = Array.isArray(data) ? data : (Array.isArray(data.lexicon) ? data.lexicon : []);
            const lexicon = raw.map(i => ({ word: i.word ?? i.form ?? i.conlang, english: i.english ?? i.concept, meta: i.meta ?? '' })).filter(x => x.word && x.english);
            if (!lexicon.length) throw new Error('No valid lexicon entries found.');
            importedLexicon = lexicon;
            say(`Imported ${lexicon.length} entries.`);
            if ($('db-status')) $('db-status').textContent = 'Imported vocabulary loaded';
        } catch (err) { say(err.message || 'Import failed.'); } finally { ev.target.value = ''; }
    });
}

async function loadJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
}

async function start() {
    if ($('app-version')) $('app-version').textContent = `v${VERSION}`;
    installTabs(); installRelationControls(); installVocabularyTools(); installMeanSlider(); installPhonotacticInfo();
    $('generate')?.addEventListener('click', generate);
    $('regenerate')?.addEventListener('click', () => { randomize(); generate(); });
    $('randomize')?.addEventListener('click', randomize);
    $('clear-filters')?.addEventListener('click', () => FILTERS.forEach(id => { if ($(id)) $(id).value = ''; }));
    for (const [id, type] of [['preset-historical', 'historical'], ['preset-fantasy', 'fantasy'], ['preset-modern', 'modern'], ['preset-scifi', 'scifi']]) $(id)?.addEventListener('click', () => preset(type));
    $('dictionary-direction')?.addEventListener('change', renderDictionary);
    $('dictionary-search')?.addEventListener('input', renderDictionary);
    try {
        vocabulary = assertVocabulary(await loadJson('data/vocabulary.json'), 'data/vocabulary.json');
        templates = (await loadJson('data/sentence-templates.json')).templates;
        populateFilters();
        if ($('db-status')) $('db-status').textContent = `Vocabulary loaded: ${vocabulary.length} entries`;
    } catch (e) {
        console.error(e);
        if ($('db-status')) $('db-status').textContent = 'Vocabulary load failed';
        say('Vocabulary load failed: ' + e.message);
    }
}
start();
