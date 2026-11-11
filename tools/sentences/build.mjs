// Compiles the sentence sources (tools/sentences/*.txt) into data/sentence-templates.json.
// Every lemma reference is checked against data/vocabulary.json; any unknown reference aborts the build.
//
// Source format
//   @universal | @genre war      which list the following sentences belong to
//   ## Topic name                 groups sentences in the interface
//   English text | S=... | V=... | O=... | A=... | B=... | init=... | mood=imperative | tense=future | seq=init,V,S | req=plural
//
// Noun phrase (S, O, A, B, init): space-separated tokens
//   the | a                  article            my your his her our their      possessor
//   +big|small               adjective (alternatives separated by |)           pl   plural number   du   dual number
//   head                     lemma:pos, alternatives separated by |, "_" stands for a space (war_of_position:n)
//   pos letters: n noun, v verb, a adjective, adv adverb, p particle, c conjunction, d determiner, pr pronoun
//   pronoun aliases: I YOU WE YOU_PL THEY HE SHE IT ME YOU_O THIS THAT WHO WHAT WHERE HOW WHY
//   cmp                      comparative degree of the adjective head (suffix, or the word "more")
//   prepositional phrase     adp>noun phrase      e.g. to>the village:n   with>ME   (than:c>ME marks the standard of comparison)
// Verb phrase (V): lemma:v[|lemma:v] with optional flags after "/": neg, can, prog (progressive), perf (perfect)   e.g. enter:v/neg,can
// Other slots: q=yn (yes/no question particle), mood=imperative|optative
// Subordinate clauses: comp=that:c ~ S=... ~ V=...  (complement, fills the object slot)
//                      adv=because:c ~ S=... ~ V=... (adverbial clause: because, if, when...)
// init takes several noun phrases separated by ";" and is placed first by default (interjections, question words)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex } from '../../src/syntax/realize.js';
import { GENRE_IDS } from '../../src/genres.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const vocabulary = JSON.parse(fs.readFileSync(path.join(root, 'data/vocabulary.json'), 'utf8')).vocabulary;
const index = buildIndex(vocabulary);

const POS = { n: 'noun', v: 'verb', a: 'adjective', adv: 'adverb', p: 'particle', c: 'conjunction', d: 'determiner', pr: 'pronoun', ad: 'adposition', num: 'numeral' };
const PRONOUN = {
    I: 'pronoun.first_person_singular', YOU: 'pronoun.second_person_singular', WE: 'pronoun.first_person_plural', YOU_PL: 'pronoun.second_person_plural',
    THEY: 'pronoun.third_person_plural', HE: 'pronoun.third_person_singular_male', SHE: 'pronoun.third_person_singular_female', IT: 'pronoun.third_person_singular_neutral',
    ME: 'pronoun.first_person_singular_object', YOU_O: 'pronoun.second_person_singular_object', THIS: 'demonstrative.this', THAT: 'demonstrative.that',
    WHO: 'interrogative.who', WHAT: 'interrogative.what', WHERE: 'interrogative.where', HOW: 'interrogative.how', WHY: 'interrogative.why'
};
const POSSESSIVES = new Set(['my', 'your', 'his', 'her', 'our', 'their']);
const CASE_OF = { to: 'dative', for: 'dative', from: 'ablative', in: 'locative', at: 'locative', on: 'locative', with: 'instrumental', of: 'genitive', 'than:c': 'ablative' };

const errors = [];
const missing = new Set();
let where = '';
const fail = msg => errors.push(`${where}: ${msg}`);

function ref(token, defaultPos) {
    if (PRONOUN[token]) return PRONOUN[token];
    const m = token.match(/^(.+?):(\w+)$/);
    const lemma = (m ? m[1] : token).replace(/_/g, ' ');
    const pos = m ? POS[m[2]] : POS[defaultPos];
    if (!pos) { fail(`unknown part of speech in "${token}"`); return token; }
    const id = `${lemma}:${pos}`;
    if (!index.resolve(id)) missing.add(id);
    return id;
}
const heads = (text, defaultPos) => {
    const list = text.split('|').map(t => ref(t, defaultPos));
    return list.length === 1 ? list[0] : list;
};

function parseNP(text) {
    const np = {};
    for (const tok of text.trim().split(/\s+/)) {
        if (tok === 'the') np.det = 'definite';
        else if (tok === 'a') np.det = 'indefinite';
        else if (POSSESSIVES.has(tok)) np.poss = `${tok}:determiner`;
        else if (tok === 'cmp') np.degree = 'comparative';
        else if (tok === 'pl') np.number = 'plural';
        else if (tok === 'du') np.number = 'dual';
        else if (tok.startsWith('+')) np.adj = heads(tok.slice(1), 'a');
        else { if (np.head) fail(`two heads in "${text}"`); np.head = heads(tok, 'n'); }
    }
    if (!np.head) fail(`noun phrase without head: "${text}"`);
    // key order: head first, as in the older template files
    const { head, ...rest } = np;
    return { head, ...rest };
}
function parseSlot(text) {
    if (!text.includes('>')) return parseNP(text);
    const [adp, rest] = text.split('>');
    return { adp: ref(adp.includes(':') ? adp.trim() : `${adp.trim()}:ad`), case: CASE_OF[adp.trim()] ?? 'locative', np: parseNP(rest) };
}
function parseVerb(text) {
    const [h, flags = ''] = text.trim().split('/');
    const v = { head: heads(h, 'v') };
    for (const f of flags.split(',').map(x => x.trim()).filter(Boolean)) {
        if (f === 'neg') v.neg = true; else if (f === 'can') v.aux = 'can:particle';
        else if (f === 'prog') v.aspect = 'progressive'; else if (f === 'perf') v.aspect = 'perfect'; else fail(`unknown verb flag "${f}"`);
    }
    return v;
}

const SLOT_ORDER = ['en', 'requires', 'mood', 'tense', 'q', 'seq', 'initial', 'S', 'V', 'O', 'A', 'B', 'comp', 'adv'];

// Fills template t from "key=value" slots. Subordinate clauses (comp, adv) are written "conj ~ slot ~ slot" and parsed recursively.
function parseSlots(slots, t, inClause) {
    const SEQ = { init: 'initial' };
    for (const s of slots) {
        const i = s.indexOf('=');
        if (i < 0) { fail(`bad slot "${s}"`); continue; }
        const key = s.slice(0, i).trim(), val = s.slice(i + 1).trim();
        if (key === 'S' || key === 'O' || key === 'A' || key === 'B') t[key] = parseSlot(val);
        else if (key === 'V') t.V = parseVerb(val);
        else if (key === 'init') t.initial = val.split(';').map(parseNP);
        else if (key === 'mood') t.mood = val;
        else if (key === 'tense') t.tense = val;
        else if (key === 'q') { if (val !== 'yn') fail(`unknown question type "${val}"`); t.q = 'yesno'; }
        else if (key === 'seq') t.seq = val.split(',').map(x => SEQ[x.trim()] ?? x.trim());
        else if (key === 'req') t.requires = { number: val };
        else if ((key === 'comp' || key === 'adv') && !inClause) {
            const [conj, ...rest] = val.split(' ~ ').map(x => x.trim());
            const clause = {};
            parseSlots(rest, clause, true);
            t[key] = { conj: ref(conj, 'c'), clause: Object.fromEntries(SLOT_ORDER.filter(k => k in clause).map(k => [k, clause[k]])) };
        } else fail(`unknown slot "${key}"`);
    }
}

function parseLine(line) {
    const [english, ...slots] = line.split(' | ').map(x => x.trim());
    const t = { en: english };
    parseSlots(slots, t, false);
    if (!t.S && !t.V && !t.O && !t.initial && !t.A) fail('empty sentence');
    return Object.fromEntries(SLOT_ORDER.filter(k => k in t).map(k => [k, t[k]]));
}

const universal = [];
const genres = {};
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort();
for (const f of files) {
    let target = null, topic = null, prefix = '';
    fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((raw, ln) => {
        const line = raw.trim();
        where = `${f}:${ln + 1}`;
        if (!line || (line.startsWith('#') && !line.startsWith('##'))) return;
        if (line.startsWith('@universal')) { target = universal; prefix = 'u'; topic = null; return; }
        if (line.startsWith('@genre')) {
            const id = line.split(/\s+/)[1];
            if (!GENRE_IDS.includes(id)) { fail(`unknown genre "${id}"`); return; }
            target = genres[id] ??= []; prefix = id; topic = null; return;
        }
        if (line.startsWith('##')) { topic = line.slice(2).trim(); return; }
        if (!target || !topic) { fail('sentence before @universal/@genre and "## topic"'); return; }
        const t = parseLine(line);
        target.push({ id: `${prefix}${String(target.length + 1).padStart(2, '0')}`, topic, ...t });
    });
}

const unresolved = [...missing].sort();
if (unresolved.length) errors.push(`unknown vocabulary references (${unresolved.length}): ${unresolved.join(', ')}`);
const dupes = [];
for (const [name, list] of [['universal', universal], ...Object.entries(genres)]) {
    const seen = new Set();
    for (const t of list) { if (seen.has(t.en)) dupes.push(`${name}: ${t.en}`); seen.add(t.en); }
}
if (dupes.length) errors.push(`duplicate sentences: ${dupes.join('; ')}`);
if (errors.length) { console.error(errors.join('\n')); console.error('nothing written'); process.exit(1); }

const out = { version: 2, universal, genres };
// one template per line keeps the file reviewable
const lines = list => list.map(t => '    ' + JSON.stringify(t)).join(',\n');
const text = `{\n  "version": 2,\n  "universal": [\n${lines(universal)}\n  ],\n  "genres": {\n${Object.entries(genres).map(([id, l]) => `   ${JSON.stringify(id)}: [\n${lines(l)}\n   ]`).join(',\n')}\n  }\n}\n`;
fs.writeFileSync(path.join(root, 'data/sentence-templates.json'), text);
console.log(`universal: ${universal.length} sentences in ${new Set(universal.map(t => t.topic)).size} topics`);
for (const id of GENRE_IDS) console.log(`${id}: ${genres[id]?.length ?? 0}`);
void out;
