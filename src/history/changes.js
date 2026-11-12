// Historical sound change (prototype). The generated language is treated as the proto-language; one daughter
// language is derived by applying 8–12 ordered, dated sound changes to every word (forward direction only).
// Derived words are changed as whole words, so alternations between related words appear by themselves.
import { rng } from '../core/rng.js';
import { resolvePhonotactics } from '../phonology/words.js';

const VOICED = { p: 'b', t: 'd', k: 'g' };
const SPIRANT = { p: 'f', t: 's', k: 'h' };
const UMLAUT = { a: 'e', o: 'e', u: 'i' };
const DEVOICE = { b: 'p', d: 't', g: 'k', v: 'f', z: 's' };

// Applies f to each space-separated token (isolating compounds are written with spaces).
const tokens = (w, f) => w.split(' ').map(f).join(' ');
const letters = (set, list) => list.filter(x => set.has(x));

// Rule library. phase orders the rules in time (conditioned changes before the loss of their triggers).
// group: at most one rule per group. make(r, ctx) returns {label, apply} or null when not applicable to the inventory.
const LIBRARY = [
    { id: 'umlaut', phase: 1, group: 'umlaut', make: (r, c) => c.has('i') && c.v.length > 3 ? ({
        label: 'a o u → e e i before a following syllable with i (i-umlaut)',
        apply: w => tokens(w, t => [...t].map((ch, i, a) => UMLAUT[ch] && a.slice(i + 1).find(c.isV) === 'i' ? UMLAUT[ch] : ch).join(''))
    }) : null },
    { id: 'palatalization', phase: 1, group: 'pal', make: (r, c) => c.has('k') && (c.has('i') || c.has('e')) ? (() => { const to = c.has('ʃ') ? 'ʃ' : 's'; return {
        label: `k → ${to} before i, e`,
        apply: w => tokens(w, t => t.replace(/k(?=[ie])/g, to))
    }; })() : null },
    { id: 'lenition', phase: 2, group: 'lenV', make: (r, c) => letters(c.set, ['p', 't', 'k']).length >= 2 ? (() => { const L = letters(c.set, ['p', 't', 'k']); return {
        label: `${L.join(' ')} → ${L.map(x => VOICED[x]).join(' ')} between vowels`,
        apply: w => tokens(w, t => [...t].map((ch, i, a) => VOICED[ch] && L.includes(ch) && c.isV(a[i - 1] ?? '') && c.isV(a[i + 1] ?? '') ? VOICED[ch] : ch).join(''))
    }; })() : null },
    { id: 'spirantization', phase: 2, group: 'lenV', make: (r, c) => letters(c.set, ['p', 't', 'k']).length >= 2 ? (() => { const L = letters(c.set, ['p', 't', 'k']); return {
        label: `${L.join(' ')} → ${L.map(x => SPIRANT[x]).join(' ')} between vowels`,
        apply: w => tokens(w, t => [...t].map((ch, i, a) => L.includes(ch) && c.isV(a[i - 1] ?? '') && c.isV(a[i + 1] ?? '') ? SPIRANT[ch] : ch).join(''))
    }; })() : null },
    { id: 'rhotacism', phase: 2, group: 'rho', make: (r, c) => c.has('s') && c.has('r') ? ({
        label: 's → r between vowels',
        apply: w => tokens(w, t => t.replace(new RegExp(`(?<=[${c.vc}])s(?=[${c.vc}])`, 'g'), 'r'))
    }) : null },
    { id: 'h-loss', phase: 2, group: 'h', make: (r, c) => letters(c.set, ['h', 'ħ', 'ʕ']).length ? (() => { const L = letters(c.set, ['h', 'ħ', 'ʕ']); return {
        label: `${L.join(' ')} → ∅`,
        apply: w => tokens(w, t => [...t].filter(ch => !L.includes(ch)).join(''))
    }; })() : null },
    { id: 'glide', phase: 2, group: 'glide', make: (r, c) => c.has('w') ? ({
        label: 'w → v',
        apply: w => tokens(w, t => t.replace(/w/g, 'v'))
    }) : null },
    { id: 'nasal', phase: 2, group: 'nasal', make: (r, c) => c.has('n') && (c.has('p') || c.has('b') || c.has('k') || c.has('g')) ? ({
        label: 'n → m before p b; n → ŋ before k g',
        apply: w => tokens(w, t => t.replace(/n(?=[pb])/g, 'm').replace(/n(?=[kg])/g, 'ŋ'))
    }) : null },
    { id: 'syncope', phase: 3, group: 'syncope', make: (r, c) => c.v.length > 2 ? ({
        label: 'the vowel of the second syllable is lost between consonants',
        apply: w => tokens(w, t => { let n = -1; return [...t].filter((ch, i, a) => { if (!c.isV(ch)) return true; n++; return !(n === 1 && i > 0 && i < a.length - 1 && !c.isV(a[i - 1]) && !c.isV(a[i + 1]) && a.slice(i + 1).some(x => c.isV(x))); }).join(''); })
    }) : null },
    { id: 'merger', phase: 3, group: 'merge', make: (r, c) => { const pairs = [['e', 'i'], ['o', 'u'], ['æ', 'e'], ['ø', 'e'], ['y', 'i']].filter(([a, b]) => c.has(a) && c.has(b)); if (!pairs.length) return null; const [a, b] = pairs[Math.floor(r() * pairs.length)]; return {
        label: `${a} → ${b}`,
        apply: w => w.replaceAll(a, b)
    }; } },
    { id: 'apocope', phase: 4, group: 'final', make: (r, c) => ({
        label: 'the final vowel is lost',
        apply: w => tokens(w, t => { const a = [...t]; return a.length > 2 && c.isV(a[a.length - 1]) && a.filter(x => c.isV(x)).length > 1 && !c.isV(a[a.length - 2]) ? a.slice(0, -1).join('') : t; })
    }) },
    { id: 'final-raising', phase: 4, group: 'final', make: (r, c) => c.has('o') && c.has('u') || c.has('e') && c.has('i') ? ({
        label: 'final e, o → i, u',
        apply: w => tokens(w, t => t.replace(/e$/, 'i').replace(/o$/, 'u'))
    }) : null },
    { id: 'devoicing', phase: 4, group: 'devoice', make: (r, c) => letters(c.set, Object.keys(DEVOICE)).length ? ({
        label: 'b d g v z → p t k f s at the end of a word',
        apply: w => tokens(w, t => t.replace(/[bdgvz]$/, m => DEVOICE[m]))
    }) : null },
    { id: 's-loss', phase: 4, group: 's', make: (r, c) => c.has('s') ? ({
        label: 'final s → ∅',
        apply: w => tokens(w, t => t.length > 2 ? t.replace(/s$/, '') : t)
    }) : null },
    { id: 'simplification', phase: 5, group: 'cluster', make: (r, c) => ({
        label: 'of three consonants the middle one is lost',
        apply: w => tokens(w, t => t.replace(new RegExp(`([^${c.vc}])[^${c.vc}]([^${c.vc}])`, 'g'), '$1$2'))
    }) },
    { id: 'depalatalization', phase: 5, group: 'pal', make: (r, c) => c.has('ʃ') ? ({
        label: 'ʃ → s',
        apply: w => w.replaceAll('ʃ', 's')
    }) : null }
];

function safe(before, after, isV) {
    if (after === before) return true;
    if (!after) return false;
    for (const t of after.split(' ')) {
        if (!t || ![...t].some(isV) || [...t].length < 2) return false;
        let cr = 0, vr = 0;
        for (const ch of t) { if (isV(ch)) { vr++; cr = 0; } else { cr++; vr = 0; } if (cr > 3 || vr > 2) return false; }
    }
    return true;
}

const countMerged = forms => { const m = new Map(); forms.forEach(f => m.set(f, (m.get(f) ?? 0) + 1)); let n = 0; for (const v of m.values()) if (v > 1) n += v; return n; };

function build(spec, entries, affixes, salt) {
    const r = rng(`${spec.seed}|history|${salt}`);
    const ph = resolvePhonotactics(spec);
    const vowels = [...ph.vowels];
    const inV = new Set(vowels);
    const isV = ch => inV.has(ch);
    const all = new Set(entries.flatMap(e => [...e.form.replace(/ /g, '')]));
    const ctx = { vc: vowels.join(''), set: all, has: x => all.has(x), v: vowels.filter(x => all.has(x)), isV };
    const apply = (rule, w) => { const out = rule.apply(w); return safe(w, out, isV) ? out : w; };

    const candidates = LIBRARY.map(l => ({ l, i: r() })).sort((a, b) => a.i - b.i).map(({ l }) => {
        const m = l.make(r, ctx);
        return m ? { id: l.id, phase: l.phase, group: l.group, ...m } : null;
    }).filter(Boolean);
    const target = 8 + Math.floor(r() * 5);
    const forms = entries.map(e => e.form);
    const chosen = [], groups = new Set();
    for (const cand of candidates) {
        if (chosen.length >= target) break;
        if (groups.has(cand.group)) continue;
        const trial = [...chosen, cand].sort((a, b) => a.phase - b.phase);
        let cur = forms.slice(), step = null;
        for (const rule of trial) { const next = cur.map(f => apply(rule, f)); if (rule === cand) step = next.reduce((n, f, i) => n + (f !== cur[i]), 0); cur = next; }
        const share = step / forms.length;
        if (share < 0.015 || share > 0.85) continue;
        if (countMerged(cur) / forms.length > 0.03) continue;
        chosen.push(cand); groups.add(cand.group);
        chosen.sort((a, b) => a.phase - b.phase);
    }
    // dates: years before the present, decreasing along the sequence
    const span = 500 + Math.floor(r() * 1200);
    const dated = chosen.map((rule, i) => ({ rule, years: Math.round((span * (1 - (i + r() * 0.8) / chosen.length) + 80) / 10) * 10 }));
    for (let i = 1; i < dated.length; i++) if (dated[i].years >= dated[i - 1].years) dated[i].years = dated[i - 1].years - 10;

    const trace = new Map();
    let stage = forms.slice();
    const rules = dated.map(({ rule, years }) => {
        let example = null, changed = 0;
        const next = stage.map((f, i) => { const o = apply(rule, f); if (o !== f) { changed++; example ??= `*${f} → ${o}`; (trace.get(i) ?? trace.set(i, []).get(i)).push(rule.id); } return o; });
        stage = next;
        return { id: rule.id, label: rule.label, years, words: changed, example };
    });
    const lexicon = entries.map((e, i) => ({
        lemma: e.lemma, pos: e.pos, proto: e.form, daughter: stage[i], changes: trace.get(i) ?? [],
        etymology: e.derivation ? `from *${e.derivation.parts.map(p => p.text).join(' + ')}` : null
    }));
    const affixList = Object.entries(affixes ?? {}).filter(([, a]) => !a.sharedWith).map(([type, a]) => ({ type, proto: a.form, position: a.position, daughter: rules.reduce((w, ru) => apply(chosen.find(c => c.id === ru.id), w), a.form) }));
    const merged = countMerged(stage);
    return {
        rules, lexicon, affixes: affixList,
        stats: { words: lexicon.length, unchanged: lexicon.filter(w => w.proto === w.daughter).length, merged, rules: rules.length, span }
    };
}

// Several attempts: the one with the fewest merged homophones wins (a rule set that collapses the lexicon is rejected).
export function buildHistory(spec, lexicon, affixes) {
    const entries = lexicon.filter(e => e.form);
    let best = null;
    for (let salt = 0; salt < 12; salt++) {
        const h = build(spec, entries, affixes, salt);
        const ok = h.stats.rules >= 8 && h.stats.merged / h.stats.words <= 0.03;
        if (ok) return { ...h, attempts: salt + 1 };
        if (!best || (h.stats.rules >= best.stats.rules && h.stats.merged < best.stats.merged)) best = { ...h, attempts: salt + 1 };
    }
    return best;
}
