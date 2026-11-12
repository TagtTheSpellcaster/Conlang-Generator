// Finds the derivations and compounds hidden in the English dictionary and writes data/derivations.json.
//   node tools/derivation/build.mjs          write data/derivations.json
//   node tools/derivation/build.mjs --list   print every pair, for review
// Pairs come from (1) suffix and prefix rules checked against the dictionary itself (a base must exist, with the right part of speech),
// and (2) two-word lemmas whose words are both dictionary entries (compounds). tools/derivation/exceptions.txt removes false friends
// (flow -> flower) and adds pairs the rules cannot see; one line per pair: "- derived" removes it, "+ type derived < base [+ base2]" adds it.
import fs from 'node:fs';
const here = new URL('./', import.meta.url), root = new URL('../../', import.meta.url);
const vocabulary = JSON.parse(fs.readFileSync(new URL('data/vocabulary.json', root), 'utf8')).vocabulary;

// [suffix or prefix, base POS, derived POS, type, spelling changes tried on the base]
const SUFFIX = [
    ['er', ['verb'], 'noun', 'agent'], ['or', ['verb'], 'noun', 'agent'], ['ist', ['noun'], 'noun', 'agent'], ['ian', ['noun'], 'noun', 'agent'],
    ['ing', ['verb'], 'noun', 'act'], ['ation', ['verb'], 'noun', 'act'], ['ment', ['verb'], 'noun', 'result'], ['age', ['verb', 'noun'], 'noun', 'result'], ['ance', ['verb'], 'noun', 'result'], ['ence', ['verb'], 'noun', 'result'],
    ['ness', ['adjective'], 'noun', 'quality'], ['ity', ['adjective'], 'noun', 'quality'], ['th', ['adjective'], 'noun', 'quality'],
    ['ship', ['noun'], 'noun', 'abstract'], ['hood', ['noun'], 'noun', 'abstract'], ['dom', ['noun'], 'noun', 'abstract'], ['ism', ['noun'], 'noun', 'abstract'],
    ['ery', ['noun'], 'noun', 'place'], ['ry', ['noun'], 'noun', 'place'],
    ['let', ['noun'], 'noun', 'diminutive'], ['ling', ['noun'], 'noun', 'diminutive'], ['ette', ['noun'], 'noun', 'diminutive'],
    ['ess', ['noun'], 'noun', 'feminine'],
    ['ful', ['noun'], 'adjective', 'adjective'], ['y', ['noun'], 'adjective', 'adjective'], ['ous', ['noun'], 'adjective', 'adjective'], ['al', ['noun'], 'adjective', 'adjective'], ['ic', ['noun'], 'adjective', 'adjective'],
    ['ish', ['noun'], 'adjective', 'adjective'], ['en', ['noun'], 'adjective', 'adjective'], ['ive', ['verb'], 'adjective', 'adjective'], ['able', ['verb'], 'adjective', 'adjective'], ['ary', ['noun'], 'adjective', 'adjective'],
    ['less', ['noun'], 'adjective', 'privative'],
    ['ly', ['adjective'], 'adverb', 'adverb'],
    ['ize', ['noun', 'adjective'], 'verb', 'causative'], ['ify', ['noun', 'adjective'], 'verb', 'causative'], ['en', ['adjective'], 'verb', 'causative']
];
const PREFIX = [['un', ['adjective', 'verb'], null, 'negative'], ['dis', ['verb', 'adjective'], null, 'negative'], ['in', ['adjective'], 'adjective', 'negative'], ['re', ['verb'], 'verb', 'repetitive'], ['mis', ['verb'], 'verb', 'wrongly'], ['over', ['verb', 'adjective'], null, 'excess'], ['under', ['verb'], 'verb', 'deficit']];

const byLemma = new Map();
for (const e of vocabulary) { if (!byLemma.has(e.lemma)) byLemma.set(e.lemma, []); byLemma.get(e.lemma).push(e); }
const find = (lemma, poses) => (byLemma.get(lemma) ?? []).find(e => poses.includes(e.pos) && !e.gloss);
const stems = (word, suffix) => {
    const s = word.slice(0, -suffix.length);
    return [...new Set([s, s + 'e', s.replace(/(.)\1$/, '$1'), s.replace(/i$/, 'y'), s.replace(/iv$/, 'e'), s.replace(/at$/, 'e'), s.replace(/at$/, ''), s + 'y'])];
};

const pairs = new Map();   // derived id -> { id, type, bases: [ids], via }
const set = (derived, type, bases, via) => { if (!pairs.has(derived.id)) pairs.set(derived.id, { derived: derived.id, type, bases: bases.map(b => b.id), via, d: derived.lemma, b: bases.map(b => b.lemma).join(' + ') }); };

for (const e of vocabulary) {
    if (/ /.test(e.lemma) || e.gloss) continue;
    for (const [suf, bpos, dpos, type] of SUFFIX) {
        if (e.pos !== dpos || !e.lemma.endsWith(suf) || e.lemma.length < suf.length + 3) continue;
        const base = stems(e.lemma, suf).map(s => s !== e.lemma && find(s, bpos)).find(Boolean);
        if (base) { set(e, type, [base], `-${suf}`); break; }
    }
    if (pairs.has(e.id)) continue;
    for (const [pre, bpos, dpos, type] of PREFIX) {
        if (!e.lemma.startsWith(pre) || e.lemma.length < pre.length + 3) continue;
        if (dpos && e.pos !== dpos) continue;
        const base = find(e.lemma.slice(pre.length), bpos);
        if (base && (dpos || base.pos === e.pos)) { set(e, type, [base], `${pre}-`); break; }
    }
}
// compounds: "night watch" = night + watch; the head is the last word
const HEAD_OK = new Set(['noun']), MOD_OK = new Set(['noun', 'adjective']);
for (const e of vocabulary) {
    if (!/^\S+ \S+$/.test(e.lemma) || e.pos !== 'noun' || e.gloss) continue;
    const [m, h] = e.lemma.split(' ');
    const head = find(h, ['noun']), mod = find(m, ['noun', 'adjective']);
    // participles and derived adjectives (enchanted blade, throwing axe, motherly love) are phrases, not compounds
    if (!head || !mod) continue;
    if (mod.pos === 'adjective' && /(ed|ing|ful|ly|al|ic|ous|ive|less)$/.test(m)) continue;
    if (m.endsWith('ing') || m.endsWith('ed')) continue;
    if (head && mod && HEAD_OK.has(head.pos) && MOD_OK.has(mod.pos) && mod.id !== e.id && head.id !== e.id) set(e, 'compound', [mod, head], 'compound');
}
// exceptions
const byId = new Map(vocabulary.map(e => [e.id, e]));
const lines = fs.existsSync(new URL('exceptions.txt', here)) ? fs.readFileSync(new URL('exceptions.txt', here), 'utf8').split('\n') : [];
for (const line of lines.map(l => l.trim()).filter(l => l && !l.startsWith('#'))) {
    if (line.startsWith('- ')) { for (const w of line.slice(2).split(/[,\s]+/).filter(Boolean)) for (const [k, p] of pairs) if (p.d === w || p.derived === w) pairs.delete(k); }
    else if (line.startsWith('+ ')) {
        const m = line.match(/^\+ (\S+) (\S+) < (\S+)(?: \+ (\S+))?$/);
        if (!m) throw new Error(`exceptions.txt: cannot read "${line}"`);
        const [, type, d, b1, b2] = m;
        const de = find(d, ['noun', 'verb', 'adjective', 'adverb']), bases = [b1, b2].filter(Boolean).map(b => find(b, ['noun', 'verb', 'adjective']));
        if (!de || bases.some(b => !b)) throw new Error(`exceptions.txt: unknown word in "${line}"`);
        pairs.delete(de.id); set(de, type, bases, 'listed');
    }
}
const list = [...pairs.values()].sort((a, b) => a.type.localeCompare(b.type) || a.d.localeCompare(b.d));
if (process.argv.includes('--list')) {
    const by = {}; for (const p of list) (by[p.type] ??= []).push(`${p.b}→${p.d}`);
    for (const [t, l] of Object.entries(by)) console.log(`\n## ${t} (${l.length})\n${l.join(', ')}`);
    process.exit(0);
}
fs.writeFileSync(new URL('data/derivations.json', root), `{\n "version": 1,\n "derivations": [\n${list.map(p => '  ' + JSON.stringify({ id: p.derived, type: p.type, bases: p.bases })).join(',\n')}\n ]\n}\n`);
console.log(`wrote data/derivations.json: ${list.length} derivations`);
