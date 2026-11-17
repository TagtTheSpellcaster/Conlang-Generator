// Sentence realiser. Templates are data (data/sentence-templates.json); this module applies the
// language's word order, adposition vs case marking, articles, adjective position and agreement.
import { norm } from '../core/text.js';
import { label } from '../lexicon/schema.js';
import { inflect, genderOf } from '../morphology/inflect.js';
import { cellOf } from '../morphology/affixes.js';
import { chooseValency } from './valency.js';
import { chooseSubordination, SUFFIX_KEY } from './subordination.js';
import { chooseLocal, evidentialsOf, EVIDENTIAL_ENTRY } from './local.js';
import { reflexiveRef, REFLEXIVE_REFS } from '../discourse/info.js';
import { numeralForm, isDefined, classifierFor } from '../numerals/system.js';

const TIER_RANK = { core: 0, common: 1, domain: 2 };

export function buildIndex(lexicon) {
    const byId = new Map(lexicon.map(e => [e.id, e]));
    const byLemma = new Map();
    for (const e of lexicon) {
        const key = `${norm(e.lemma)}:${e.pos}`;
        const cur = byLemma.get(key);
        const better = !cur || (!e.gloss && cur.gloss) || (!e.gloss === !cur.gloss && TIER_RANK[e.tier] < TIER_RANK[cur.tier]);
        if (better) byLemma.set(key, e);
    }
    return { byId, resolve: ref => ref.includes('.') ? byId.get(ref) : byLemma.get(norm(ref)) };
}

class Skip extends Error {}
class Unavailable extends Skip {}   // the language has no such construction (a voice it does not mark)
const asList = x => x === undefined ? [] : Array.isArray(x) ? x : [x];

const CORE_ADPOSITION_CASES = new Set(['nominative', 'accusative', 'absolutive', 'ergative', 'genitive']);

export function adpositionPosition(order) {
    return order.indexOf('V') < order.indexOf('O') ? 'before' : 'after';
}

function makeContext(lang) {
    const { spec, model, affixes, lexicon, numerals } = lang;
    const index = buildIndex(lexicon);
    const morph = { spec, model, affixes };
    const partial = [];

    const word = (entry, features = {}) => {
        const r = inflect(entry, features, morph);
        const meanings = r.parts.filter(p => p.meaning).map(p => p.meaning);
        return { kind: 'word', id: entry.id, gloss: meanings.length ? `${label(entry)} (${meanings.join(', ')})` : label(entry), form: r.form, parts: r.parts };
    };
    const need = (ref, optional = false) => {
        const e = index.resolve(ref);
        if (!e && !optional) throw new Skip(ref);
        return e;
    };
    // all alternatives of a slot; missing ones are dropped and reported, none left = skip
    const alternatives = head => {
        const found = [];
        for (const ref of asList(head)) {
            const e = index.resolve(ref);
            if (e) found.push(e); else partial.push(ref);
        }
        if (!found.length) throw new Skip(asList(head).join('|'));
        return found;
    };
    return { spec, model, index, morph, partial, word, need, alternatives, numerals, lang, info: lang.info ?? {}, valency: lang.valency ?? chooseValency(spec), sub: lang.subordination ?? chooseSubordination(spec), local: lang.local ?? chooseLocal(spec), used: {} };
}

// features: { case, number, agree: {gender, number} }
function nounPhrase(np, role, ctx) {
    const { spec, word, need, alternatives } = ctx;
    const heads = alternatives(np.head);
    const pre = [];
    let demonstrative = null;
    if (np.dem) {
        const ref = np.dem === 'distal' && ctx.info.demonstrative?.terms !== 'one' ? 'demonstrative.that' : 'demonstrative.this';
        demonstrative = word(need(ref));
        if ((ctx.info.demonstrative?.position ?? 'before') === 'before') pre.push(demonstrative);
    } else if (np.det) {
        const art = ctx.index.resolve(np.det === 'definite' ? 'the:determiner' : 'a:determiner');
        if (art && spec.articles !== 'none') pre.push(word(art));
    }
    const number = np.number ?? role.agree?.number ?? 'singular';
    // Agglutinative languages mark the possessor with a suffix on the noun instead of a separate word.
    let possessor = null;
    if (np.poss) {
        const possEntry = need(np.poss);
        if (ctx.morph.affixes.possessive && possEntry.features.person && heads.every(h => h.pos === 'noun')) possessor = cellOf(possEntry.features.person, possEntry.features.number);
        else pre.push(word(possEntry));
    }

    // counted nouns: numeral (+ classifier) on the side of the noun the language prefers; no plural marking with classifiers
    const counts = asList(np.num);
    let numerals = null;
    if (counts.length) {
        const sys = ctx.numerals;
        if (!sys) throw new Skip('numerals');
        const usable = counts.filter(n => isDefined(sys, n));
        for (const n of counts) if (!usable.includes(n)) ctx.partial.push(`numeral ${n}`);
        if (!usable.length) throw new Skip(`numeral ${counts.join('|')}`);
        numerals = { sys, values: usable };
    }
    const wordOf = (text, id, gloss) => ({ kind: 'word', id, gloss, form: text, parts: [{ text, kind: 'stem' }] });

    const phrases = heads.map(h => {
        let numberHere = number;
        let counted = null;
        if (numerals && h.pos === 'noun') {
            const clf = classifierFor(numerals.sys, h);
            const values = numerals.values;
            if (!clf && values.every(n => n === 2) && spec.numbers.includes('dual')) numberHere = 'dual';
            else if (!clf && values.some(n => n > 1) && spec.numbers.includes('plural')) numberHere = 'plural';
            else if (clf) numberHere = 'singular';
            const toks = values.map(n => wordOf(numeralForm(numerals.sys, n, spec).form, `numeral.${n}`, String(n)));
            const clfTok = clf ? wordOf(clf.form, `classifier.${clf.id}`, `classifier (${clf.label})`) : null;
            const group = toks.length === 1 ? [toks[0], ...(clfTok ? [clfTok] : [])] : [{ kind: 'alts', options: toks.map(t => [t, ...(clfTok ? [clfTok] : [])]) }];
            counted = group;
        }
        const features = { case: role.case, number: numberHere, possessor };
        if (h.pos === 'adjective') features.gender = role.agree?.gender ?? spec.genders[0] ?? null;
        // comparative: a suffix in agglutinative languages, otherwise the word "more" before the adjective
        const comparative = np.degree === 'comparative' && h.pos === 'adjective';
        if (comparative) features.degree = 'comparative';
        const headTok = word(h, features);
        const around = phrase => (counted ? (ctx.numerals.config.position === 'after' ? [...phrase, ...counted] : [...counted, ...phrase]) : phrase);
        if (comparative && !ctx.morph.affixes.comparative) return [word(need('more:adverb')), headTok];
        if (!np.adj) return around([headTok]);
        const adjEntries = alternatives(np.adj);
        const adjFeatures = { case: role.case, number: numberHere, gender: genderOf(h, spec) ?? spec.genders[0] };
        const adjToks = adjEntries.map(a => word(a, adjFeatures));
        const adjGroup = adjToks.length === 1 ? adjToks[0] : { kind: 'alts', options: adjToks.map(t => [t]) };
        return around(spec.adjPosition === 'before' ? [adjGroup, headTok] : [headTok, adjGroup]);
    });
    const core = phrases.length === 1 ? phrases[0] : [{ kind: 'alts', options: phrases }];
    const adpPos = adpositionPosition(spec.order);
    const headFinal = adpPos === 'after';
    let tokens = [...pre, ...core];
    // genitive: "the dog of the man" / "the man's dog": the possessor before the head in head-final languages, after it otherwise;
    // a case ending where the language has a genitive, otherwise the adposition "of"
    if (np.gen) {
        const g = prepositionalPhrase({ adp: 'of:adposition', case: 'genitive', np: np.gen }, ctx, adpPos).tokens;
        tokens = headFinal ? [...pre, ...g, ...core] : [...pre, ...core, ...g];
    }
    // relative clause: before the noun in head-final languages (closed by the relativiser), after it otherwise (opened by it)
    if (np.rel) {
        const inner = clauseTokens(np.rel.clause, ctx.lang, ctx, false, { gap: np.rel.role, headNumber: number });
        const rel = word(need('that:pronoun'));
        tokens = headFinal ? [...pre, ...inner, rel, ...tokens.slice(pre.length)] : [...tokens, rel, ...inner];
    }
    // a demonstrative placed after the noun phrase
    if (demonstrative && !pre.includes(demonstrative)) tokens = [...tokens, demonstrative];
    // coordination: "A and B"
    if (np.and) {
        const second = nounPhrase(np.and, role, ctx);
        tokens = [...tokens, word(need('and:conjunction')), ...second.tokens];
    }
    return { tokens, head: heads.length === 1 && !np.and ? heads[0] : null };
}

function prepositionalPhrase(pp, ctx, adpPos) {
    const { model, spec, word, need } = ctx;
    const heads = ctx.alternatives(pp.np.head);
    const objectPronoun = heads.some(h => h.pos === 'pronoun' && h.features.role === 'object');
    const caseMarked = ['cases', 'ergative'].includes(spec.relations) || (spec.relations === 'mixed' && CORE_ADPOSITION_CASES.has(pp.case));
    if (caseMarked && model.cases.includes(pp.case) && !objectPronoun) return nounPhrase(pp.np, { case: pp.case }, ctx);
    const inner = nounPhrase(pp.np, { case: model.baseCase }, ctx);
    const adp = word(need(pp.adp));
    return { tokens: adpPos === 'before' ? [adp, ...inner.tokens] : [...inner.tokens, adp], head: inner.head };
}

// Realises one clause (a main sentence or a subordinate clause) and returns its token sequence.
const SECOND_PERSON = new Set(['pronoun.second_person_singular', 'pronoun.second_person_singular_object']);
// polite address with the plural of the second person
const politeForm = t => {
    const swap = np => np && !np.adp && asList(np.head).length === 1 && SECOND_PERSON.has(asList(np.head)[0]) ? { ...np, head: 'pronoun.second_person_plural' } : np;
    return { ...t, S: swap(t.S), O: swap(t.O) };
};
const isWh = t => !!t.initial?.length && t.initial.every(np => asList(np.head).every(h => String(h).startsWith('interrogative.')));

function clauseTokens(template, lang, ctx, top, opts = {}) {
    const { spec, model } = lang;
    const LOC = ctx.local;
    if (template.polite) {
        if (!LOC.register.pronoun && LOC.register.particle === 'none') throw new Unavailable('register');
        if (LOC.register.pronoun) template = politeForm(template);
    }
    // tense sequence: a clause reported under a past verb keeps the speaker's tense in languages without backshift
    const shiftedBack = !!(template.shifted && opts.underPast && LOC.tenseSequence === 'absolute');
    if (shiftedBack) ctx.used.noShift = true;
    const tenseName = shiftedBack ? 'present' : (template.tense ?? 'present');
    const verbEntry = template.V ? ctx.alternatives(template.V.head)[0] : null;
    const copula = verbEntry?.features.transitivity === 'copula';
    const hasObject = (template.O && !template.O.adp) || opts.gap === 'O';
    const voice = template.V?.voice ?? null, voiceHow = voice ? ctx.valency[voice] : null;
    if (voice && !voiceHow) throw new Unavailable(`voice:${voice}`);
    // causative and applicative add an argument: an object is then a core argument whatever the verb says
    const transitive = !!verbEntry && hasObject && (['transitive', 'ditransitive'].includes(verbEntry.features.transitivity) || voice === 'causative' || voice === 'applicative');
    const ergative = model.alignment === 'ergative-absolutive';
    const caseS = ergative ? (transitive ? 'ergative' : 'absolutive') : 'nominative';
    const caseO = ergative ? 'absolutive' : (transitive ? 'accusative' : 'nominative');
    const adpPos = adpositionPosition(spec.order);

    // Person and number of the subject drive verb agreement. A personal pronoun is dropped when the verb carries it.
    const sHeads = template.S ? asList(template.S.head).map(ref => ctx.index.resolve(ref)).filter(Boolean) : [];
    const sPronoun = sHeads.length === 1 && sHeads[0].pos === 'pronoun' && sHeads[0].features.person ? sHeads[0] : null;
    const person = template.mood === 'imperative' ? 2 : opts.gap === 'S' && opts.person ? opts.person : (sPronoun?.features.person ?? 3);
    const personNumber = opts.gap === 'S' ? (opts.headNumber ?? 'singular') : template.S?.and ? 'plural' : (sPronoun?.features.number ?? template.S?.number ?? 'singular');
    const prodrop = !!(ctx.morph.affixes.verb && verbEntry && sPronoun);

    const parts = {};
    let subjectHead = null;
    if (template.S) {
        const r = nounPhrase(template.S, { case: caseS }, ctx);
        parts.S = prodrop ? [] : r.tokens; subjectHead = r.head;
    }
    const agree = subjectHead || template.S?.and ? { gender: subjectHead?.pos === 'noun' ? genderOf(subjectHead, spec) : null, number: template.S.and ? 'plural' : (template.S.number ?? 'singular') } : undefined;
    let objectNp = template.O;
    if (objectNp?.refl) {
        const cls = typeof objectNp.refl === 'string' ? objectNp.refl : sPronoun?.tags?.includes('male') ? 'male' : sPronoun?.tags?.includes('female') ? 'female' : 'neutral';
        objectNp = { head: reflexiveRef(ctx.info, person, personNumber, personNumber === 'plural' && person === 3 ? 'plural' : cls) };
    }
    if (template.O) {
        const r = objectNp.adp ? prepositionalPhrase(objectNp, ctx, adpPos) : nounPhrase(objectNp, { case: copula ? caseS : caseO, agree }, ctx);
        parts.O = r.tokens;
    }
    if (template.V) {
        const v = template.V;
        const verbAffixes = ctx.morph.affixes.verb;
        const toks = [];
        const optative = template.mood === 'optative';
        const vf = {
            tense: tenseName, person, number: personNumber, imperative: template.mood === 'imperative',
            negative: !!(v.neg && verbAffixes?.negation), potential: !!(v.aux === 'can:particle' && verbAffixes?.potential),
            optative: optative && !!verbAffixes?.optative, aspect: v.aspect && verbAffixes?.aspect ? v.aspect : null,
            voice: voiceHow === 'affix' ? voice : null, converb: !!opts.converb, subordinator: opts.subordinator ?? null
        };
        if (voiceHow === 'particle') toks.push(ctx.word(ctx.need(`${voice} marker:particle`)));
        // languages without the matching verb suffix use a separate word before the verb
        if (optative && !verbAffixes?.optative) toks.push(ctx.word(ctx.need('may:particle')));
        // prohibitive: the language may use a word or a suffix of its own instead of the ordinary negation
        const prohibitive = template.mood === 'imperative' && v.neg;
        vf.prohibitive = !!(prohibitive && LOC.prohibitive === 'suffix' && verbAffixes?.negation && ctx.morph.affixes.local?.prohibitive);
        if (prohibitive && LOC.prohibitive === 'particle') { vf.negative = false; toks.push(ctx.word(ctx.need('prohibitive marker:particle'))); }
        else if (v.neg && !verbAffixes?.negation) toks.push(ctx.word(ctx.need('not:particle')));
        // evidentiality: a suffix on the verb or a particle after it
        let evidence = null;
        if (template.evid) {
            if (!evidentialsOf(LOC).includes(template.evid)) throw new Unavailable(`evidential:${template.evid}`);
            if (LOC.evidentiality.mode === 'suffix' && ctx.morph.affixes.local?.evidential?.[template.evid]) vf.evidential = template.evid;
            else evidence = ctx.word(ctx.need(EVIDENTIAL_ENTRY[template.evid]));
        }
        if (v.aux && !vf.potential) toks.push(ctx.word(ctx.need(v.aux)));
        if (v.aspect && !vf.aspect) toks.push(ctx.word(ctx.need(`${v.aspect} marker:particle`)));
        const verbs = ctx.alternatives(v.head);
        toks.push(...verbs.length > 1 ? [{ kind: 'alts', options: verbs.map(e => [ctx.word(e, vf)]) }] : [ctx.word(verbEntry, vf)]);
        parts.V = evidence ? [...toks, evidence] : toks;
    }
    if (template.initial) parts.initial = template.initial.flatMap(np => nounPhrase(np, { case: model.baseCase }, ctx).tokens);
    // adjuncts (A, B): a prepositional phrase (adp + np) or a bare noun phrase, e.g. "to me", "now"
    for (const key of ['A', 'B']) {
        const adj = template[key];
        if (adj) parts[key] = (adj.adp ? prepositionalPhrase(adj, ctx, adpPos) : nounPhrase(adj, { case: model.baseCase }, ctx)).tokens;
    }
    // Subordinate clauses. The subordinator follows its clause in head-final languages and precedes it otherwise.
    // A complement clause ("that ...") takes the place of the object; an adverbial clause goes first in head-final
    // languages and last in head-initial ones.
    const place = (inner, word, position) => position === 'after' ? [...inner, word] : [word, ...inner];
    const subject = { gap: 'S', headNumber: personNumber, person };           // a clause whose subject is the subject of this one
    const SUBS = ctx.sub, affixes = ctx.morph.affixes.subordinators;
    const complement = c => {
        if (c.control) return clauseTokens(c.clause, lang, ctx, false, subject);   // "I want [to] eat": no subject, no complementizer
        const inner = clauseTokens(c.clause, lang, ctx, false, { underPast: template.tense === 'past' });
        if (c.conj === 'that:conjunction') return SUBS.complement.mode === 'none' ? inner : place(inner, ctx.word(ctx.need(c.conj)), SUBS.complement.position);
        return place(inner, ctx.word(ctx.need(c.conj)), adpPos === 'after' ? 'after' : 'before');
    };
    const adverbial = a => {
        const key = SUFFIX_KEY[a.conj];
        if (key && SUBS.adverbial.mode === 'suffix' && affixes?.[key]) return clauseTokens(a.clause, lang, ctx, false, { subordinator: key });
        return place(clauseTokens(a.clause, lang, ctx, false), ctx.word(ctx.need(a.conj)), SUBS.adverbial.position);
    };
    // A complement clause takes the place of the object; an adverbial clause goes first in head-final languages and last in head-initial ones.
    if (template.comp) parts.O = [...(parts.O ?? []), ...complement(template.comp)];
    if (template.adv) parts.SUB = adverbial(template.adv);
    // reported speech: a quotation or a complement clause, as the language does it
    if (template.quote) {
        const q = template.quote, mode = SUBS.reported === 'both' ? (q.prefer ?? 'indirect') : SUBS.reported;
        ctx.used.quote = mode;
        if (mode === 'indirect') parts.O = [...(parts.O ?? []), ...complement({ conj: 'that:conjunction', clause: q.indirect })];
        else {
            const inner = clauseTokens(q.direct, lang, ctx, true);
            parts.O = [...(parts.O ?? []), ...(SUBS.quotative === 'particle' ? place(inner, ctx.word(ctx.need('quotative marker:particle')), adpPos === 'after' ? 'after' : 'before') : inner)];
        }
    }
    // a converb clause ("singing, he walked") comes first; without a converb the two clauses are joined with "and"
    let conjoined = null;
    if (template.conv) {
        if (SUBS.converb && affixes?.converb) parts.CONV = clauseTokens(template.conv.clause, lang, ctx, false, { ...subject, converb: true });
        else conjoined = clauseTokens(template.conv.clause, lang, ctx, false, subject);
    }

    // question words: left in place, in the slot of the missing argument, unless the language fronts them
    const whInSitu = isWh(template) && parts.initial && LOC.wh.position === 'in-situ';
    if (whInSitu) {
        const slot = !template.S ? 'S' : !template.O ? 'O' : 'B';
        parts[slot] = [...(parts[slot] ?? []), ...parts.initial]; delete parts.initial;
    }
    const base = [...(parts.initial ? ['initial'] : []), ...spec.order.split(''), 'A', 'B'];
    const sequence = whInSitu ? base : template.seq ?? (parts.SUB ? (adpPos === 'after' ? ['SUB', ...base] : [...base, 'SUB']) : base);
    // information structure: the topic is fronted (and marked, if the language has a topic marker); focus is marked or fronted
    let order = parts.CONV ? [...sequence.filter(k => k === 'initial'), 'CONV', ...sequence.filter(k => k !== 'initial')] : sequence;
    if (template.info) {
        const { topic, focus } = template.info, st = ctx.info;
        const front = [];
        if (topic && st.topic && st.topic !== 'none' && parts[topic]?.length) {
            front.push(topic);
            if (st.topic === 'particle') parts[topic] = [...parts[topic], ctx.word(ctx.need('topic marker:particle'))];
        }
        if (focus && focus !== topic && st.focus && st.focus !== 'none' && parts[focus]?.length) {
            if (st.focus === 'front') front.push(focus);
            else parts[focus] = [...parts[focus], ctx.word(ctx.need('focus marker:particle'))];
        }
        if (front.length) { const rest = order.filter(k => !front.includes(k)), lead = rest[0] === 'initial' ? ['initial'] : []; order = [...lead, ...front, ...rest.filter(k => !lead.includes(k))]; }
    }
    let tokens = order.flatMap(k => parts[k] ?? []);
    if (conjoined) tokens = [...conjoined, ctx.word(ctx.need('and:conjunction')), ...tokens];
    // coordinated clause: "A, and B" / "A, but B"
    if (template.coord) tokens = [...tokens, ctx.word(ctx.need(template.coord.conj)), ...clauseTokens(template.coord.clause, lang, ctx, false)];
    // yes/no question: a final particle in head-final languages, an initial one otherwise
    if (top && template.q === 'yesno') {
        const q = ctx.word(ctx.need('question particle:particle'));
        tokens = adpPos === 'after' ? [...tokens, q] : [q, ...tokens];
    }
    if (top && isWh(template) && LOC.wh.particle) {
        const q = ctx.word(ctx.need('question particle:particle'));
        tokens = adpPos === 'after' ? [...tokens, q] : [q, ...tokens];
    }
    if (top && template.polite && LOC.register.particle !== 'none') {
        const p = ctx.word(ctx.need('polite marker:particle'));
        tokens = LOC.register.particle === 'after' ? [...tokens, p] : [p, ...tokens];
    }
    return tokens;
}

export function realize(template, lang) {
    const { spec } = lang;
    if (template.requires?.number && !spec.numbers.includes(template.requires.number)) return { id: template.id, english: template.en, skipped: 'unavailable' };
    if (template.requires?.gender && !spec.genders.length) return { id: template.id, english: template.en, skipped: 'unavailable' };
    const ctx = makeContext(lang);
    try {
        const tokens = clauseTokens(template, lang, ctx, true);
        // a direct quotation changes the English of the sentence
        const english = ctx.used.quote === 'direct' && template.enDirect ? template.enDirect : ctx.used.noShift && template.enNoShift ? template.enNoShift : template.en;
        return { id: template.id, english, quote: ctx.used.quote, noShift: ctx.used.noShift, tokens, partial: ctx.partial.length ? [...ctx.partial] : undefined };
    } catch (e) {
        if (e instanceof Unavailable) return { id: template.id, english: template.en, skipped: 'unavailable' };
        if (e instanceof Skip) return { id: template.id, english: template.en, skipped: 'missing', missing: e.message };
        throw e;
    }
}

// Sentence sets. The template file holds { universal: [...], genres: { id: [...] } }; a plain array is a universal list.
export function templateSets(templates, genre) {
    if (Array.isArray(templates)) return { universal: templates, specialised: [] };
    return { universal: templates?.universal ?? [], specialised: genre ? (templates?.genres?.[genre] ?? []) : [] };
}

// Every lexical reference of a template (lemma:pos or id), including the function words the realiser adds on its own.
export function templateRefs(t) {
    const refs = new Set(['the:determiner', 'a:determiner', 'not:particle', 'can:particle']);
    const walk = x => {
        if (!x || typeof x !== 'object') return;
        for (const [k, v] of Object.entries(x)) {
            if (['head', 'adj', 'poss', 'adp', 'aux', 'conj'].includes(k)) asList(v).forEach(r => refs.add(r));
            else if (k === 'initial') { v.forEach(walk); if (isWh(t)) refs.add('question particle:particle'); }
            else if (['S', 'V', 'O', 'A', 'B', 'np', 'comp', 'adv', 'conv', 'quote', 'direct', 'indirect', 'clause', 'coord', 'gen', 'rel', 'and'].includes(k)) { walk(v); if (k === 'and' || k === 'conv') refs.add('and:conjunction'); if (k === 'quote') { refs.add('that:conjunction'); refs.add('quotative marker:particle'); } if (k === 'gen') refs.add('of:adposition'); if (k === 'rel') refs.add('that:pronoun'); }
            // function words the realiser adds for grammar the language may express with a separate word
            else if (k === 'q') refs.add('question particle:particle');
            else if (k === 'dem') { refs.add('demonstrative.this'); refs.add('demonstrative.that'); }
            else if (k === 'refl') REFLEXIVE_REFS.forEach(r => refs.add(r));
            else if (k === 'info') { if (v.topic) refs.add('topic marker:particle'); if (v.focus) refs.add('focus marker:particle'); }
            else if (k === 'aspect' || k === 'voice') refs.add(`${v} marker:particle`);
            else if (k === 'degree') refs.add('more:adverb');
            else if (k === 'mood' && v === 'optative') refs.add('may:particle');
            else if (k === 'evid') refs.add(EVIDENTIAL_ENTRY[v]);
            else if (k === 'polite') refs.add('polite marker:particle');
        }
    };
    walk(t);
    if (t.mood === 'imperative' && t.V?.neg) refs.add('prohibitive marker:particle');
    return refs;
}

// The dictionary senses the sample sentences need, so a language always contains them (whatever the genre excludes).
export function requiredEntries(templateList, vocabulary) {
    const index = buildIndex(vocabulary);
    const found = new Map();
    for (const t of templateList) for (const ref of templateRefs(t)) { const e = index.resolve(ref); if (e) found.set(e.id, e); }
    return [...found.values()];
}

export function generateSamples(templates, lang, genre = lang.spec.genre) {
    const sets = templateSets(templates, genre);
    const samples = [];
    const skipped = [];
    for (const [scope, list] of [['universal', sets.universal], ['genre', sets.specialised]]) {
        let n = 0;
        for (const t of list) {
            const r = realize(t, lang);
            if (r.skipped) { if (r.skipped === 'missing') skipped.push({ id: r.id, scope, topic: t.topic, english: r.english, missing: r.missing }); continue; }
            samples.push({ number: ++n, scope, topic: t.topic ?? null, ...r });
        }
    }
    return { samples, skipped };
}

export function tokenText(tokens) {
    return tokens.map(t => t.kind === 'alts' ? `[${t.options.map(o => tokenText(o)).join('|')}]` : t.form).join(' ');
}
