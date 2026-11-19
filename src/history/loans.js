// Loanwords. They enter the daughter language after the mother has split from the rest of the family, so they come
// from other languages (not from the mother), are adapted to the sounds of the daughter, and only undergo the sound changes
// that happen after their date: *bellum -> bellico, but guerra from Frankish.
import { rng } from '../core/rng.js';
import { createWordFactory } from '../phonology/words.js';
import { MODEL, VOWELS } from '../phonology/models.js';
import { attach } from '../morphology/inflect.js';
import { numeralValue } from '../numerals/system.js';

// How readily a language takes words from outside (share of its lexicon, before the random factor).
const ABSORBENCY = { orcish: 0.03, giant: 0.03, undead: 0.03, hive: 0.02, machine: 0.04, fey: 0.04, draconic: 0.04, dwarven: 0.05, infernal: 0.07, women: 0.07, artisan: 0.07, war: 0.09, arcane: 0.09, sacred: 0.09, thieves: 0.10, nomad: 0.10, marine: 0.13, merchant: 0.18 };
const DEFAULT_ABSORBENCY = 0.08;

export const DONOR_ROLES = {
    conqueror: { label: 'ruling neighbour', gloss: 'war, arms, government, law, building', weights: { war: 3, weapon: 2.5, society: 1.8, abstract: 1.2, settlement: 1.5, technology: 0.8, craft: 0.6 }, rest: 0.35 },
    trade: { label: 'trading partner', gloss: 'goods, food, cloth, ships, crafts', weights: { food: 2.5, material: 2.5, object: 2, clothing: 2, transport: 2, maritime: 2, craft: 1.6, technology: 1.5, household: 1.5, music: 1.2, society: 1 }, rest: 0.3 },
    sacred: { label: 'liturgical language', gloss: 'religion, magic, abstract and learned words', weights: { faith: 4, magic: 2.6, abstract: 2, time: 1.2, music: 1.5, technology: 0.8 }, rest: 0.12 },
    neighbour: { label: 'neighbouring people', gloss: 'animals, plants, food, everyday things', weights: { nature: 2, animal: 2.5, food: 1.5, household: 1.5, family: 0.8, settlement: 1, quality: 0.6, clothing: 1, action: 0.7 }, rest: 0.35 }
};
const ROLE_ORDER = {
    war: ['conqueror', 'neighbour', 'trade'], merchant: ['trade', 'neighbour', 'conqueror'], sacred: ['sacred', 'neighbour', 'trade'], arcane: ['sacred', 'trade'],
    marine: ['trade', 'neighbour', 'conqueror'], orcish: ['neighbour', 'conqueror'], nomad: ['neighbour', 'trade', 'conqueror'], thieves: ['neighbour', 'trade', 'conqueror'], dwarven: ['trade', 'neighbour'], infernal: ['sacred', 'conqueror']
};
const NEVER = new Set(['grammar', 'number', 'need']);

// nearest sound of the daughter for a sound it does not have
const NEAREST = { ʃ: 'sʃ', θ: 'ts', ŋ: 'nm', ħ: 'hk', ʕ: 'h', ø: 'eo', æ: 'ae', y: 'iu', z: 'sd', v: 'bfw', w: 'vu', j: 'i', f: 'ph', g: 'kb', b: 'pv', d: 'tz', p: 'bf', k: 'gh', h: 'kx', s: 'tz', r: 'l', l: 'r', m: 'n', n: 'm', t: 'ds', i: 'e', e: 'i', o: 'u', u: 'o', a: 'e' };

function nativize(word, ctx, r) {
    const { consonants, vowels, commonVowel, maxRun, openEnding, isV } = ctx;
    let out = '';
    for (const ch of word) {
        if (isV(ch) ? vowels.has(ch) : consonants.has(ch)) { out += ch; continue; }
        const alt = [...(NEAREST[ch] ?? '')].find(x => (isV(ch) ? vowels : consonants).has(x));
        if (alt) out += alt; else if (isV(ch)) out += commonVowel;      // an unknown consonant is dropped
    }
    // consonant runs the daughter does not allow are broken by a vowel; vowel runs are cut to two
    let fixed = '', run = 0, vr = 0;
    for (const ch of out) {
        if (isV(ch)) { vr++; run = 0; if (vr > 2) continue; fixed += ch; }
        else { vr = 0; run++; if (run > maxRun) { fixed += commonVowel; run = 1; } fixed += ch; }
    }
    if (openEnding && !isV(fixed[fixed.length - 1])) fixed += commonVowel;
    return fixed.length >= 2 && [...fixed].some(isV) ? fixed : null;
}

// lexicon: the daughter's lexicon (forms already changed); history: from deriveDaughter; later(word, year)
// sister (optional): { items } = the loans of the language this one is the sister of. The sister keeps the same donor languages
// (their sound systems are the same, their words are not drawn again), may have one donor of its own, takes its own words in its own
// fields, and takes some of the same words from the same donors (Italian caffè, French café), adapted to its own sounds.
export function applyLoans(spec, lexicon, history, later, fixedForms, sister = null) {
    let r = rng(`${spec.seed}|loans`);
    const rSister = rng(`${spec.seed}|loans|sister`);
    const genre = spec.genre;
    const factor0 = 0.6 + r() * 0.9;
    const factor = sister ? 0.6 + rSister() * 0.9 : factor0;
    const absorbency = (ABSORBENCY[genre] ?? DEFAULT_ABSORBENCY) * factor;
    const isNumeral = e => numeralValue(e) !== undefined;
    const vset = new Set([...'aeiouyøæ', ...(spec.extraVowels ?? [])]);
    const isV = ch => vset.has(ch);
    const forms = lexicon.filter(e => !e.loan).map(e => e.form);
    const letters = new Set(forms.flatMap(f => [...f.replace(/ /g, '')]));
    const vowels = new Set([...letters].filter(isV)), consonants = new Set([...letters].filter(c => !isV(c)));
    const count = new Map();
    for (const f of forms) for (const ch of f) if (isV(ch)) count.set(ch, (count.get(ch) ?? 0) + 1);
    const commonVowel = [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'a';
    const runs = f => Math.max(0, ...f.split(/[aeiouyøæ ]+/).map(x => x.length));
    const maxRun = Math.max(2, Math.min(3, Math.max(...forms.map(runs))));
    const openEnding = forms.filter(f => isV(f.at(-1))).length / forms.length > 0.8;
    const ctx = { vowels, consonants, commonVowel, maxRun, openEnding, isV };

    // donors: one to three languages, each of a kind and with a sound system of its own
    const order = ROLE_ORDER[genre] ?? Object.keys(DONOR_ROLES).sort(() => r() - 0.5);
    const n = Math.min(order.length, 1 + (absorbency > 0.1 ? 1 : 0) + (r() < 0.4 ? 1 : 0));
    const modelKeys = Object.keys(MODEL).filter(k => k !== spec.consonants);
    const vowelKeys = Object.keys(VOWELS);
    const donors = order.slice(0, n).map((role, i) => {
        const consonantsKey = modelKeys[Math.floor(r() * modelKeys.length)], vowelsKey = vowelKeys[Math.floor(r() * vowelKeys.length)];
        const donorMean = r() < 0.55 ? 1.4 : 2.0;
        const factory = createWordFactory({ consonants: consonantsKey, vowels: vowelsKey, mean: donorMean, seed: `${spec.seed}|loans|donor${i}${sister ? '|sister' : ''}` });
        const nameFactory = createWordFactory({ consonants: consonantsKey, vowels: vowelsKey, mean: 2.4, seed: `${spec.seed}|loans|name${i}` });
        let name = nameFactory();
        if (name.length < 4) name += nameFactory({ short: true });
        // the oldest donors had most contact; each domain is favoured or not at random
        const jitter = Object.fromEntries(Object.keys(DONOR_ROLES.trade.weights).concat(['war', 'weapon', 'faith', 'magic', 'nature', 'animal']).map(d => [d, 0.5 + r() * 1.3]));
        return { id: `D${i + 1}`, role, name: name[0].toUpperCase() + name.slice(1), model: MODEL[consonantsKey].name, strength: 1 - i * 0.25, factory, jitter, years: 0 };
    });
    donors.forEach(d => { d.shared = !!sister; });
    if (sister) {
        r = rSister;
        // one more donor, the sister's own, with a sound system of its own (the "gauche" of this language)
        if (r() < 0.7) {
            const free = Object.keys(DONOR_ROLES), role = free[Math.floor(r() * free.length)];
            const consonantsKey = modelKeys[Math.floor(r() * modelKeys.length)], vowelsKey = vowelKeys[Math.floor(r() * vowelKeys.length)];
            const nameFactory = createWordFactory({ consonants: consonantsKey, vowels: vowelsKey, mean: 2.4, seed: `${spec.seed}|loans|sister-name` });
            let name = nameFactory();
            if (name.length < 4) name += nameFactory({ short: true });
            const jitter = Object.fromEntries(Object.keys(DONOR_ROLES.trade.weights).concat(['war', 'weapon', 'faith', 'magic', 'nature', 'animal']).map(d => [d, 0.5 + r() * 1.3]));
            donors.push({ id: `D${donors.length + 1}`, role, name: name[0].toUpperCase() + name.slice(1), model: MODEL[consonantsKey].name, strength: 0.9, factory: createWordFactory({ consonants: consonantsKey, vowels: vowelsKey, mean: r() < 0.55 ? 1.4 : 2.0, seed: `${spec.seed}|loans|sister-donor` }), jitter, years: 0, shared: false });
        }
        // the shared donors are weighed again: the sister's contacts were not the same
        for (const d of donors) if (d.shared) { d.strength = Math.max(0.3, d.strength * (0.7 + r() * 0.6)); for (const k of Object.keys(d.jitter)) d.jitter[k] = 0.5 + r() * 1.3; }
    }
    const firstChange = history.rules.length ? history.rules[0].years : 300;
    donors.forEach(d => { d.years = Math.max(60, Math.round((firstChange * (0.15 + r() * 0.85)) / 10) * 10); });
    const fromMate = new Map((sister?.items ?? []).map(x => [x.id, x]));

    const candidates = lexicon.map((e, i) => ({ e, i })).filter(({ e }) => !isNumeral(e) && !e.derivation && !NEVER.has(e.domain));
    const weight = (e, d) => {
        const role = DONOR_ROLES[d.role];
        return (role.weights[e.domain] ?? role.rest) * (d.jitter[e.domain] ?? 1) * d.strength * (e.tier === 'core' ? 0.12 : e.tier === 'common' ? 0.6 : 1);
    };
    const raw = candidates.map(c => Math.max(...donors.map(d => weight(c.e, d))));
    const scale = (absorbency * lexicon.length) / Math.max(1e-9, raw.reduce((a, b) => a + b, 0));
    const taken = new Set([...lexicon.map(e => e.form), ...fixedForms]);
    const loans = [];
    const out = lexicon.slice();
    candidates.forEach(({ e, i }, k) => {
        const mate = fromMate.get(e.id);
        const same = mate && donors.find(d => d.id === mate.donor && d.shared) && r() < 0.5;
        if (!same && r() >= Math.min(0.6, raw[k] * scale)) return;
        const ws = donors.map(d => weight(e, d)), total = ws.reduce((a, b) => a + b, 0);
        let x = r() * total, di = 0;
        while (di < donors.length - 1 && (x -= ws[di]) > 0) di++;
        const d = same ? donors.find(z => z.id === mate.donor) : donors[di];
        const years = Math.max(30, d.years + Math.round((r() - 0.5) * 6) * 10);
        let source, native, form = null;
        for (let t = 0; t < 8 && !form; t++) {
            source = same ? mate.source : d.factory({ short: e.pos === 'pronoun' });
            native = nativize(source, ctx, r);
            const f = native && later(native, years);
            if (f && f.length >= 2 && !taken.has(f)) form = f;
            if (same) break;
        }
        if (!form) return;
        taken.add(form);
        loans.push({ id: e.id, lemma: e.lemma, pos: e.pos, domain: e.domain, donor: d.id, source, adapted: native, form, years, replaced: e.form, replacedProto: e.protoForm, ...(same ? { sameAsSister: mate.form } : {}) });
        out[i] = { ...e, form, loan: { donor: d.id, donorName: d.name, source, years, replaced: e.form } };
    });
    return {
        lexicon: out,
        loans: {
            absorbency: Number(absorbency.toFixed(3)),
            donors: donors.map(({ factory, jitter, strength, shared, ...d }) => sister ? { ...d, shared } : d),
            items: loans, share: loans.length / lexicon.length
        }
    };
}
