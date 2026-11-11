// Vocabulary manager. Validation, schema and inverse-relation rules come from src/lexicon/schema.js,
// the same module the engine and tools/validate.mjs use.
import {
    POS, DOMAINS, TIERS, assertVocabulary, validateVocabulary, cloneEntry, closeRelations, INVERSE
} from '../lexicon/schema.js';
import { serializeVocabulary, diffVocabulary, overlaySize } from '../lexicon/store.js';
import { loadVocabulary, persistEdits, discardEdits, saveToFile, canWriteFile } from './vocabulary-store.js';

const FILTER_FIELDS = ['pos', 'domain', 'group', 'tier', 'region', 'culture', 'biome', 'era', 'tags'];
const SORT_FIELDS = ['id', 'lemma', 'gloss', 'pos', 'domain', 'group', 'tier', 'region', 'culture', 'biome', 'era', 'tags'];
const $ = id => document.getElementById(id);

let vocabulary = [];
let base = [];          // data/vocabulary.json as last read or written
let filtered = [];
let pendingAppend = null;
let editingId = null;

const setStatus = t => { $('databaseStatus').textContent = t; };
const editsText = n => n ? `${n} local edit${n === 1 ? '' : 's'} not yet saved to data/vocabulary.json (the generator already uses them)` : 'Identical to data/vocabulary.json';
// local edits are stored as a difference from the file; the generator reads them too
const save = () => { const n = persistEdits(base, vocabulary); setStatus(editsText(n)); };
const showError = m => { $('errorMessage').hidden = false; $('errorMessage').textContent = m; };
const closeModal = id => { $(id).hidden = true; };
const toArray = v => Array.isArray(v) ? v.map(String) : (v === undefined || v === null || typeof v === 'object' ? [] : [String(v)]);
const display = (e, a) => {
    const v = e[a];
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${Array.isArray(x) ? x.join(' ') : x}`).join('; ');
    return String(v);
};
const title = a => a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

async function load() {
    try {
        const loaded = await loadVocabulary();
        vocabulary = loaded.vocabulary; base = loaded.base;
        setStatus(editsText(loaded.edits));
        if (loaded.warning) showError(loaded.warning);
        refresh();
    } catch (e) { console.error(e); showError('Unable to load data/vocabulary.json:\n\n' + e.message); }
}

async function reload() {
    if (!confirm('Reload data/vocabulary.json from the server?\n\nAll local edits stored in this browser will be discarded.')) return;
    discardEdits();
    await load();
}

function reset() {
    if (!confirm('Discard all local edits and reload data/vocabulary.json?')) return;
    discardEdits();
    load();
}

async function saveFile() {
    try {
        const how = await saveToFile(vocabulary);
        if (how === 'file') {
            base = vocabulary.map(cloneEntry); discardEdits();
            setStatus('Saved to data/vocabulary.json — ' + editsText(0));
        } else setStatus('Downloaded vocabulary.json: replace data/vocabulary.json with it to make the edits permanent. ' + editsText(overlaySize(diffVocabulary(base, vocabulary))));
    } catch (e) { if (e?.name !== 'AbortError') showError('Unable to save the file:\n\n' + (e?.message || e)); }
}

async function handleAppendFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
        const imported = assertVocabulary(JSON.parse(await file.text()), file.name).map(cloneEntry);
        const existing = new Set(vocabulary.map(e => e.id));
        const duplicateIds = imported.filter(e => existing.has(e.id)).map(e => e.id);
        const newEntries = imported.filter(e => !existing.has(e.id));
        const candidate = closeRelations([...vocabulary.map(cloneEntry), ...newEntries.map(cloneEntry)]);
        const errors = validateVocabulary(candidate);
        if (errors.length) throw new Error(errors.slice(0, 20).join('\n'));
        pendingAppend = { fileName: file.name, imported, newEntries, duplicateIds };
        $('appendFilename').textContent = `File: ${file.name}`;
        $('appendSummary').textContent = `Entries found: ${imported.length}\nNew entries: ${newEntries.length}\nExisting IDs: ${duplicateIds.length}`;
        $('appendErrors').hidden = !duplicateIds.length;
        $('appendErrors').textContent = duplicateIds.length ? 'These IDs already exist and will not be appended:\n\n' + duplicateIds.join('\n') : '';
        $('confirmAppend').disabled = !newEntries.length;
        $('appendModal').hidden = false;
    } catch (e) { alert('The selected file could not be appended.\n\n' + e.message); }
}

function confirmAppend() {
    if (!pendingAppend) return;
    const candidate = closeRelations([...vocabulary.map(cloneEntry), ...pendingAppend.newEntries.map(cloneEntry)]);
    const errors = validateVocabulary(candidate);
    if (errors.length) return alert(errors.slice(0, 20).join('\n'));
    vocabulary = candidate; save();
    pendingAppend = null; closeModal('appendModal'); refresh();
}

function exportJson() {
    const url = URL.createObjectURL(new Blob([serializeVocabulary(vocabulary)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'vocabulary.json' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function populateFilters() {
    const box = $('attributeFilters');
    box.innerHTML = '';
    for (const a of FILTER_FIELDS) {
        const values = new Set();
        vocabulary.forEach(e => toArray(e[a]).forEach(v => v && values.add(v)));
        const wrap = document.createElement('div');
        wrap.className = 'filter-group';
        wrap.innerHTML = `<label for="filter-${a}">${title(a)}</label><select id="filter-${a}"><option value="">All ${title(a)}</option>${[...values].sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).map(v => `<option>${v.replace(/</g, '&lt;')}</option>`).join('')}</select>`;
        wrap.querySelector('select').addEventListener('change', apply);
        box.appendChild(wrap);
    }
    const sort = $('sortAttribute');
    sort.innerHTML = '<option value="">Default order</option>' + SORT_FIELDS.map(a => `<option value="${a}">${title(a)}</option>`).join('');
}

function apply() {
    const q = $('searchVocabulary').value.trim().toLowerCase();
    filtered = vocabulary.filter(e => {
        if (q && ![...SORT_FIELDS, 'features', 'relations'].some(a => display(e, a).toLowerCase().includes(q))) return false;
        return FILTER_FIELDS.every(a => { const s = $(`filter-${a}`); return !s || !s.value || toArray(e[a]).includes(s.value); });
    });
    const attr = $('sortAttribute').value;
    if (attr) {
        const f = $('sortDirection').value === 'desc' ? -1 : 1;
        filtered.sort((a, b) => display(a, attr).localeCompare(display(b, attr), undefined, { numeric: true, sensitivity: 'base' }) * f);
    }
    render();
}

function render() {
    const body = $('vocabularyBody');
    body.innerHTML = '';
    filtered.forEach((e, i) => {
        const row = document.createElement('tr');
        [i + 1, e.id, e.lemma, e.gloss ?? '', e.pos, e.domain, e.group, e.tier, ...['region', 'culture', 'biome', 'era', 'tags', 'features', 'relations'].map(a => display(e, a))].forEach(v => {
            const td = document.createElement('td'); td.textContent = v; row.appendChild(td);
        });
        const actions = document.createElement('td');
        actions.className = 'row-actions';
        const edit = Object.assign(document.createElement('button'), { textContent: 'Edit' });
        edit.addEventListener('click', () => openEntry(e));
        const del = Object.assign(document.createElement('button'), { textContent: 'Delete' });
        del.addEventListener('click', () => remove(e.id));
        actions.append(edit, del); row.appendChild(actions); body.appendChild(row);
    });
    $('totalCount').textContent = vocabulary.length;
    $('visibleCount').textContent = filtered.length;
}

function fillSelect(id, values) { $(id).innerHTML = values.map(v => `<option>${v}</option>`).join(''); }

function openEntry(entry = null) {
    editingId = entry?.id ?? null;
    $('entryModalTitle').textContent = entry ? 'Edit vocabulary entry' : 'Add vocabulary entry';
    fillSelect('entryPos', POS); fillSelect('entryDomain', DOMAINS); fillSelect('entryTier', TIERS);
    const v = entry || { id: '', lemma: '', pos: 'noun', domain: DOMAINS[0], group: '', tier: 'domain', region: [], culture: [], biome: [], era: [], tags: [], features: {}, relations: {} };
    $('entryId').value = v.id; $('entryLemma').value = v.lemma; $('entryGloss').value = v.gloss ?? '';
    $('entryPos').value = v.pos; $('entryDomain').value = v.domain; $('entryGroup').value = v.group; $('entryTier').value = v.tier;
    for (const [id, f] of [['entryRegion', 'region'], ['entryCulture', 'culture'], ['entryBiome', 'biome'], ['entryEra', 'era'], ['entryTags', 'tags']]) $(id).value = v[f].join(', ');
    $('entryFeatures').value = JSON.stringify(v.features, null, 1);
    $('entryRelations').value = JSON.stringify(v.relations, null, 1);
    $('entryFormError').hidden = true;
    $('entryModal').hidden = false;
}

function readForm() {
    const list = id => $(id).value.split(',').map(s => s.trim()).filter(Boolean);
    const parse = (id, name) => {
        const t = $(id).value.trim();
        const o = t ? JSON.parse(t) : {};
        if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error(`${name} must be a JSON object.`);
        return o;
    };
    const entry = {
        id: $('entryId').value.trim(), lemma: $('entryLemma').value.trim(), pos: $('entryPos').value, domain: $('entryDomain').value,
        group: $('entryGroup').value.trim(), tier: $('entryTier').value,
        region: list('entryRegion'), culture: list('entryCulture'), biome: list('entryBiome'), era: list('entryEra'), tags: list('entryTags'),
        features: parse('entryFeatures', 'Features'), relations: parse('entryRelations', 'Relations')
    };
    const gloss = $('entryGloss').value.trim();
    if (gloss) entry.gloss = gloss;
    return entry;
}

function submit(event) {
    event.preventDefault();
    const box = $('entryFormError');
    try {
        const entry = readForm();
        const candidate = vocabulary.map(cloneEntry);
        if (editingId) {
            const i = candidate.findIndex(x => x.id === editingId);
            if (i === -1) throw new Error('Entry not found.');
            if (entry.id !== editingId && candidate.some(x => x.id === entry.id)) throw new Error(`The ID "${entry.id}" already exists.`);
            // ids renamed: keep references consistent
            if (entry.id !== editingId) for (const x of candidate) for (const r of Object.values(x.relations)) { const k = r.indexOf(editingId); if (k >= 0) r[k] = entry.id; }
            candidate[i] = entry;
        } else {
            if (candidate.some(x => x.id === entry.id)) throw new Error(`The ID "${entry.id}" already exists.`);
            candidate.push(entry);
        }
        closeRelations(candidate);
        const errors = validateVocabulary(candidate);
        if (errors.length) throw new Error(errors.slice(0, 15).join('\n'));
        vocabulary = candidate; save(); closeModal('entryModal'); refresh();
    } catch (e) { box.hidden = false; box.textContent = e.message; }
}

function remove(id) {
    const entry = vocabulary.find(e => e.id === id);
    if (!entry) return;
    const dependents = vocabulary.filter(e => Object.values(e.relations).some(t => t.includes(id)));
    if (dependents.length && !confirm(`"${entry.lemma}" (${id}) is referenced by:\n\n${dependents.map(e => e.id).join('\n')}\n\nDelete it and remove those references?`)) return;
    if (!dependents.length && !confirm(`Delete "${entry.lemma}" (${id})?`)) return;
    vocabulary = vocabulary.filter(e => e.id !== id).map(e => {
        const c = cloneEntry(e);
        for (const [k, t] of Object.entries(c.relations)) { c.relations[k] = t.filter(x => x !== id); if (!c.relations[k].length) delete c.relations[k]; }
        return c;
    });
    save(); refresh();
}

function refresh() { populateFilters(); apply(); }

document.addEventListener('DOMContentLoaded', () => {
    $('searchVocabulary').addEventListener('input', apply);
    $('sortAttribute').addEventListener('change', apply);
    $('sortDirection').addEventListener('change', apply);
    $('reloadVocabulary').addEventListener('click', reload);
    $('appendVocabulary').addEventListener('click', () => $('appendFileInput').click());
    $('appendFileInput').addEventListener('change', handleAppendFile);
    $('confirmAppend').addEventListener('click', confirmAppend);
    $('cancelAppend').addEventListener('click', () => closeModal('appendModal'));
    $('addVocabulary').addEventListener('click', () => openEntry());
    $('exportVocabulary').addEventListener('click', exportJson);
    $('saveVocabulary').addEventListener('click', saveFile);
    if (!canWriteFile()) $('saveVocabulary').title = 'This browser cannot write files: the file is downloaded instead.';
    $('resetVocabulary').addEventListener('click', reset);
    $('entryForm').addEventListener('submit', submit);
    document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));
    load();
});
