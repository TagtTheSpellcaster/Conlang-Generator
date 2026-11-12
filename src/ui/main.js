// Generator page controller: reads the form, calls the pure engine, renders the result.
import { VERSION } from '../version.js';
import { generateNames, NAME_KINDS, PERSON_SCHEMES } from '../names.js';
import { languageDocument, toHtml, toMarkdown, lexiconCsv, languageJson, safeName } from '../export.js';
import { loadVocabulary } from './vocabulary-store.js';
import { generateLanguage } from '../engine.js';
import { esc, uniq } from '../core/text.js';
import { CLUSTER_SETS, CLUSTER_LABELS, EXPANSIONS } from '../phonology/models.js';
import { GENRES, GENRE_IDS } from '../genres.js';
import { derivationHtml, calendarHtml, numeralsHtml, numberResultHtml, namesHtml, resultHtml, samplesHtml, lexiconHtml, dictionaryHtml, lexiconRows, phonotacticInfoHtml } from './render.js';

const $ = id => document.getElementById(id);
const FILTERS = ['culture', 'biome', 'era'];
const say = text => { if ($('message')) $('message').textContent = text; };

let vocabulary = [];
let templates = [];
let derivations = [];
let current = null;          // last generated language
let importedLexicon = null;  // rows imported for re-export only

const selected = id => { const e = $(id); return e ? [...e.selectedOptions].map(o => o.value).filter(Boolean) : []; };

// Nothing checked = model default; "none" = no clusters; otherwise the checked sets.
const checkedClusters = position => [...document.querySelectorAll(`input[name="${position}-clusters"]:checked`)].map(i => i.value);

const checkedScript = () => [...document.querySelectorAll('input[name="script"]:checked')].map(i => i.value);

function readInput() {
    const v = id => $(id)?.value;
    return {
        culture: selected('culture'), biome: selected('biome'), era: selected('era'),
        vowels: v('vowels'), consonants: v('consonants'), mean: v('mean'), seed: $('seed')?.value.trim(),
        order: v('word-order'), morphology: v('morphology'), articles: v('articles'), plural: v('plural'), number: v('number'),
        gender: v('gender'), relations: v('relations'), caseSystem: v('case-system'), adjPosition: v('adj-position'),
        genre: v('genre'),
        numerals: v('numeral-system'), numeralVariant: v('numeral-variant'), classifiers: v('classifiers'), numeralPosition: v('numeral-position'),
        onsetClusters: checkedClusters('onset'), codaClusters: checkedClusters('coda'), maxCluster: v('max-cluster'),
        // nothing checked = no expanded letters (an explicit choice, so a genre's default does not come back)
        script: checkedScript().length ? checkedScript() : ['none']
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

const EXPORTS = {
    html: [l => toHtml(languageDocument(l, VERSION)), 'html', 'text/html'],
    md: [l => toMarkdown(languageDocument(l, VERSION)), 'md', 'text/markdown'],
    csv: [l => lexiconCsv(l), 'csv', 'text/csv'],
    json: [l => languageJson(l, VERSION), 'json', 'application/json']
};

function exportLanguage(lang, kind) {
    const [build, ext, type] = EXPORTS[kind];
    const url = URL.createObjectURL(new Blob([build(lang)], { type: `${type};charset=utf-8` }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${safeName(lang)}.${ext}` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say(`Exported ${safeName(lang)}.${ext}.`);
}

function renderNumerals() {
    if (!current) return;
    const out = $('numerals-output');
    out.className = '';
    out.innerHTML = numeralsHtml(current);
    updateNumberResult();
}
function updateNumberResult() {
    const box = $('numeral-result');
    if (box && current) box.innerHTML = numberResultHtml(current, Number($('numeral-input').value));
}

let nameSalt = 0;
function renderNames() {
    if (!current) return;
    const kind = $('names-kind').value, count = Number($('names-count').value) || 20;
    $('names-output').className = '';
    $('names-output').innerHTML = namesHtml(generateNames(current, { kind, count, salt: nameSalt, scheme: $('names-scheme').value }), kind);
}

function render(lang) {
    nameSalt = 0;
    const box = $('generation-output');
    box.className = 'result';
    box.innerHTML = resultHtml(lang);
    $('keep-seed')?.addEventListener('click', () => { $('seed').value = lang.spec.seed; say('Seed copied into the Seed field.'); });
    box.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => exportLanguage(lang, b.dataset.export)));
    const samples = $('sample-sentences-output');
    samples.className = '';
    samples.innerHTML = samplesHtml(lang);
    const lex = $('lexicon-output');
    lex.className = '';
    lex.innerHTML = derivationHtml(lang) + `<div class="card">${lexiconHtml(lang.lexicon)}</div>`;
    renderDictionary();
    renderNumerals();
    renderNames();
    const cal = $('calendar-output');
    cal.className = '';
    cal.innerHTML = calendarHtml(lang);
}

function generate(keepSeed = false) {
    try {
        const input = readInput();
        if (keepSeed === true && current) input.seed = current.spec.seed;   // same language, another numeral choice
        current = generateLanguage(input, vocabulary, templates, derivations);
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
    if (!$('genre') || $('genre').value === 'none') for (const id of FILTERS) {
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

// quick profiles for the culture / biome / era selectors
const PRESETS = {
    historical: { era: 'medieval' }, fantasy: { culture: 'shamanic', era: 'medieval' }, modern: { era: 'modern' }, scifi: { culture: 'technocratic', era: 'futuristic' }
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

function installScriptControls() {
    const anchor = document.querySelector('.cluster-controls');
    if (!anchor) return;
    const box = document.createElement('fieldset');
    box.className = 'script-controls';
    box.innerHTML = `<legend>Expanded letters</legend><div class="script-options">${Object.entries(EXPANSIONS).map(([key, g]) => `<label class="cluster-option"><input type="checkbox" name="script" value="${esc(key)}"> ${esc(g.label)}</label>`).join('')}</div><div class="sub cluster-hint">Marked letters for an exotic look. A few letters of each group are used (never the whole group), and only those whose base letter the language has. Genres such as dwarven or fey pick a group by themselves.</div>`;
    anchor.appendChild(box);   // a grid item of the cluster grid: same column width as the cluster boxes
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
const autoProfile = {};   // last value the genre put into each selector
function applyGenre(id) {
    const g = GENRES[id];
    const info = $('genre-info');
    if (info) info.textContent = g ? g.summary : 'No genre: every option is chosen by hand and the vocabulary is not weighted.';
    // culture / biome / era chosen by the genre; selectors the user changed by hand are kept unless the genre names one
    for (const key of FILTERS) {
        const el = $(key);
        if (!el) continue;
        const wanted = g?.profile[key] ?? '';
        if (wanted || el.value === autoProfile[key]) el.value = wanted;
        autoProfile[key] = wanted;
    }
    if (!g) return;
    const set = (control, value, eventName = 'change') => { const e = $(control); if (e && value !== undefined) { e.value = String(value); e.dispatchEvent(new Event(eventName)); } };
    const order = ['morphology', 'articles', 'order', 'plural', 'number', 'gender', 'relations', 'caseSystem', 'adjPosition'];
    for (const key of order) set(GRAMMAR_CONTROLS[key], g.grammar[key]);
    for (const [key, control] of Object.entries(SOUND_CONTROLS)) set(control, g.sound[key], key === 'mean' ? 'input' : 'change');
    for (const [position, list] of [['onset', g.sound.onsetClusters], ['coda', g.sound.codaClusters]]) {
        for (const box of document.querySelectorAll(`input[name="${position}-clusters"]`)) box.checked = !!list?.includes(box.value);
    }
    for (const box of document.querySelectorAll('input[name="script"]')) box.checked = !!g.sound.script?.includes(box.value);
    $('consonants')?.dispatchEvent(new Event('change'));
}

function installGenreControls() {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    const section = document.createElement('section');
    section.className = 'section genre-section';
    section.innerHTML = `<h2>Language genre</h2><div class="genre-row"><div class="field"><label for="genre">Genre</label><select id="genre"><option value="none">None (free choice)</option>${GENRE_IDS.map(id => `<option value="${esc(id)}">${esc(GENRES[id].label)}</option>`).join('')}</select></div><div class="sub genre-info" id="genre-info"></div></div>`;
    (document.querySelector('.parameter-col-main') ?? controls).insertAdjacentElement('afterbegin', section);
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
    installTabs(); installRelationControls(); installVocabularyTools(); installMeanSlider(); installPhonotacticInfo(); installClusterControls(); installScriptControls(); installGenreControls();
    $('generate')?.addEventListener('click', generate);
    $('regenerate')?.addEventListener('click', () => { randomize(); generate(); });
    $('randomize')?.addEventListener('click', randomize);
    $('clear-filters')?.addEventListener('click', () => FILTERS.forEach(id => { if ($(id)) $(id).value = ''; }));
    for (const [id, type] of [['preset-historical', 'historical'], ['preset-fantasy', 'fantasy'], ['preset-modern', 'modern'], ['preset-scifi', 'scifi']]) $(id)?.addEventListener('click', () => preset(type));
    $('numeral-input')?.addEventListener('input', updateNumberResult);
    // numeral system and variant can also be chosen on the Numerals tab: same selects as in Generation, kept in step
    for (const [tab, main] of [['numeral-system-tab', 'numeral-system'], ['numeral-variant-tab', 'numeral-variant']]) {
        if (!$(tab) || !$(main)) continue;
        $(tab).innerHTML = $(main).innerHTML;
        $(tab).value = $(main).value;
        $(tab).addEventListener('change', () => { $(main).value = $(tab).value; generate(true); });
        $(main).addEventListener('change', () => { $(tab).value = $(main).value; });
    }
    if ($('names-kind')) {
        $('names-kind').innerHTML = NAME_KINDS.map(k => `<option value="${k.id}">${esc(k.label)}</option>`).join('');
        $('names-scheme').innerHTML = PERSON_SCHEMES.map(k => `<option value="${k.id}">${esc(k.label)}</option>`).join('');
        const syncScheme = () => { $('names-scheme').disabled = $('names-kind').value !== 'person'; };
        $('names-scheme').addEventListener('change', () => { nameSalt = 0; renderNames(); });
        $('names-kind').addEventListener('change', () => { nameSalt = 0; syncScheme(); renderNames(); });
        $('names-count').addEventListener('change', renderNames);
        $('names-more').addEventListener('click', () => { nameSalt++; renderNames(); });
    }
    $('dictionary-direction')?.addEventListener('change', renderDictionary);
    $('dictionary-search')?.addEventListener('input', renderDictionary);
    try {
        const loaded = await loadVocabulary();
        vocabulary = loaded.vocabulary;
        templates = await loadJson('data/sentence-templates.json');
        derivations = (await loadJson('data/derivations.json').catch(() => ({ derivations: [] }))).derivations;
        populateFilters();
        if ($('db-status')) $('db-status').textContent = `Vocabulary loaded: ${vocabulary.length} entries${loaded.edits ? ` (${loaded.edits} local edit${loaded.edits === 1 ? '' : 's'} from the vocabulary manager)` : ''}${loaded.warning ? ` — ${loaded.warning}` : ''}`;
    } catch (e) {
        console.error(e);
        if ($('db-status')) $('db-status').textContent = 'Vocabulary load failed';
        say('Vocabulary load failed: ' + e.message);
    }
}
start();
