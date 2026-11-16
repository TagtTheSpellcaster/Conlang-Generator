// Which inflection class a word belongs to, and which words have an irregular stem.
// Classes follow the last sound of the stem in the mother language (its "theme"), as in Latin or Russian, with a few
// words that belong to another class for no reason the form shows. Suppletion (go ~ went) comes from two old paradigms that merged.
import { hash, rng } from '../core/rng.js';
import { createWordFactory } from '../phonology/words.js';

const GROUP = { noun: ['noun', 'adjective'], verb: ['verb'] };

export function assignClasses(lexicon, overlays, spec) {
    const classMap = { exceptions: 0.08 };
    for (const [group, pos] of Object.entries(GROUP)) {
        const count = overlays?.[group]?.length ?? 1;
        if (count < 2) continue;
        const tally = new Map();
        let total = 0;
        for (const e of lexicon) if (pos.includes(e.pos) && !e.loan && e.protoForm) { const l = e.protoForm.slice(-1); tally.set(l, (tally.get(l) ?? 0) + 1); total++; }
        const letters = [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        // class 0 takes about half of the words, the others share the rest
        const target = Array.from({ length: count }, (_, k) => (k === 0 ? 0.5 : 0.5 / (count - 1)) * total);
        const filled = Array(count).fill(0);
        const map = {};
        for (const [l, n] of letters) {
            if (n < total * 0.01) { map[l] = hash(`${spec.seed}|class letter|${l}`) % count; continue; }
            let best = 0;
            for (let k = 1; k < count; k++) if (target[k] - filled[k] > target[best] - filled[best]) best = k;
            map[l] = best; filled[best] += n;
        }
        classMap[group] = map;
    }
    return classMap;
}

// Suppletive stems: for a few frequent words one tense (or the comparative) has an unrelated stem.
export function buildSuppletion(lexicon, spec, hasVerbMorphology) {
    const r = rng(`${spec.seed}|suppletion`);
    const make = createWordFactory({ ...spec, seed: `${spec.seed}|suppletion` });
    const taken = new Set(lexicon.map(e => e.form));
    const fresh = () => { for (let i = 0; i < 30; i++) { const w = make({ short: true }); if (!taken.has(w)) { taken.add(w); return w; } } return null; };
    const find = (lemma, pos) => lexicon.find(e => e.lemma === lemma && e.pos === pos && !e.gloss && !e.loan);
    const out = {};
    if (hasVerbMorphology) {
        for (const [lemma, p] of [['be', 0.85], ['go', 0.7], ['come', 0.35], ['have', 0.35], ['give', 0.15]]) {
            const e = find(lemma, 'verb');
            if (!e || r() >= p) continue;
            const entry = {};
            const past = fresh(); if (past) entry.past = past;
            if (r() < 0.2) { const future = fresh(); if (future) entry.future = future; }
            if (Object.keys(entry).length) out[e.id] = entry;
        }
    }
    for (const [lemma, p] of [['good', 0.7], ['bad', 0.5]]) {
        const e = find(lemma, 'adjective');
        if (!e || r() >= p) continue;
        const w = fresh(); if (w) out[e.id] = { comparative: w };
    }
    return out;
}
