// Historical sound change (prototype). The generated language is treated as the proto-language; one daughter
// language is derived by applying 8–12 ordered, dated sound changes to every word (forward direction only).
// Derived words are changed as whole words, so alternations between related words appear by themselves.
import { rng } from '../core/rng.js';
import { resolvePhonotactics } from '../phonology/words.js';
import { attach } from '../morphology/inflect.js';
import { numeralValue, numeralEntryForm } from '../numerals/system.js';

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
        apply: (re => w => tokens(w, t => t.replace(re, 'r')))(new RegExp(`(?<=[${c.vc}])s(?=[${c.vc}])`, 'g'))
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
        apply: (re => w => tokens(w, t => t.replace(re, '$1$2')))(new RegExp(`([^${c.vc}])[^${c.vc}]([^${c.vc}])`, 'g'))
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

// Runs the rules, oldest first, over a list of distinct forms. A rule that would make a word identical to another word
// leaves that word as it was (the contrast is kept: the speakers' rule is blocked by the existing word).
function run(rules, forms, isV) {
    let stage = forms.slice();
    const trace = forms.map(() => []), blocked = forms.map(() => []);
    const perRule = [];
    for (const rule of rules) {
        const next = stage.map(f => { const o = rule.apply(f); return safe(f, o, isV) ? o : f; });
        const claimed = new Map();
        next.forEach((f, i) => { if (f === stage[i]) claimed.set(f, i); });
        let blockedHere = 0;
        next.forEach((f, i) => {
            if (f === stage[i]) return;
            if (claimed.has(f) && claimed.get(f) !== i) { blocked[i].push(rule.id); next[i] = stage[i]; blockedHere++; if (!claimed.has(stage[i])) claimed.set(stage[i], i); }
            else claimed.set(f, i);
        });
        const changed = [];
        next.forEach((f, i) => { if (f !== stage[i]) { trace[i].push(rule.id); changed.push(i); } });
        perRule.push({ changed, blocked: blockedHere, before: stage, after: next });
        stage = next;
    }
    return { stage, trace, blocked, perRule };
}

function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
}

const duplicates = list => list.length - new Set(list).size;

function build(spec, entries, salt, opts = {}) {
    const r = rng(`${spec.seed}|${opts.key ?? 'history'}|${salt}`);
    const ph = resolvePhonotactics(spec);
    const vowels = [...ph.vowels];
    const inV = new Set(vowels);
    const isV = ch => inV.has(ch);
    const all = new Set(entries.flatMap(e => [...e.form.replace(/ /g, '')]));
    const ctx = { vc: vowels.join(''), set: all, has: x => all.has(x), v: vowels.filter(x => all.has(x)), isV };
    const oneConsonant = ph.maxCluster === 1;
    const candidates = LIBRARY.filter(l => !(oneConsonant && ['syncope', 'simplification'].includes(l.id)) && !(opts.avoid?.has(l.id))).map(l => ({ l, i: r() })).sort((a, b) => a.i - b.i).map(({ l }) => {
        const m = l.make(r, ctx);
        return m ? { id: l.id, phase: l.phase, group: l.group, ...m } : null;
    }).filter(Boolean);
    const target = 8 + Math.floor(r() * 5);
    const forms = entries.map(e => e.form);
    let chosen = [];
    const groups = new Set();
    for (const cand of candidates) {
        if (chosen.length >= target) break;
        if (groups.has(cand.group)) continue;
        const trial = [...chosen, cand].sort((a, b) => a.phase - b.phase);
        const res = run(trial, forms, isV);
        const k = trial.indexOf(cand);
        const share = res.perRule[k].changed.length / forms.length;
        const blockedShare = res.blocked.filter(b => b.length).length / forms.length;
        if (share < 0.015 || share > 0.85 || blockedShare > 0.05) continue;
        // the daughter keeps the character of the mother: about as many open-ended words, about as long
        const vf = ws => ws.filter(w => isV(w[w.length - 1])).length / ws.length, len = ws => ws.reduce((n, w) => n + w.length, 0) / ws.length;
        if (vf(res.stage) < vf(forms) - 0.1 || len(res.stage) < len(forms) * 0.87) continue;
        chosen = trial; groups.add(cand.group);
    }
    const res = run(chosen, forms, isV);
    const span = 500 + Math.floor(r() * 1200);
    const years = chosen.map((rule, i) => Math.round((span * (1 - (i + r() * 0.8) / chosen.length) + 80) / 10) * 10);
    for (let i = 1; i < years.length; i++) if (years[i] >= years[i - 1]) years[i] = years[i - 1] - 10;
    const rules = chosen.map((rule, i) => {
        const ch = res.perRule[i].changed;
        const j = ch[0];
        return { id: rule.id, label: rule.label, years: years[i], words: ch.length, blocked: res.perRule[i].blocked, example: j === undefined ? null : `*${res.perRule[i].before[j]} → ${res.perRule[i].after[j]}` };
    });
    const convert = w => chosen.reduce((acc, ru) => { const o = ru.apply(acc); return safe(acc, o, isV) ? o : acc; }, w);
    const traceOf = w => { const ids = []; let acc = w; for (const ru of chosen) { const o = ru.apply(acc); if (safe(acc, o, isV) && o !== acc) { ids.push(ru.id); acc = o; } } return ids; };
    const blockedWords = res.blocked.filter(b => b.length).length;
    return { chosen, years, rules, stage: res.stage, trace: res.trace, blocked: res.blocked, convert, traceOf, blockedWords, span, isV, duplicates: duplicates(res.stage) };
}

// Several rule sets are tried; the one that blocks the fewest words and leaves no duplicate wins.
function bestBuild(spec, entries, opts) {
    let best = null;
    for (let salt = 0; salt < 12; salt++) {
        const h = build(spec, entries, salt, opts);
        h.attempts = salt + 1;
        const ok = h.rules.length >= 8 && h.duplicates === 0 && h.blockedWords / entries.length <= 0.05;
        if (ok) return h;
        if (!best || (h.rules.length >= best.rules.length && h.blockedWords < best.blockedWords)) best = h;
    }
    return best;
}

const SKIP_KEYS = new Set(['mode', 'order']);

// A deep copy of an affix table with every form passed through f (injectively: a form that would merge with another is kept).
function mapAffixes(node, f) {
    if (typeof node === 'string') return f(node);
    if (Array.isArray(node)) return node.map(x => mapAffixes(x, f));
    if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, SKIP_KEYS.has(k) ? v : mapAffixes(v, f)]));
    return node;
}

// Injective version of a conversion over a known set of strings: when two distinct forms would become one, or a form
// would become another existing form or a word of the lexicon, the later one keeps its old shape.
function injective(convert, inputs, taken = new Set()) {
    const memo = new Map(), used = new Map();
    for (const t of taken) used.set(t, null);
    for (const x of inputs) if (x) used.set(x, x);
    for (const x of inputs) {
        if (!x || memo.has(x)) continue;
        let o = convert(x);
        if (o !== x && used.has(o)) o = x;
        else if (o !== x) used.set(o, x);
        memo.set(x, o);
    }
    return w => memo.get(w) ?? w;
}

const leaves = node => typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(leaves) : node && typeof node === 'object' ? Object.entries(node).flatMap(([k, v]) => SKIP_KEYS.has(k) ? [] : leaves(v)) : [];

// Turns the language that was generated (the mother) into its daughter. Returns the daughter's lexicon, derivational
// affixes and numeral system, a function that converts any other form (inflectional affixes) and the account of the change.
export function deriveDaughter(spec, lexicon, derivationAffixes, numerals) {
    const isNumeral = e => numeralValue(e) !== undefined;
    const words = lexicon.filter(e => !isNumeral(e));
    const h = bestBuild(spec, words);
    // The sister: the same mother, other changes (two of the daughter's rules may recur: sisters often share innovations)
    const rs = rng(`${spec.seed}|sister|share`);
    const shared = h.rules.map(x => x.id).sort(() => rs() - 0.5).slice(0, 2);
    const avoid = new Set(h.rules.map(x => x.id).filter(id => !shared.includes(id)));
    const sh = bestBuild(spec, words, { key: 'sister', avoid });
    const wordForm = new Map(words.map((e, i) => [e.id, h.stage[i]]));
    const lexTaken = new Set(h.stage);
    const strings = [...Object.values(numerals.roots), ...Object.values(numerals.words), ...(numerals.classifiers ?? []).map(c => c.form), ...Object.values(derivationAffixes).map(a => a.form)];
    const conv = injective(h.convert, new Set(strings), lexTaken);
    const mapRoots = o => Object.freeze(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, conv(v)])));
    const system = Object.freeze({
        ...numerals, roots: mapRoots(numerals.roots), words: mapRoots(numerals.words),
        classifiers: numerals.classifiers && Object.freeze(numerals.classifiers.map(c => ({ ...c, form: conv(c.form) })))
    });
    const halfOrdinals = numerals.config.halves ? Object.freeze(Object.fromEntries([3, 4, 5].map(k => [k, system.roots[k] + attach(system.roots[k], system.words.ordinal, spec)]))) : numerals.halfOrdinals;
    const dNumerals = Object.freeze({ ...system, halfOrdinals });
    const dAffixes = Object.fromEntries(Object.entries(derivationAffixes).map(([t, a]) => [t, { ...a, protoForm: a.form, form: conv(a.form) }]));
    // lexicon: words by the rules, numeral entries recomposed from the daughter's numeral system
    let lex = lexicon.map(e => {
        if (!isNumeral(e)) return { ...e, protoForm: e.form, form: wordForm.get(e.id) };
        const form = numeralEntryForm(dNumerals, e, spec);
        return { ...e, protoForm: e.form, form: form ?? e.form };
    });
    lex = lex.map(e => e.id === 'adjective.many' && dNumerals.config.type === 'restricted' ? { ...e, form: dNumerals.words.many } : e);
    // a composed numeral may now coincide with a word: the word keeps its older shape, or is lengthened
    const seen = new Map();
    const fixed = [];
    for (const e of lex.filter(isNumeral)) seen.set(e.form, e.id);
    for (const x of [...Object.values(dNumerals.roots), ...Object.values(dNumerals.words), ...(dNumerals.classifiers ?? []).map(c => c.form), ...Object.values(dAffixes).map(a => a.form)]) if (!seen.has(x)) seen.set(x, '#');
    lex = lex.map(e => {
        if (isNumeral(e)) return e;
        let form = e.form;
        for (let i = 0; seen.has(form) && seen.get(form) !== e.id && i < 20; i++) form = i === 0 ? e.protoForm : form + attach(form, dNumerals.words.ordinal ?? 'a', spec);
        if (form !== e.form) fixed.push(e.id);
        seen.set(form, e.id);
        return { ...e, form };
    });
    const trace = new Map(words.map((e, i) => [e.id, { rules: h.trace[i], blocked: h.blocked[i] }]));
    const letters = ws => new Set(ws.flatMap(x => [...x.replace(/ /g, '')]));
    const before = letters(lexicon.map(e => e.protoForm ?? e.form)), after = letters(lex.map(e => e.form));
    const inventory = { lost: [...before].filter(x => !after.has(x)).sort(), gained: [...after].filter(x => !before.has(x)).sort() };
    const entries = lex.map(e => {
        const t = trace.get(e.id);
        return {
            id: e.id, lemma: e.lemma, pos: e.pos, proto: e.protoForm, daughter: e.form,
            changes: t ? t.rules : (e.protoForm === e.form ? [] : ['numeral system']), blocked: t?.blocked ?? [],
            etymology: e.derivation ? `from *${e.derivation.parts.map(p => p.text).join(' + ')}` : null
        };
    });
    // roots that alternate: the derived word does not contain the daughter form of its base
    const byId = new Map(entries.map(x => [x.id, x]));
    const alternations = [];
    for (const e of lex) {
        const d = e.derivation;
        if (!d?.bases?.length || d.type === 'compound') continue;
        const base = byId.get(d.bases[0]);
        const mine = byId.get(e.id);
        if (!base || !mine) continue;
        const stem = base.daughter.slice(0, Math.max(2, base.daughter.length - 1));
        if (!mine.daughter.includes(stem) && base.proto !== base.daughter || (!mine.daughter.includes(stem) && mine.proto !== mine.daughter)) alternations.push({ base: base.daughter, derived: mine.daughter, baseProto: base.proto, derivedProto: mine.proto, lemmas: `${base.lemma} → ${mine.lemma}`, type: d.type });
    }
    const unchanged = entries.filter(x => x.proto === x.daughter).length;
    const history = {
        rules: h.rules, lexicon: entries, alternations: alternations.slice(0, 12), attempts: h.attempts, inventory,
        affixes: Object.entries(dAffixes).filter(([, a]) => !a.sharedWith).map(([type, a]) => ({ type, proto: a.protoForm, daughter: a.form, position: a.position })),
        stats: { words: entries.length, unchanged, blocked: h.blockedWords, repaired: fixed.length, rules: h.rules.length, span: h.span, alternations: alternations.length }
    };
    // inflectional affixes are generated afterwards (they avoid the daughter's words) and then converted
    const convertAffixes = (table, extraTaken = []) => mapAffixes(table, injective(h.convert, new Set(leaves(table)), new Set([...extraTaken, ...lexTaken, ...Object.values(dAffixes).map(a => a.form), ...Object.values(dNumerals.roots), ...Object.values(dNumerals.words)])));
    // a word that enters the language at a given date only undergoes the changes that come after it
    const later = (w, year) => h.chosen.reduce((acc, ru, i) => { if (h.years[i] >= year) return acc; const o = ru.apply(acc); return safe(acc, o, h.isV) ? o : acc; }, w);
    history.sister = { rules: sh.rules, stats: { rules: sh.rules.length, same: words.filter((e, i) => sh.stage[i] === h.stage[i]).length, words: words.length, attempts: sh.attempts } };
    const sisterExamples = (count, excluded = new Set()) => {
        const steps = (build_, i) => { let w = words[i].form; const out = []; build_.chosen.forEach((ru, k) => { if (!build_.trace[i].includes(ru.id)) return; const o = ru.apply(w); if (safe(w, o, build_.isV)) { w = o; out.push({ id: ru.id, years: build_.years[k], form: w }); } }); return out; };
        const rr = rng(`${spec.seed}|sister|examples`);
        const idx = words.map((e, i) => i).filter(i => !excluded.has(words[i].id) && words[i].form !== h.stage[i] && words[i].form !== sh.stage[i] && words[i].form.length >= 4);
        const dist = i => editDistance(h.stage[i], sh.stage[i]);
        const apart = idx.filter(i => h.stage[i] !== sh.stage[i]).sort((a, b) => dist(b) - dist(a));
        const together = idx.filter(i => h.stage[i] === sh.stage[i]);
        const derived = apart.filter(i => words[i].derivation);
        const chosenIdx = [...new Set([...apart.slice(0, Math.ceil(count * 0.4)), ...derived.slice(0, 3), ...apart.sort(() => rr() - 0.5).slice(0, count), ...together.sort(() => rr() - 0.5).slice(0, 2)])].slice(0, count);
        return chosenIdx.map(i => ({ id: words[i].id, lemma: words[i].lemma, etymology: words[i].derivation ? `*${words[i].derivation.parts.map(p => p.text).join(' + ')}` : null, mother: words[i].form, daughter: h.stage[i], sister: sh.stage[i], daughterSteps: steps(h, i), sisterSteps: steps(sh, i) }));
    };
    return { lexicon: lex, derivationAffixes: dAffixes, numerals: dNumerals, history, convertAffixes, convertWord: h.convert, traceWord: h.traceOf, later, sisterExamples };
}
