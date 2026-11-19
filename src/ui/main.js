// Generator page controller: reads the form, calls the pure engine, renders the result.
import { VERSION } from '../version.js';
import { generateNames, NAME_KINDS, PERSON_SCHEMES } from '../names.js';
import { languageDocument, toHtml, toMarkdown, lexiconCsv, languageJson, safeName } from '../export.js';
import { loadVocabulary } from './vocabulary-store.js';
import { generateLanguage } from '../engine.js';
import { esc, uniq } from '../core/text.js';
import { CLUSTER_SETS, CLUSTER_LABELS } from '../phonology/models.js';
import { GENRES, GENRE_IDS } from '../genres.js';
import { stressOf } from '../ipa.js';
import { initTheme } from './theme.js';
import { addIcons } from './icons.js';
import { describeLanguage } from '../description/describe.js';
import { descriptionHtml, descriptionMarkdown, descriptionWikitext } from '../description/render.js';
import { setStress, setShowIpa, writingHtml, writeTextHtml, historyHtml, derivationHtml, semanticsHtml, calendarHtml, numeralsHtml, numberResultHtml, namesHtml, resultHtml, grammarTablesHtml, grammarGuideHtml, grammarTocHtml, abbreviationsHtml, samplesHtml, textsHtml, lexiconHtml, dictionaryHtml, lexiconRows, phonotacticInfoHtml } from './render.js';

const $ = id => document.getElementById(id);
const FILTERS = ['culture', 'biome', 'era'];
const say = text => { if ($('message')) $('message').textContent = text; };

let vocabulary = [];
let templates = [];
let derivations = [];
let current = null;          // last generated language

const selected = id => { const e = $(id); return e ? [...e.selectedOptions].map(o => o.value).filter(Boolean) : []; };

// Nothing checked = model default; "none" = no clusters; otherwise the checked sets.
const checkedClusters = position => [...document.querySelectorAll(`input[name="${position}-clusters"]:checked`)].map(i => i.value);


function readInput() {
    const v = id => $(id)?.value;
    return {
        culture: selected('culture'), biome: selected('biome'), era: selected('era'),
        vowels: v('vowels'), consonants: v('consonants'), mean: v('mean'), seed: $('seed')?.value.trim(),
        order: v('word-order'), morphology: v('morphology'), articles: v('articles'), plural: v('plural'), number: v('number'),
        gender: v('gender'), relations: v('relations'), caseSystem: v('case-system'), adjPosition: v('adj-position'),
        genre: v('genre'),
        numerals: v('numeral-system'), numeralVariant: v('numeral-variant'), classifiers: v('classifiers'), numeralPosition: v('numeral-position'),
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

// the writing system chosen in the Writing tab is the one that is saved
const numeralOptions = () => ({ system: $('writing-numerals')?.value ?? 'auto', orientation: $('writing-stave')?.value ?? 'auto' });
const writingOptions = () => ({ writing: $('writing-type')?.value ?? 'auto', direction: $('writing-direction')?.value ?? 'auto', numerals: numeralOptions() });
const EXPORTS = {
    html: [l => toHtml(languageDocument(l, VERSION, writingOptions())), 'html', 'text/html'],
    md: [l => toMarkdown(languageDocument(l, VERSION, writingOptions())), 'md', 'text/markdown'],
    csv: [l => lexiconCsv(l), 'csv', 'text/csv'],
    json: [l => languageJson(l, VERSION, writingOptions()), 'json', 'application/json']
};

function exportLanguage(lang, kind) {
    const [build, ext, type] = EXPORTS[kind];
    const url = URL.createObjectURL(new Blob([build(lang)], { type: `${type};charset=utf-8` }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${safeName(lang)}.${ext}` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say(`Exported ${safeName(lang)}.${ext}.`);
}

const descOptions = () => ({ pageLinks: $('desc-page-links')?.checked, termLinks: $('desc-term-links')?.checked, infobox: $('desc-template')?.checked ? 'template' : 'table' });
function renderDescription() {
    if (!current) return;
    const out = $('description-output');
    out.className = '';
    out.innerHTML = descriptionHtml(describeLanguage(current, writingOptions()), { ipa: $('show-ipa')?.checked, termLinks: $('desc-term-links')?.checked });
}
function exportDescription(kind) {
    if (!current) return say('Generate a language first.');
    const d = describeLanguage(current, writingOptions());
    const text = kind === 'wiki' ? descriptionWikitext(d, descOptions()) : descriptionMarkdown(d);
    const ext = kind === 'wiki' ? 'wiki.txt' : 'description.md';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${safeName(current)}.${ext}` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    say(`Exported ${safeName(current)}.${ext}.`);
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
    setStress(stressOf(lang));
    const box = $('generation-output');
    box.className = 'result';
    box.innerHTML = resultHtml(lang);
    $('keep-seed')?.addEventListener('click', () => { $('seed').value = lang.spec.seed; say('Seed copied into the Seed field.'); });
    box.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => exportLanguage(lang, b.dataset.export)));
    const samples = $('sample-sentences-output');
    samples.className = '';
    samples.innerHTML = samplesHtml(lang) + textsHtml(lang);
    const gram = $('grammar-output');
    gram.className = '';
    gram.innerHTML = grammarGuideHtml(lang) + grammarTablesHtml(lang);
    $('grammar-toc').innerHTML = grammarTocHtml(lang);
    const abbr = $('grammar-abbreviations');
    abbr.className = 'gram-section';
    abbr.innerHTML = abbreviationsHtml(lang);
    const lex = $('lexicon-output');
    lex.className = '';
    lex.onclick = ev => { const b = ev.target.closest('[data-lex-toggle]'); if (b) lex.querySelectorAll('.lex-section').forEach(d => { d.open = b.dataset.lexToggle === 'open'; }); };
    lex.innerHTML = `<div class="card">${lexiconHtml(lang.lexicon)}</div>`;
    for (const [id, html] of [['semantics-output', semanticsHtml(lang)], ['derivation-output', derivationHtml(lang)]]) { $(id).className = ''; $(id).innerHTML = html; }
    renderDescription();
    renderDictionary();
    renderNumerals();
    renderNames();
    const cal = $('calendar-output');
    cal.className = '';
    cal.innerHTML = calendarHtml(lang);
    const hist = $('history-output');
    hist.className = '';
    hist.innerHTML = historyHtml(lang);
    lastLang = lang;
    renderWriting();
}

let lastLang = null;
function renderWriting() {
    const out = $('writing-output');
    if (!out || !lastLang) return;
    out.className = '';
    out.innerHTML = writingHtml(lastLang, $('writing-type')?.value ?? 'auto', $('writing-direction')?.value ?? 'auto', numeralOptions());
    if ($('write-output')?.innerHTML) renderWrittenText();
}

function renderWrittenText() {
    const out = $('write-output');
    if (!out) return;
    if (!lastLang) { out.innerHTML = '<p class="sub">Generate a language first.</p>'; return; }
    out.innerHTML = writeTextHtml(lastLang, $('write-input').value, { choice: $('writing-type')?.value ?? 'auto', direction: $('writing-direction')?.value ?? 'auto', pointed: $('write-pointed').checked, lookup: $('write-lookup').checked, numerals: numeralOptions() });
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

function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => { const on = t.dataset.tab === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === name));
}

function installTabs() {
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
    // sub-tabs inside a panel (Lexicon)
    document.querySelectorAll('.subtabs').forEach(bar => bar.addEventListener('click', ev => {
        const b = ev.target.closest('.subtab');
        if (!b) return;
        bar.querySelectorAll('.subtab').forEach(t => { t.classList.toggle('active', t === b); t.setAttribute('aria-selected', String(t === b)); });
        bar.parentElement.querySelectorAll(':scope > .sub-panel').forEach(p => p.classList.toggle('active', p.id === b.dataset.sub));
    }));
    // links to another tab, and in-page anchors of the Grammar tab (the page has no routing of its own)
    document.addEventListener('click', ev => {
        const go = ev.target.closest('[data-goto-tab]');
        if (go) { ev.preventDefault(); showTab(go.dataset.gotoTab); window.scrollTo(0, 0); return; }
        const dl = ev.target.closest('[data-desc-link]');
        if (dl) { ev.preventDefault(); document.getElementById(dl.dataset.descLink)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        const toc = ev.target.closest('.toc a');
        if (toc) { ev.preventDefault(); document.getElementById(toc.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
}

function installVocabularyTools() {
    $('open-vocabulary')?.addEventListener('click', () => { window.location.href = 'vocabulary.html'; });
    $('copy-vocabulary')?.addEventListener('click', async () => {
        const r = current ? lexiconRows(current.lexicon) : [];
        if (!r.length) return say('Generate a language before copying its lexicon.');
        const text = r.map(x => [x.word, x.english, x.meta].filter(Boolean).join('\t')).join('\n');
        try { await navigator.clipboard.writeText(text); } catch {
            const area = Object.assign(document.createElement('textarea'), { value: text });
            area.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
        }
        say(`Copied ${r.length} lexicon entries to the clipboard.`);
        const b = $('copy-vocabulary'), label = b.lastChild; const old = label.textContent; label.textContent = 'Copied'; setTimeout(() => { label.textContent = old; }, 1200);
    });
}

async function loadJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
}

async function start() {
    if ($('app-version')) $('app-version').textContent = `v${VERSION}`;
    $('desc-export-wiki')?.addEventListener('click', () => exportDescription('wiki'));
    $('desc-export-md')?.addEventListener('click', () => exportDescription('md'));
    $('desc-term-links')?.addEventListener('change', renderDescription);
    for (const id of ['writing-type', 'writing-direction']) $(id)?.addEventListener('change', renderDescription);
    installTabs(); installRelationControls(); installVocabularyTools(); installMeanSlider(); installPhonotacticInfo(); installClusterControls(); installGenreControls();
    $('generate')?.addEventListener('click', generate);
    $('writing-type')?.addEventListener('change', renderWriting);
    $('writing-direction')?.addEventListener('change', renderWriting);
    $('writing-numerals')?.addEventListener('change', renderWriting);
    $('writing-stave')?.addEventListener('change', renderWriting);
    $('write-go')?.addEventListener('click', renderWrittenText);
    $('write-lookup')?.addEventListener('change', renderWrittenText);
    $('write-pointed')?.addEventListener('change', renderWrittenText);
    $('write-input')?.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); renderWrittenText(); } });
    $('show-ipa')?.addEventListener('change', () => { setShowIpa($('show-ipa').checked); if (current) render(current); });
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

initTheme($('theme-toggle'));
addIcons();
