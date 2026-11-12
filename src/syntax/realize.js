// Sentence realiser. Templates are data (data/sentence-templates.json); this module applies the
// language's word order, adposition vs case marking, articles, adjective position and agreement.
import { norm } from '../core/text.js';
import { label } from '../lexicon/schema.js';
import { inflect, genderOf } from '../morphology/inflect.js';
import { cellOf } from '../morphology/affixes.js';
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
    return { spec, model, index, morph, partial, word, need, alternatives, numerals };
}

// features: { case, number, agree: {gender, number} }
function nounPhrase(np, role, ctx) {
    const { spec, word, need, alternatives } = ctx;
    const heads = alternatives(np.head);
    const pre = [];
    if (np.det) {
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
    return { tokens: [...pre, ...core], head: heads.length === 1 ? heads[0] : null };
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
function clauseTokens(template, lang, ctx, top) {
    const { spec, model } = lang;
    const verbEntry = template.V ? ctx.alternatives(template.V.head)[0] : null;
    const copula = verbEntry?.features.transitivity === 'copula';
    const hasObject = template.O && !template.O.adp;
    const transitive = !!verbEntry && ['transitive', 'ditransitive'].includes(verbEntry.features.transitivity) && hasObject;
    const ergative = model.alignment === 'ergative-absolutive';
    const caseS = ergative ? (transitive ? 'ergative' : 'absolutive') : 'nominative';
    const caseO = ergative ? 'absolutive' : (transitive ? 'accusative' : 'nominative');
    const adpPos = adpositionPosition(spec.order);

    // Person and number of the subject drive verb agreement. A personal pronoun is dropped when the verb carries it.
    const sHeads = template.S ? asList(template.S.head).map(ref => ctx.index.resolve(ref)).filter(Boolean) : [];
    const sPronoun = sHeads.length === 1 && sHeads[0].pos === 'pronoun' && sHeads[0].features.person ? sHeads[0] : null;
    const person = template.mood === 'imperative' ? 2 : (sPronoun?.features.person ?? 3);
    const personNumber = sPronoun?.features.number ?? template.S?.number ?? 'singular';
    const prodrop = !!(ctx.morph.affixes.verb && verbEntry && sPronoun);

    const parts = {};
    let subjectHead = null;
    if (template.S) {
        const r = nounPhrase(template.S, { case: caseS }, ctx);
        parts.S = prodrop ? [] : r.tokens; subjectHead = r.head;
    }
    const agree = subjectHead ? { gender: subjectHead.pos === 'noun' ? genderOf(subjectHead, spec) : null, number: template.S.number ?? 'singular' } : undefined;
    if (template.O) {
        const r = template.O.adp ? prepositionalPhrase(template.O, ctx, adpPos) : nounPhrase(template.O, { case: copula ? caseS : caseO, agree }, ctx);
        parts.O = r.tokens;
    }
    if (template.V) {
        const v = template.V;
        const verbAffixes = ctx.morph.affixes.verb;
        const toks = [];
        const optative = template.mood === 'optative';
        const vf = {
            tense: template.tense ?? 'present', person, number: personNumber, imperative: template.mood === 'imperative',
            negative: !!(v.neg && verbAffixes?.negation), potential: !!(v.aux === 'can:particle' && verbAffixes?.potential),
            optative: optative && !!verbAffixes?.optative, aspect: v.aspect && verbAffixes?.aspect ? v.aspect : null
        };
        // languages without the matching verb suffix use a separate word before the verb
        if (optative && !verbAffixes?.optative) toks.push(ctx.word(ctx.need('may:particle')));
        if (v.neg && !verbAffixes?.negation) toks.push(ctx.word(ctx.need('not:particle')));
        if (v.aux && !vf.potential) toks.push(ctx.word(ctx.need(v.aux)));
        if (v.aspect && !vf.aspect) toks.push(ctx.word(ctx.need(`${v.aspect} marker:particle`)));
        const verbs = ctx.alternatives(v.head);
        toks.push(...verbs.length > 1 ? [{ kind: 'alts', options: verbs.map(e => [ctx.word(e, vf)]) }] : [ctx.word(verbEntry, vf)]);
        parts.V = toks;
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
    const subordinate = sub => {
        const inner = clauseTokens(sub.clause, lang, ctx, false);
        const conj = ctx.word(ctx.need(sub.conj));
        return adpPos === 'after' ? [...inner, conj] : [conj, ...inner];
    };
    if (template.comp) parts.O = [...(parts.O ?? []), ...subordinate(template.comp)];
    if (template.adv) parts.SUB = subordinate(template.adv);

    const base = [...(parts.initial ? ['initial'] : []), ...spec.order.split(''), 'A', 'B'];
    const sequence = template.seq ?? (parts.SUB ? (adpPos === 'after' ? ['SUB', ...base] : [...base, 'SUB']) : base);
    let tokens = sequence.flatMap(k => parts[k] ?? []);
    // yes/no question: a final particle in head-final languages, an initial one otherwise
    if (top && template.q === 'yesno') {
        const q = ctx.word(ctx.need('question particle:particle'));
        tokens = adpPos === 'after' ? [...tokens, q] : [q, ...tokens];
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
        return { id: template.id, english: template.en, tokens, partial: ctx.partial.length ? [...ctx.partial] : undefined };
    } catch (e) {
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
            else if (k === 'initial') v.forEach(walk);
            else if (['S', 'V', 'O', 'A', 'B', 'np', 'comp', 'adv', 'clause'].includes(k)) walk(v);
            // function words the realiser adds for grammar the language may express with a separate word
            else if (k === 'q') refs.add('question particle:particle');
            else if (k === 'aspect') refs.add(`${v} marker:particle`);
            else if (k === 'degree') refs.add('more:adverb');
            else if (k === 'mood' && v === 'optative') refs.add('may:particle');
        }
    };
    walk(t);
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
