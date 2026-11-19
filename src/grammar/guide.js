// The grammar guide: for every topic a short explanation (texts.js), what the language does, glossed examples built with the real
// engine (inflect and the sentence realiser) and a "How it works" box with a word-for-word calque. Pure: language -> data.
//   topic = { id, title, text, local: [strings], examples: [{ words: [{form, seg, gloss}], translation }], box: { lines, calque, note }? }
import { GUIDE_TEXTS } from './texts.js';
import { ABBREVIATIONS, glossWord, glossOf, codesIn } from './gloss.js';
import { inflect, genderOf } from '../morphology/inflect.js';
import { personCells } from '../morphology/affixes.js';

const NOTE = 'Illustration only: English does not work this way.';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const morphOf = lang => ({ spec: lang.spec, model: lang.morphology.model, affixes: lang.morphology.affixes });
const entryOf = (lang, lemma, pos) => lang.lexicon.find(e => e.lemma === lemma && e.pos === pos && !e.gloss);

// ---- English side of the examples ----
const POSS = { '1.singular': 'my', '2.singular': 'your', '3.singular': 'his', '1.plural': 'our', '2.plural': 'your (pl.)', '3.plural': 'their', '1.dual': 'our (two)', '2.dual': 'your (two)', '3.dual': 'their (two)' };
const SUBJ = { '1.singular': 'I', '2.singular': 'you', '3.singular': 'he', '1.plural': 'we', '2.plural': 'you (pl.)', '3.plural': 'they', '1.dual': 'we two', '2.dual': 'you two', '3.dual': 'the two of them' };
const CASE_PREP = { genitive: 'of', dative: 'to', locative: 'in', ablative: 'from', instrumental: 'with' };
const CASE_CALQUE = { nominative: '', absolutive: '', accusative: '(object)', ergative: '(agent)', genitive: 'of', dative: 'to', locative: 'in', ablative: 'from', instrumental: 'with' };
const NOUNS = ['book', 'house', 'tree', 'stone', 'dog'];
const VERBS = { see: ['sees', 'saw', 'seen', 'seeing'], eat: ['eats', 'ate', 'eaten', 'eating'], help: ['helps', 'helped', 'helped', 'helping'], hear: ['hears', 'heard', 'heard', 'hearing'], love: ['loves', 'loved', 'loved', 'loving'], work: ['works', 'worked', 'worked', 'working'], sleep: ['sleeps', 'slept', 'slept', 'sleeping'] };
const BE = { '1.singular': ['am', 'was'], '2.singular': ['are', 'were'], '3.singular': ['is', 'was'], '1.plural': ['are', 'were'], '2.plural': ['are', 'were'], '3.plural': ['are', 'were'], '1.dual': ['are', 'were'], '2.dual': ['are', 'were'], '3.dual': ['are', 'were'] };
const HAVE = { '3.singular': 'has' };

const PLURALS = { child: 'children', man: 'men', woman: 'women' };
const pluralOf = lemma => PLURALS[lemma] ?? `${lemma}s`;
function nounEnglish(lemma, f) {
    const det = f.possessor ? POSS[f.possessor] : 'the';
    const head = f.number === 'dual' ? `${det} two ${pluralOf(lemma)}` : `${det} ${f.number === 'plural' ? pluralOf(lemma) : lemma}`;
    const prep = CASE_PREP[f.case];
    let t = prep ? `${prep} ${head}` : head;
    if (f.case === 'accusative') t += ' (as object)';
    if (f.case === 'ergative') t += ' (as agent)';
    if (f.additive) t += ', too';
    return t;
}

function verbEnglish(lemma, f) {
    const [third, past, part, ing] = VERBS[lemma];
    const cell = `${f.person ?? 3}.${f.number ?? 'singular'}`, subj = SUBJ[cell], tense = f.tense ?? 'present';
    const isThird = cell === '3.singular';
    let v;
    const neg = f.negative ? ' not' : '', can = f.potential;
    if (f.imperative) return f.negative ? `Do not ${lemma}!` : `${cap(lemma)}!`;
    if (f.optative) return `May ${subj} ${lemma}`;
    if (f.voice === 'passive') v = `${(BE[cell] ?? BE['3.singular'])[tense === 'past' ? 1 : 0]}${neg} ${part}`.replace(/^is not/, 'is not');
    else if (f.voice === 'causative') v = `${tense === 'past' ? 'made' : 'makes'} someone ${lemma}`;
    else if (f.voice === 'applicative') v = `${tense === 'past' ? past : isThird ? third : lemma} for someone`;
    else if (f.voice === 'antipassive') v = `${tense === 'past' ? past : isThird ? third : lemma} (something)`;
    else {
        const aux = tense === 'future' ? 'will' : null;
        if (can) v = tense === 'past' ? `could${neg} ${lemma}` : tense === 'future' ? `will${neg} be able to ${lemma}` : `can${f.negative ? 'not' : ''} ${lemma}`;
        else if (f.aspect === 'progressive') v = tense === 'future' ? `will${neg} be ${ing}` : `${BE[cell][tense === 'past' ? 1 : 0]}${neg} ${ing}`;
        else if (f.aspect === 'perfect') v = tense === 'future' ? `will${neg} have ${part}` : tense === 'past' ? `had${neg} ${part}` : `${isThird ? 'has' : 'have'}${neg} ${part}`;
        else if (f.negative) v = tense === 'future' ? `will not ${lemma}` : tense === 'past' ? `did not ${lemma}` : `${isThird ? 'does' : 'do'} not ${lemma}`;
        else v = aux ? `will ${lemma}` : tense === 'past' ? past : isThird ? third : lemma;
    }
    let out = `${subj} ${v}`;
    if (f.evidential) out += { direct: ' [I saw it myself]', reported: ' [I was told]', inferred: ' [I infer it]' }[f.evidential];
    return cap(out);
}

// ---- calque: the parts in the order the language builds them, with the English words for their meanings ----
const CALQUE_VERB = { past: 'did', future: 'will', present: '', progressive: 'ing', perfect: 'have', imperative: 'do!', optative: 'may', passive: 'be-done', causative: 'make', applicative: 'for', antipassive: 'someone', direct: 'seen', reported: 'told', inferred: 'infer' };
function calqueOf(parts, entry) {
    const bits = parts.map(p => {
        const m = p.meaning;
        switch (p.kind) {
            case 'stem': case 'stem-alt': return entry.lemma.replace(/\s+/g, '_');
            case 'suppletive': return `${entry.lemma}[${glossOf(p, entry).split('.').pop()}]`;
            case 'number': return m === 'dual' ? 'two' : 'many';
            case 'gender': return `(${m[0]})`;
            case 'case': return CASE_CALQUE[m];
            case 'possessor': return POSS[m.replace(/^poss\./, '')];
            case 'additive': return 'also';
            case 'fused': return `[${glossOf(p, entry)}]`;
            case 'degree': return 'more';
            case 'tense': return CALQUE_VERB[m];
            case 'agreement': return (SUBJ[m] ?? m).replace(/ \(.*/, '');
            case 'aspect': return CALQUE_VERB[m];
            case 'negation': return 'not';
            case 'potential': return 'can';
            case 'prohibitive': return 'do-not';
            case 'mood': return CALQUE_VERB[m];
            case 'voice': return CALQUE_VERB[m];
            case 'evidential': return CALQUE_VERB[m];
            case 'converb': case 'subordinator': return { reason: 'because', condition: 'if', time: 'when', concession: 'although', simultaneous: 'while', converb: 'and-then' }[m] ?? 'then';
            default: return '?';
        }
    }).filter(Boolean);
    return bits.join('-');
}

// ---- building blocks ----
function word(lang, entry, f) {
    const g = glossWord(entry, f, morphOf(lang));
    return { w: { form: g.form, seg: g.seg, gloss: g.gloss }, g, calque: calqueOf(g.parts, entry) };
}
const single = (w, translation) => ({ words: [w.w], translation });

function pickNoun(lang) {
    const m = morphOf(lang), cases = m.model.cases.length ? m.model.cases : [null];
    for (const lemma of NOUNS) {
        const e = entryOf(lang, lemma, 'noun');
        if (!e) continue;
        const regular = ['singular', 'plural', 'dual'].filter(n => lang.spec.numbers.includes(n)).every(number => cases.every(c => !glossWord(e, { number, case: c ?? undefined, possessor: m.affixes.possessive ? '1.singular' : undefined }, m).irregular));
        if (regular) return e;
    }
    return NOUNS.map(l => entryOf(lang, l, 'noun')).find(Boolean) ?? null;
}
function pickVerb(lang) {
    const m = morphOf(lang);
    for (const lemma of Object.keys(VERBS)) {
        const e = entryOf(lang, lemma, 'verb');
        if (!e) continue;
        const cells = personCells(lang.spec).map(c => { const [p, n] = c.split('.'); return { person: Number(p), number: n }; });
        const ok = ['present', 'past', 'future'].every(tense => cells.every(c => !glossWord(e, { tense, ...c }, m).irregular));
        if (ok) return e;
    }
    return Object.keys(VERBS).map(l => entryOf(lang, l, 'verb')).find(Boolean) ?? null;
}
function pickAdjective(lang) {
    const e = entryOf(lang, 'good', 'adjective') ?? entryOf(lang, 'big', 'adjective') ?? lang.lexicon.find(x => x.pos === 'adjective' && !x.gloss);
    return e ?? null;
}

const FUNCTION_CODES = { 'function.the': 'DEF', 'function.a': 'INDF', 'grammar.prohibitive_marker': 'PROH', 'grammar.question_particle': 'Q', 'grammar.that': 'COMP', 'function.that_relative': 'REL', 'grammar.progressive_marker': 'PROG', 'grammar.perfect_marker': 'PRF', 'grammar.passive_marker': 'PASS', 'grammar.applicative_marker': 'APPL', 'grammar.causative_marker': 'CAUS', 'grammar.antipassive_marker': 'ANTIP', 'grammar.witnessed_marker': 'DIR', 'grammar.reported_marker': 'REP', 'grammar.polite_marker': 'HON', 'grammar.more': 'CMPR' };
const CODE_CALQUE = { DEF: 'the', INDF: 'a', PROH: 'do-not', Q: '?', COMP: 'that', REL: 'that', PROG: 'ing', PRF: 'have', PASS: 'be-done', APPL: 'for', CAUS: 'make', ANTIP: 'someone', DIR: 'seen', REP: 'told', HON: 'sir', CMPR: 'more' };
// a realised universal sentence, first alternative of every group, glossed word by word
function sentenceExample(lang, re) {
    const s = lang.samples?.find(x => re.test(x.english));
    if (!s) return null;
    const flat = t => t.kind === 'alts' ? t.options[0].flatMap(flat) : [t];
    const byId = new Map(lang.lexicon.map(e => [e.id, e]));
    const words = flat({ kind: 'alts', options: [s.tokens] }).map(t => {
        const e = byId.get(t.id);
        const parts = t.parts ?? [{ text: t.form, kind: 'stem' }];
        let gloss, calque;
        const code = FUNCTION_CODES[t.id];
        if (code) { gloss = code; calque = CODE_CALQUE[code]; }
        else if (e?.pos === 'pronoun' && e.features?.person) { gloss = `${e.features.person}${{ singular: 'SG', plural: 'PL', dual: 'DU' }[e.features.number] ?? 'SG'}${e.features.role === 'object' ? '.OBJ' : ''}`; calque = e.lemma; }
        else if (e) { gloss = parts.map(p => glossOf(p, e)).join('-'); calque = calqueOf(parts, e); }
        else { gloss = t.gloss ?? t.id; calque = gloss; }
        return { form: t.form, seg: parts.map(p => p.text).join('-'), gloss, calque };
    });
    return { words: words.map(({ calque, ...w }) => w), calque: words.map(w => w.calque).join(' '), translation: s.english.replace(/\[([^\]|]+)(?:\|[^\]]*)*\]/g, '$1') };
}

// ---- topics ----
const topic = (id, title, textKey, extra = {}) => ({ id, title, text: GUIDE_TEXTS[textKey], local: [], examples: [], ...extra });

function morphTypeTopic(lang, noun) {
    const { spec, model } = morphOf(lang);
    const aff = lang.morphology.affixes;
    const t = topic('morph-type', 'Morphological type', `morph-type.${spec.morphology}`);
    if (spec.morphology === 'isolating') {
        t.local.push(`${cap(lang.name)} is isolating: its words do not inflect.`);
        for (const re of [/^My /, /^I eat/]) { const ex = sentenceExample(lang, re); if (ex) { t.examples.push(ex); break; } }
        t.box = { lines: ['Every word is one unit; meanings that other languages put into endings are separate words here.'], calque: t.examples[0]?.calque ?? '', note: NOTE };
        return t;
    }
    if (!noun) return t;
    const cases = model.cases, c = cases.at(-1) ?? undefined, c2 = cases.find(x => x === 'locative') ?? cases[1];
    const fus = spec.morphology === 'fusional';
    const plan = fus ? [{ number: 'singular' }, { number: 'plural' }, c2 ? { number: 'singular', case: c2 } : null, c2 ? { number: 'plural', case: c2 } : null, c2 ? { number: 'plural', case: c2, additive: true } : { number: 'plural', additive: true }].filter(Boolean) : [{ number: 'singular' }, spec.numbers.includes('plural') ? { number: 'plural' } : null, c2 ? { number: 'singular', case: c2 } : null, c2 && aff.possessive ? { number: 'singular', case: c2, possessor: '1.singular' } : null, c2 && aff.possessive ? { number: 'singular', case: c2, possessor: '1.singular', additive: true } : { number: 'singular', additive: true }].filter(Boolean);
    let last = null;
    for (const f of plan) {
        const r = word(lang, noun, f);
        t.examples.push(single(r, nounEnglish(noun.lemma, f)));
        last = r;
    }
    t.local.push(spec.morphology === 'agglutinative' ? `${cap(lang.name)} is agglutinative: the endings of ${noun.lemma} are added one after the other.` : `${cap(lang.name)} is fusional: one ending carries gender, number and case together.`);
    const parts = last.g.parts.filter(p => p.kind !== 'stem').map(p => p.kind === 'fused' ? 'gender + number + case in one ending' : p.kind).join(' + ');
    t.box = { lines: [`The longest form is built as stem${parts ? ` + ${parts}` : ''}.`], calque: last.calque, note: NOTE };
    return t;
}

function numberTopic(lang, noun) {
    const { spec } = morphOf(lang);
    if (spec.morphology === 'isolating' || !noun || !spec.numbers.includes('plural')) return null;
    const t = topic('number', 'Number', spec.numbers.includes('dual') ? 'number.dual' : 'number.plural');
    let last;
    for (const n of spec.numbers) { const f = { number: n }; const r = word(lang, noun, f); t.examples.push(single(r, nounEnglish(noun.lemma, f))); last = r; }
    const fusional = spec.morphology === 'fusional';
    t.local.push(fusional ? 'Number is part of the portmanteau ending, together with gender and case.' : `Plural marker: ${lang.morphology.affixes.numberMarkers.mode === 'prefix' ? 'prefix' : 'suffix'}.`);
    t.box = { lines: [fusional ? 'The ending carries number together with gender and case; it cannot be divided.' : 'The number marker is a separate unit of the word.'], calque: last.calque, note: NOTE };
    return t;
}

function genderTopic(lang) {
    const { spec } = morphOf(lang), m = morphOf(lang);
    if (spec.morphology === 'isolating' || !spec.genders.length) return null;
    const adj = pickAdjective(lang);
    if (!adj) return null;
    const t = topic('gender', 'Gender', 'gender');
    const nouns = lang.lexicon.filter(e => e.pos === 'noun' && !e.gloss && NOUNS.concat(['man', 'woman', 'child', 'friend', 'river', 'road', 'bird', 'fish']).includes(e.lemma));
    for (const g of spec.genders) {
        const n = nouns.find(e => genderOf(e, spec) === g);
        if (!n) continue;
        const pl = spec.morphology === 'fusional' && spec.numbers.includes('plural');   // the singular of the base case is unmarked in a fusional paradigm
        const a = glossWord(adj, { gender: g, number: pl ? 'plural' : 'singular' }, m), b = glossWord(n, pl ? { number: 'plural' } : {}, m);
        t.examples.push({ words: [{ form: b.form, seg: b.seg, gloss: b.gloss }, { form: a.form, seg: a.seg, gloss: a.gloss }], translation: `${adj.lemma} ${pl ? pluralOf(n.lemma) : n.lemma} (${g} noun)`, calque: `${calqueOf(b.parts, n)} ${calqueOf(a.parts, adj)}` });
    }
    t.local.push(`Genders: ${spec.genders.join(', ')}. In sentences the adjective stands ${lang.syntax.adjectivePosition} the noun; the examples list the noun first.`);
    const first = t.examples[0];
    t.box = first ? { lines: ['The ending of the adjective changes with the gender of the noun; the noun itself does not change.'], calque: first.calque, note: NOTE } : null;
    return t.examples.length ? t : null;
}

function caseTopic(lang, noun) {
    const { spec, model } = morphOf(lang);
    if (spec.morphology === 'isolating') return null;
    if (!model.cases.length) {
        const t = topic('case', 'Case', 'case.none');
        t.local.push(`Relations are expressed by ${lang.syntax.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'}.`);
        const ex = sentenceExample(lang, /^I give you/) ?? sentenceExample(lang, /^I eat/);
        if (ex) t.examples.push(ex);
        return t;
    }
    if (!noun) return null;
    const t = topic('case', 'Case', `case.${model.alignment === 'ergative-absolutive' ? 'ergative' : 'accusative'}`);
    let last;
    for (const c of model.cases) { const f = { number: 'singular', case: c }; const r = word(lang, noun, f); t.examples.push(single(r, nounEnglish(noun.lemma, f))); last = r; }
    t.local.push(`Cases: ${model.cases.join(', ')} (${model.baseCase} is unmarked).`);
    t.box = { lines: ['A case ending does the work of a preposition. The calque puts the English word where the ending stands.'], calque: last.calque, note: NOTE };
    return t;
}

function possessionTopic(lang, noun) {
    const { spec, model } = morphOf(lang), aff = lang.morphology.affixes;
    if (spec.morphology === 'isolating' || !noun) return null;
    if (!aff.possessive) {
        const t = topic('possession', 'Possession', 'possession.word');
        const ex = sentenceExample(lang, /^My /);
        if (ex) t.examples.push(ex);
        return t;
    }
    const t = topic('possession', 'Possession', 'possession.suffix');
    const c = model.cases.find(x => x === 'locative') ?? model.cases[1];
    const cells = personCells(spec).slice(0, 6);
    for (const cell of cells) { const f = { number: 'singular', possessor: cell }; const r = word(lang, noun, f); t.examples.push(single(r, nounEnglish(noun.lemma, f))); }
    let last;
    if (c) { const f = { number: 'singular', possessor: '1.singular', case: c }; last = word(lang, noun, f); t.examples.push(single(last, nounEnglish(noun.lemma, f))); }
    t.local.push('Order of the endings: stem, number, possessor, case.');
    if (last) t.box = { lines: ['The possessor suffix stands inside the case ending.'], calque: last.calque, note: NOTE };
    return t;
}

function alignmentTopic(lang) {
    const { spec, model } = morphOf(lang);
    if (spec.morphology === 'isolating') return null;
    const man = entryOf(lang, 'man', 'noun'), woman = entryOf(lang, 'woman', 'noun'), sleep = entryOf(lang, 'sleep', 'verb'), see = entryOf(lang, 'see', 'verb');
    if (!man || !woman || !sleep || !see) return null;
    const erg = model.alignment === 'ergative-absolutive';
    const t = topic('alignment', 'Alignment', `alignment.${erg ? 'ergative' : 'accusative'}`);
    const m = morphOf(lang);
    const hasCase = model.cases.length > 0;
    const cS = erg ? 'absolutive' : 'nominative', cA = erg ? 'ergative' : 'nominative', cP = erg ? 'absolutive' : 'accusative';
    const W = (e, c) => { const g = glossWord(e, hasCase ? { case: c } : {}, m); return { form: g.form, seg: g.seg, gloss: g.gloss }; };
    const V = e => { const g = glossWord(e, { tense: 'present', person: 3, number: 'singular' }, m); return { form: g.form, seg: g.seg, gloss: g.gloss }; };
    const order = (slots, ord) => ord.split('').map(ch => slots[ch]).filter(Boolean);
    const S = { S: W(man, cS), V: V(sleep) };
    const A = { S: W(man, cA), V: V(see), O: W(woman, cP) };
    const sOrder = lang.spec.order.replace('O', ''), aOrder = lang.spec.order;
    t.examples.push({ words: order(S, sOrder), translation: 'The man sleeps. (S)' }, { words: order(A, aOrder), translation: 'The man sees the woman. (A = man, P = woman)' });
    t.local.push(hasCase ? `Articles are left out of these examples. Basic order: ${lang.spec.order}.` : `Without case endings the roles are shown by word order alone (${lang.spec.order}); articles are left out.`);
    const sl = hasCase ? `man-${cS === 'nominative' ? 'NOM' : 'ABS'}` : 'man', al = hasCase ? `man-${erg ? 'ERG' : 'NOM'}` : 'man', pl = hasCase ? `woman-${erg ? 'ABS' : 'ACC'}` : 'woman';
    t.box = { lines: [`S: ${sl}; A: ${al}; P: ${pl}.`, erg ? 'S and P share one form (absolutive); A has its own (ergative).' : 'S and A share one form (nominative); P has its own (accusative).'], calque: `${sl} sleeps · ${al} sees ${pl}`, note: NOTE };
    return t;
}

function additiveTopic(lang, noun) {
    const { spec, model } = morphOf(lang), aff = lang.morphology.affixes;
    if (!aff.additive || !noun) return null;
    if (spec.morphology === 'isolating') {
        const t = topic('additive', 'Additive “also”', 'additive.particle');
        const r = glossWord(noun, {}, morphOf(lang));
        t.examples.push({ words: [{ form: r.form, seg: r.seg, gloss: r.gloss }, { form: aff.additive, seg: aff.additive, gloss: 'ADD' }], translation: `${noun.lemma}, too` });
        t.box = { lines: ['The particle follows the word it adds.'], calque: `${noun.lemma} also`, note: NOTE };
        return t;
    }
    const t = topic('additive', 'Additive clitic “also”', 'additive.suffix');
    const c = model.cases.find(x => x === 'locative') ?? model.cases[1];
    let last;
    for (const f of [{ number: 'singular', additive: true }, c ? { number: 'singular', case: c, additive: true } : null, c && aff.possessive ? { number: 'singular', case: c, possessor: '1.singular', additive: true } : null].filter(Boolean)) {
        last = word(lang, noun, f); t.examples.push(single(last, nounEnglish(noun.lemma, f)));
    }
    t.local.push('The additive clitic follows every other ending of the word.');
    t.box = { lines: ['The clitic closes the word; nothing follows it.'], calque: last.calque, note: NOTE };
    return t;
}

function adjectiveTopic(lang) {
    const { spec } = morphOf(lang), m = morphOf(lang);
    if (spec.morphology === 'isolating') return null;
    const adj = pickAdjective(lang);
    if (!adj) return null;
    const t = topic('adjectives', 'Adjectives and comparison', 'adjectives');
    let last;
    const plan = [];
    for (const g of (spec.genders.length ? spec.genders : [undefined])) for (const n of spec.numbers.filter(x => x !== 'dual')) plan.push({ gender: g, number: n });
    plan.push({ gender: spec.genders[0], number: 'singular', degree: 'comparative' });
    for (const f of plan) {
        const g = glossWord(adj, f, m);
        t.examples.push({ words: [{ form: g.form, seg: g.seg, gloss: g.gloss }], translation: `${f.degree ? (adj.lemma === 'good' ? 'better' : `more ${adj.lemma}`) : adj.lemma}${f.gender ? ` (${f.gender}${f.number === 'plural' ? ', plural' : ''})` : f.number === 'plural' ? ' (plural)' : ''}` });
        last = g;
    }
    t.local.push(spec.genders.length ? `The adjective takes the gender of the noun (${spec.genders.join(', ')}).` : 'The adjective does not agree in gender.');
    t.box = { lines: ['The agreement ending repeats information carried by the noun.'], calque: calqueOf(last.parts, adj), note: NOTE };
    return t;
}

// ---- verbal topics ----
const V3 = { tense: 'present', person: 3, number: 'singular' };
function verbExamples(lang, verb, plans) {
    const m = morphOf(lang), out = [];
    let last;
    for (const f of plans) { const r = word(lang, verb, f); out.push(single(r, verbEnglish(verb.lemma, f))); last = r; }
    return { examples: out, last };
}
function verbalTopics(lang) {
    const { spec } = morphOf(lang), aff = lang.morphology.affixes, v = aff.verb, verb = pickVerb(lang), out = [];
    const mode = spec.morphology === 'isolating' ? 'isolating' : v?.mode ?? 'isolating';
    const t0 = topic('verb-structure', 'Verb structure', `verb-structure.${mode}`);
    if (mode === 'isolating' || !verb || !v) {
        t0.local.push(`${cap(lang.name)} does not inflect its verbs.`);
        const ex = sentenceExample(lang, /^I eat/) ?? sentenceExample(lang, /^I see/);
        if (ex) t0.examples.push(ex);
        return [t0];
    }
    const agg = mode === 'agglutinative';
    const base = [{ ...V3 }, { tense: 'past', person: 1, number: 'singular' }, ...(agg ? [{ tense: 'past', person: 1, number: 'singular', negative: true }, { tense: 'past', person: 1, number: 'singular', negative: true, potential: true }] : [{ tense: 'future', person: 2, number: 'plural' }])];
    const r0 = verbExamples(lang, verb, base);
    t0.examples = r0.examples;
    t0.local.push(agg ? 'Order of the suffixes: stem, voice, ability, negation, aspect, tense, subject agreement, evidential, clause marker.' : 'One ending marks tense, person and number together.');
    t0.box = { lines: [agg ? 'Each suffix adds one meaning, from left to right.' : 'The ending is a single block: it cannot be split.'], calque: r0.last.calque, note: NOTE };
    out.push(t0);

    const tTense = topic('tense', 'Tense', 'tense');
    const rT = verbExamples(lang, verb, ['present', 'past', 'future'].map(tense => ({ tense, person: 1, number: 'singular' })));
    tTense.examples = rT.examples; tTense.local.push('Present tense: ' + (agg && !v.tense.present ? 'no ending.' : agg ? `ending ${v.tense.present}.` : 'part of the portmanteau ending.'));
    tTense.box = { lines: [agg ? 'The tense suffix comes before the person ending.' : 'Tense is part of the single ending.'], calque: rT.last.calque, note: NOTE };
    out.push(tTense);

    const tAgr = topic('agreement', 'Person and number agreement', 'agreement');
    const rA = verbExamples(lang, verb, personCells(spec).map(c => { const [p, n] = c.split('.'); return { tense: 'present', person: Number(p), number: n }; }));
    tAgr.examples = rA.examples; tAgr.local.push(syntaxProdrop(lang));
    tAgr.box = { lines: ['The ending replaces the subject pronoun, which may be omitted.'], calque: rA.examples.find(e => e.words[0].gloss.includes('1SG'))?.words[0] ? calqueOf(glossWord(verb, { tense: 'present', person: 1, number: 'singular' }, morphOf(lang)).parts, verb) : '', note: NOTE };
    out.push(tAgr);
    if (!agg) return out;

    const tAsp = topic('aspect', 'Aspect', 'aspect');
    const rAs = verbExamples(lang, verb, [{ tense: 'present', person: 1, number: 'singular', aspect: 'progressive' }, { tense: 'present', person: 1, number: 'singular', aspect: 'perfect' }, { tense: 'past', person: 1, number: 'singular', aspect: 'progressive' }]);
    tAsp.examples = rAs.examples; tAsp.box = { lines: ['The aspect suffix comes before the tense suffix.'], calque: rAs.last.calque, note: NOTE };
    out.push(tAsp);

    const tNeg = topic('negation', 'Negation and ability', 'negation');
    const rN = verbExamples(lang, verb, [{ tense: 'present', person: 1, number: 'singular', negative: true }, { tense: 'present', person: 1, number: 'singular', potential: true }, { tense: 'present', person: 1, number: 'singular', potential: true, negative: true }]);
    tNeg.examples = rN.examples; tNeg.box = { lines: ['Ability comes first, then negation, so “cannot” is can + not.'], calque: rN.last.calque, note: NOTE };
    out.push(tNeg);

    const tMood = topic('mood', 'Mood and prohibition', 'mood');
    const plans = [{ imperative: true, person: 2, number: 'singular' }, { optative: true, person: 3, number: 'singular' }];
    if (['negation', 'suffix'].includes(lang.syntax.local.prohibitive)) plans.push({ imperative: true, negative: true, prohibitive: lang.syntax.local.prohibitive === 'suffix', person: 2, number: 'singular' });
    const rM = verbExamples(lang, verb, plans);
    tMood.examples = rM.examples; tMood.local.push(`Prohibition: ${lang.syntax.localText.prohibitive}.`);
    tMood.box = { lines: ['The imperative takes the place of tense and person.'], calque: rM.last.calque, note: NOTE };
    out.push(tMood);

    const tVoice = topic('voice', 'Voice and valency', 'voice');
    const voices = Object.keys(aff.voice ?? {});
    const rV = verbExamples(lang, verb, voices.flatMap(vc => [{ ...V3, voice: vc }]));
    tVoice.examples = rV.examples;
    for (const [k, val] of Object.entries(lang.syntax.valencyText)) tVoice.local.push(`${cap(k)}: ${val}.`);
    if (rV.last) tVoice.box = { lines: ['The voice suffix stands right after the stem.'], calque: rV.last.calque, note: NOTE };
    out.push(tVoice);

    const ev = Object.keys(aff.local?.evidential ?? {});
    if (ev.length) {
        const tEv = topic('evidentiality', 'Evidentiality', 'evidentiality');
        const rE = verbExamples(lang, verb, ev.map(e => ({ tense: 'past', person: 3, number: 'singular', evidential: e })));
        tEv.examples = rE.examples; tEv.box = { lines: ['The evidential suffix closes the verb.'], calque: rE.last.calque, note: NOTE };
        out.push(tEv);
    } else if (lang.syntax.localText.evidentiality !== 'not marked') {
        const tEv = topic('evidentiality', 'Evidentiality', 'evidentiality');
        tEv.local.push(`Evidentiality: ${lang.syntax.localText.evidentiality}.`);
        out.push(tEv);
    }
    return out;
}
const syntaxProdrop = lang => lang.syntax.prodrop ? 'Subject pronouns are dropped.' : 'Subject pronouns are always expressed.';

// ---- syntactic topics: realised sentences ----
function syntaxTopics(lang) {
    const L = lang.syntax, out = [];
    const add = (id, title, key, res, local) => {
        const t = topic(id, title, key);
        for (const re of res) { const ex = sentenceExample(lang, re); if (ex) t.examples.push(ex); }
        t.local.push(...local);
        if (t.examples.length) t.box = { lines: ['Word for word, in the order the language puts them.'], calque: t.examples[0].calque, note: NOTE };
        out.push(t);
        return t;
    };
    add('word-order', 'Word order', 'word-order', [/^I eat/, /^I give you/], [`Basic order: ${L.order}. ${syntaxProdrop(lang)}`]);
    add('noun-phrase', 'Noun phrase', 'noun-phrase', [/^The \[?good|^The (good|small|old)/, /^I give you/], [`Adjectives stand ${L.adjectivePosition} the noun; the language has ${L.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'}; articles: ${L.articles}.`]);
    add('questions', 'Questions', 'questions', [/^Who are you/, /^Where is/, /^Do you understand/], [cap(lang.syntax.localText.wh) + '.']);
    add('prohibition', 'Prohibition', 'prohibition', [/^Do not/, /^I do not know/], [`Prohibition: ${L.localText.prohibitive}.`]);
    add('subordination', 'Subordinate clauses', 'subordination', [/^I come because/, /^If you come/, /^I eat when|^I (eat|sleep) when|when I am tired/], [`Complement: ${L.subordinationText.complement}. Adverbial: ${L.subordinationText.adverbial}. Converb: ${L.subordinationText.converb}.`]);
    add('comparison', 'Comparison', 'comparison', [/^The road is/, /^This is (better|worse)/], ['Standard of comparison: the word for “than”.']);
    add('reported-speech', 'Reported speech', 'reported-speech', [/^He said that/, /^She said:/], [`Reported speech: ${L.subordinationText.reported}; quotation marker: ${L.subordinationText.quotative}. ${cap(L.localText.tenseSequence)}.`]);
    add('information', 'Information structure', 'information', [], [`Topic: ${L.informationText.topic}. Focus: ${L.informationText.focus}.`]);
    add('demonstratives', 'Demonstratives and reflexives', 'demonstratives', [/^This is \[?large|^Who is this|^What is this|^This is good/], [`Demonstratives: ${L.informationText.demonstratives}. Reflexives: ${L.informationText.reflexive}. Politeness: ${L.localText.register}.`]);
    return out;
}

export function buildGuide(lang) {
    const noun = pickNoun(lang);
    const nominal = [morphTypeTopic(lang, noun), numberTopic(lang, noun), genderTopic(lang), caseTopic(lang, noun), possessionTopic(lang, noun), alignmentTopic(lang), additiveTopic(lang, noun), adjectiveTopic(lang)].filter(Boolean);
    const verbal = verbalTopics(lang);
    const syntax = syntaxTopics(lang);
    const sections = [{ id: 'guide-nominal', title: 'Nouns and noun phrases', topics: nominal }, { id: 'guide-verbal', title: 'Verbs', topics: verbal }, { id: 'guide-syntax', title: 'Clauses and sentences', topics: syntax }];
    const used = new Set();
    for (const s of sections) for (const t of s.topics) for (const e of t.examples) for (const w of e.words) codesIn(w.gloss).forEach(c => used.add(c));
    const order = Object.keys(ABBREVIATIONS);
    const abbreviations = [...used].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map(code => ({ code, label: ABBREVIATIONS[code][0], leipzig: ABBREVIATIONS[code][1] }));
    return { sections, abbreviations };
}
