// Semantic structure of the lexicon: which meanings a language keeps apart and which it names with one word.
// Real languages do not give every English sense its own root: the word for "hand" often also means "arm", the colour terms
// are 2-11 and not 11 for every language, and kinship terms may fold cousins into siblings. Applied to the finished lexicon
// (after the sound changes and the loans), so a polysemous word is one form with several senses; the sense that was there
// first is recorded, and the extended one is what the language later stretched the word to. Own random stream.
import { rng } from '../core/rng.js';

// [original sense, extended sense, mechanism, weight (how common across languages, after the CLICS-style colexification
// databases), why]. The pairs are data; a language takes some of them by chance.
export const MECHANISMS = Object.freeze({
    'part-whole': 'part and whole (the word for the part names the whole, or the reverse)',
    metonymy: 'metonymy (contiguity: the thing and what goes with it)',
    metaphor: 'metaphor (resemblance)',
    generalisation: 'generalisation (a narrow sense widened)',
    'role-shift': 'shift of role (the same person seen from another side)'
});
export const PAIRS = Object.freeze([
    ['body.hand', 'body.arm', 'part-whole', 3, 'the hand and the arm'],
    ['body.foot', 'body.leg', 'part-whole', 3, 'the foot and the leg'],
    ['body.finger', 'body.toe', 'generalisation', 2.5, 'fingers and toes'],
    ['nature.tree', 'nature.wood', 'metonymy', 3, 'the tree and its wood'],
    ['nature.sun', 'time.day', 'metonymy', 2, 'the sun and the day it makes'],
    ['nature.moon', 'time.month', 'metonymy', 3, 'the moon and the month it counts'],
    ['body.skin', 'nature.bark', 'metaphor', 1.5, 'skin and bark'],
    ['food.meat', 'craft.flesh', 'metonymy', 2, 'meat and flesh'],
    ['nature.air', 'nature.wind', 'generalisation', 1.5, 'air and wind'],
    ['nature.sky', 'faith.heaven', 'metonymy', 2, 'the sky and heaven'],
    ['nature.earth', 'nature.ground', 'generalisation', 2, 'the earth and the ground'],
    ['nature.ground', 'nature.land', 'generalisation', 1.5, 'ground and land'],
    ['verb.hear', 'verb.listen', 'generalisation', 2.5, 'hearing and listening'],
    ['verb.see', 'verb.look', 'generalisation', 2, 'seeing and looking'],
    ['family.child', 'family.son', 'generalisation', 2, 'child and son'],
    ['family.grandfather', 'family.ancestor', 'generalisation', 1.5, 'grandfather and ancestor'],
    ['social.man', 'family.husband', 'role-shift', 2.5, 'man and husband'],
    ['social.woman', 'family.wife', 'role-shift', 2.5, 'woman and wife'],
    ['social.person', 'social.man', 'generalisation', 1.5, 'person and man'],
    ['nature.mountain', 'nature.hill', 'generalisation', 1.5, 'mountain and hill'],
    ['object.house', 'need.home', 'generalisation', 2, 'house and home'],
    ['body.tongue', 'technology.word', 'metonymy', 1.5, 'the tongue and what it says'],
    ['body.breath', 'society.soul', 'metaphor', 2, 'breath and soul'],
    ['object.road', 'settlement.path', 'generalisation', 2, 'road and path'],
    ['adjective.cold', 'time.winter', 'metonymy', 1.5, 'the cold and the season of cold'],
    ['adjective.hot', 'time.summer', 'metonymy', 1.5, 'the heat and the season of heat'],
    ['body.head', 'society.chief', 'metaphor', 1.5, 'the head and the chief']
]);

// Berlin-Kay: the basic colour terms of a language, from 3 (dark / light + red) to all. Terms that are not basic are named
// by the nearest basic one. Each stage: { head: [colours it also names] }.
const COLOURS = ['white', 'yellow', 'orange', 'red', 'green', 'blue', 'purple', 'brown', 'black'];
export const COLOUR_STAGES = Object.freeze({
    3: { white: ['yellow'], red: ['orange'], black: ['green', 'blue', 'purple', 'brown'] },
    4: { white: [], yellow: ['orange'], red: [], black: ['green', 'blue', 'purple', 'brown'] },
    5: { white: [], yellow: ['orange'], red: [], green: [], black: ['blue', 'purple', 'brown'] },
    6: { white: [], yellow: ['orange'], red: [], green: [], blue: ['purple'], black: ['brown'] },
    7: { white: [], yellow: ['orange'], red: [], green: [], blue: ['purple'], black: [], brown: [] },
    8: null
});
const STAGE_COUNT = { 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 9 };
// kinship systems: which relatives are called by the word for a closer one
export const KINSHIP = Object.freeze({
    descriptive: { label: 'descriptive (each relative has a word of its own, as in English)', map: [] },
    sibling: { label: 'cousins are called brothers and sisters, nephews and nieces sons and daughters (Hawaiian-like)', map: [['family.brother', 'family.cousin'], ['family.son', 'society.nephew'], ['family.daughter', 'society.niece']] },
    classificatory: { label: 'the father’s and mother’s siblings are called father and mother, cousins siblings (Hawaiian)', map: [['family.father', 'family.uncle'], ['family.mother', 'family.aunt'], ['family.brother', 'family.cousin'], ['family.son', 'society.nephew'], ['family.daughter', 'society.niece']] }
});

// Decides, before the vocabulary is chosen, which meanings this language will name with one word, so that both senses of
// every pair are in the lexicon. `exists(id)` tells whether the dictionary has the sense. Independent of the derivation rules.
export function planSemantics(spec, exists) {
    const r = rng(`${spec.seed}|semantics`);
    const taken = new Set(), pairs = [];
    const usable = (a, b) => exists(a) && exists(b) && !taken.has(a) && !taken.has(b);
    const join = (a, b, kind, note, group) => { taken.add(a); taken.add(b); pairs.push({ original: a, extended: b, kind, note, group }); };
    const kRoll = r(), kin = kRoll < 0.55 ? 'descriptive' : kRoll < 0.8 ? 'sibling' : 'classificatory';
    for (const [head, ext] of KINSHIP[kin].map) if (usable(head, ext)) join(head, ext, 'role-shift', `kinship: ${KINSHIP[kin].label}`, 'kinship');
    const cRoll = r(), grue = r() < 0.35;
    const stage = cRoll < 0.06 ? 3 : cRoll < 0.14 ? 4 : cRoll < 0.26 ? 5 : cRoll < 0.42 ? 6 : cRoll < 0.6 ? 7 : 8;
    const colourPlan = stage === 8 ? (grue ? { green: ['blue'] } : {}) : (stage === 7 && grue ? { ...COLOUR_STAGES[7], green: ['blue'], blue: [] } : COLOUR_STAGES[stage]);
    for (const [head, members] of Object.entries(colourPlan)) for (const m of members) if (usable(`adjective.${head}`, `adjective.${m}`)) join(`adjective.${head}`, `adjective.${m}`, 'generalisation', 'colour terms', 'colour');
    for (const [a, b, kind, w, note] of PAIRS) if (r() < Math.min(0.6, w * 0.13) && usable(a, b)) join(a, b, kind, note, 'pair');
    const colourIds = COLOURS.map(c => `adjective.${c}`).filter(exists);
    const merged = pairs.filter(p => p.group === 'colour').length;
    return { kinship: { id: kin, label: KINSHIP[kin].label }, colours: { stage, terms: colourIds.length - merged, grue: grue && stage >= 7 }, pairs, ids: pairs.flatMap(p => [p.original, p.extended]), colourIds };
}

// Step 1, on the root forms (before derivation): the extended sense takes the root of the original one, so words derived
// from either use the same root. Returns the lexicon with duplicate forms and the pairs that could be applied.
export function colexifyRoots(lexicon, plan, derived = new Set()) {
    const byId = new Map(lexicon.map(e => [e.id, e]));
    const applied = [], taken = new Set();
    for (const p of plan.pairs) {
        const A = byId.get(p.original), B = byId.get(p.extended);
        if (!A || !B || A.form === B.form || taken.has(A.id) || taken.has(B.id) || derived.has(B.id)) continue;
        taken.add(A.id); taken.add(B.id); applied.push(p);
    }
    const ext = new Map(applied.map(p => [p.extended, p]));
    return { lexicon: lexicon.map(e => ext.has(e.id) ? { ...e, form: byId.get(ext.get(e.id).original).form } : e), applied, extended: new Set(ext.keys()) };
}

// Step 2, after the sound changes and the loans: the extended senses (kept out of the history so that its forms stay unique)
// get the final form of the original sense back. `motherLexicon` gives their order and fields.
export function reattach(finalLexicon, motherLexicon, plan, applied) {
    const final = new Map(finalLexicon.map(e => [e.id, e]));
    const ext = new Map(applied.map(p => [p.extended, p])), heads = new Map();
    for (const p of applied) (heads.get(p.original) ?? heads.set(p.original, []).get(p.original)).push(p.extended);
    const out = motherLexicon.map(m => {
        const p = ext.get(m.id);
        if (!p) { const e = final.get(m.id); return e && heads.has(e.id) ? { ...e, colexHeads: heads.get(e.id) } : e; }
        const A = final.get(p.original);
        return { ...m, form: A.form, protoForm: A.protoForm, ...(A.loan ? { loan: A.loan } : {}), colex: { with: p.original, kind: p.kind, note: p.note, group: p.group } };
    }).filter(Boolean);
    const mergedColours = applied.filter(p => p.group === 'colour').length;
    return {
        lexicon: out,
        semantics: {
            kinship: plan.kinship, colours: { ...plan.colours, terms: plan.colourIds.filter(id => final.has(id) || ext.has(id)).length - mergedColours },
            pairs: applied.filter(p => p.group === 'pair'), kinshipPairs: applied.filter(p => p.group === 'kinship'), colourPairs: applied.filter(p => p.group === 'colour')
        }
    };
}
