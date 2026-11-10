// Generator page controller: reads the form, calls the pure engine, renders the result.
import { VERSION } from '../version.js';
import { generateLanguage } from '../engine.js';
import { assertVocabulary } from '../lexicon/schema.js';
import { esc, uniq } from '../core/text.js';
import { CLUSTER_SETS, CLUSTER_LABELS } from '../phonology/models.js';
import { GENRES, GENRE_IDS } from '../genres.js';
import { resultHtml, samplesHtml, lexiconHtml, dictionaryHtml, lexiconRows, phonotacticInfoHtml } from './render.js';

const $ = id => document.getElementById(id);
const FILTERS = ['region', 'culture', 'biome', 'era', 'tags'];
const say = text => { if ($('message')) $('message').textContent = text; };

let vocabulary = [];
let templates = [];
let current = null;          // last generated language
let importedLexicon = null;  // rows imported for re-export only

const selected = id => { const e = $(id); return e ? [...e.selectedOptions].map(o => o.value).filter(Boolean) : []; };

// Nothing checked = model default; "none" = no clusters; otherwise the checked sets.
const checkedClusters = position => [...document.querySelectorAll(`input[name="${position}-clusters"]:checked`)].map(i => i.value);

function readInput() {
    const v = id => $(id)?.value;
    return {
        region: selected('region'), culture: selected('culture'), biome: selected('biome'), era: selected('era'), tags: selected('tags'),
        vowels: v('vowels'), consonants: v('consonants'), mean: v('mean'), seed: $('seed')?.value.trim(),
        order: v('word-order'), morphology: v('morphology'), articles: v('articles'), plural: v('plural'), number: v('number'),
        gender: v('gender'), relations: v('relations'), caseSystem: v('case-system'), adjPosition: v('adj-position'),
        genre: v('genre'),
        onsetClusters: checkedClusters('onset'), codaClusters: checkedClusters('coda'), maxCluster: v('max-cluster')
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
    if ($('genre')) {
        const pool = ['none', ...GENRE_IDS];
        $('genre').value = pool[Math.floor(Math.random() * pool.length)];
        applyGenre($('genre').value);
    }
    for (const id of FILTERS) {
        const e = $(id);
        if (e && e.options.length > 1) e.value = [...e.options].slice(1)[Math.floor(Math.random() * (e.options.length - 1))].value;
    }
    for (const id of $('genre')?.value && $('genre').value !== 'none' ? [] : ['vowels', 'consonants', 'word-order', 'morphology', 'adj-position', 'articles', 'plural', 'number', 'gender', 'relations']) {
        const e = $(id);
        if (e?.options.length) e.value = e.options[Math.floor(Math.random() * e.options.length)].value;
    }
    $('relations')?.dispatchEvent(new Event('change'));
    if ($('mean') && !($('genre')?.value && $('genre').value !== 'none')) { $('mean').value = (1 + Math.random() * 2.5).toFixed(1); $('mean').dispatchEvent(new Event('input')); }
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

function installClusterControls() {
    const seed = $('seed')?.closest('.field');
    if (!seed) return;
    const box = document.createElement('div');
    box.className = 'cluster-controls';
    const group = (position, title) => {
        const items = [['none', 'None'], ...Object.keys(CLUSTER_SETS[position]).map(k => [k, CLUSTER_LABELS[k] ?? k])];
        return `<fieldset class="cluster-group" data-position="${position}"><legend>${title}</legend>${items.map(([value, text]) => `<label class="cluster-option"><input type="checkbox" name="${position}-clusters" value="${esc(value)}"> ${esc(text)}</label>`).join('')}</fieldset>`;
    };
    box.innerHTML = `${group('onset', 'Onset clusters (word-initial)')}${group('coda', 'Coda clusters (word-final)')}<div class="field"><label for="max-cluster">Maximum cluster length</label><select id="max-cluster"><option value="3" selected>3 consonants</option><option value="2">2 consonants</option></select></div><div class="sub cluster-hint">Nothing checked = default of the consonant model. Sets that use consonants outside the model are skipped.</div>`;
    seed.insertAdjacentElement('afterend', box);
    box.addEventListener('change', ev => {
        const input = ev.target;
        if (input.type !== 'checkbox') return;
        const same = [...box.querySelectorAll(`input[name="${input.name}"]`)];
        if (input.checked && input.value === 'none') same.forEach(i => { if (i !== input) i.checked = false; });
        else if (input.checked) same.find(i => i.value === 'none').checked = false;
    });
}

// Form control ids for each genre option.
const GRAMMAR_CONTROLS = { morphology: 'morphology', articles: 'articles', order: 'word-order', plural: 'plural', number: 'number', gender: 'gender', relations: 'relations', caseSystem: 'case-system', adjPosition: 'adj-position' };
const SOUND_CONTROLS = { consonants: 'consonants', vowels: 'vowels', mean: 'mean', maxCluster: 'max-cluster' };

// Fills the grammar and sound controls with the genre's defaults; the user can change any of them afterwards.
function applyGenre(id) {
    const g = GENRES[id];
    const info = $('genre-info');
    if (info) info.textContent = g ? g.summary : 'No genre: every option is chosen by hand and the vocabulary is not weighted.';
    if (!g) return;
    const set = (control, value, eventName = 'change') => { const e = $(control); if (e && value !== undefined) { e.value = String(value); e.dispatchEvent(new Event(eventName)); } };
    const order = ['morphology', 'articles', 'order', 'plural', 'number', 'gender', 'relations', 'caseSystem', 'adjPosition'];
    for (const key of order) set(GRAMMAR_CONTROLS[key], g.grammar[key]);
    for (const [key, control] of Object.entries(SOUND_CONTROLS)) set(control, g.sound[key], key === 'mean' ? 'input' : 'change');
    for (const [position, list] of [['onset', g.sound.onsetClusters], ['coda', g.sound.codaClusters]]) {
        for (const box of document.querySelectorAll(`input[name="${position}-clusters"]`)) box.checked = !!list?.includes(box.value);
    }
    $('consonants')?.dispatchEvent(new Event('change'));
}

function installGenreControls() {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    const section = document.createElement('section');
    section.className = 'section genre-section';
    section.innerHTML = `<h2>Language genre</h2><div class="genre-row"><div class="field"><label for="genre">Genre</label><select id="genre"><option value="none">None (free choice)</option>${GENRE_IDS.map(id => `<option value="${esc(id)}">${esc(GENRES[id].label)}</option>`).join('')}</select></div><div class="sub genre-info" id="genre-info"></div></div>`;
    controls.insertAdjacentElement('afterbegin', section);
    $('genre').addEventListener('change', () => applyGenre($('genre').value));
    applyGenre('none');
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
    installTabs(); installRelationControls(); installVocabularyTools(); installMeanSlider(); installPhonotacticInfo(); installClusterControls(); installGenreControls();
    $('generate')?.addEventListener('click', generate);
    $('regenerate')?.addEventListener('click', () => { randomize(); generate(); });
    $('randomize')?.addEventListener('click', randomize);
    $('clear-filters')?.addEventListener('click', () => FILTERS.forEach(id => { if ($(id)) $(id).value = ''; }));
    for (const [id, type] of [['preset-historical', 'historical'], ['preset-fantasy', 'fantasy'], ['preset-modern', 'modern'], ['preset-scifi', 'scifi']]) $(id)?.addEventListener('click', () => preset(type));
    $('dictionary-direction')?.addEventListener('change', renderDictionary);
    $('dictionary-search')?.addEventListener('input', renderDictionary);
    try {
        vocabulary = assertVocabulary(await loadJson('data/vocabulary.json'), 'data/vocabulary.json');
        templates = await loadJson('data/sentence-templates.json');
        populateFilters();
        if ($('db-status')) $('db-status').textContent = `Vocabulary loaded: ${vocabulary.length} entries`;
    } catch (e) {
        console.error(e);
        if ($('db-status')) $('db-status').textContent = 'Vocabulary load failed';
        say('Vocabulary load failed: ' + e.message);
    }
}
start();
