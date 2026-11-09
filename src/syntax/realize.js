// Sentence realiser. Templates are data (data/sentence-templates.json); this module applies the
// language's word order, adposition vs case marking, articles, adjective position and agreement.
import { norm } from '../core/text.js';
import { label } from '../lexicon/schema.js';
import { inflect, genderOf } from '../morphology/inflect.js';

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
    const { spec, model, affixes, lexicon } = lang;
    const index = buildIndex(lexicon);
    const morph = { spec, model, affixes };
    const partial = [];

    const word = (entry, features = {}) => {
        const r = inflect(entry, features, morph);
        return { kind: 'word', id: entry.id, gloss: label(entry), form: r.form, parts: r.parts };
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
    return { spec, model, index, morph, partial, word, need, alternatives };
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
    if (np.poss) pre.push(word(need(np.poss)));
    const number = np.number ?? role.agree?.number ?? 'singular';

    const phrases = heads.map(h => {
        const features = { case: role.case, number };
        if (h.pos === 'adjective') features.gender = role.agree?.gender ?? spec.genders[0] ?? null;
        const headTok = word(h, features);
        if (!np.adj) return [headTok];
        const adjEntries = alternatives(np.adj);
        const adjFeatures = { case: role.case, number, gender: genderOf(h, spec) ?? spec.genders[0] };
        const adjToks = adjEntries.map(a => word(a, adjFeatures));
        const adjGroup = adjToks.length === 1 ? adjToks[0] : { kind: 'alts', options: adjToks.map(t => [t]) };
        return spec.adjPosition === 'before' ? [adjGroup, headTok] : [headTok, adjGroup];
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

export function realize(template, lang) {
    const { spec, model } = lang;
    if (template.requires?.number && !spec.numbers.includes(template.requires.number)) return { id: template.id, english: template.en, skipped: 'unavailable' };
    if (template.requires?.gender && !spec.genders.length) return { id: template.id, english: template.en, skipped: 'unavailable' };
    const ctx = makeContext(lang);
    try {
        const verbEntry = template.V ? ctx.alternatives(template.V.head)[0] : null;
        const copula = verbEntry?.features.transitivity === 'copula';
        const hasObject = template.O && !template.O.adp;
        const transitive = !!verbEntry && ['transitive', 'ditransitive'].includes(verbEntry.features.transitivity) && hasObject;
        const ergative = model.alignment === 'ergative-absolutive';
        const caseS = ergative ? (transitive ? 'ergative' : 'absolutive') : 'nominative';
        const caseO = ergative ? 'absolutive' : (transitive ? 'accusative' : 'nominative');
        const adpPos = adpositionPosition(spec.order);

        const parts = {};
        let subjectHead = null;
        if (template.S) {
            const r = nounPhrase(template.S, { case: caseS }, ctx);
            parts.S = r.tokens; subjectHead = r.head;
        }
        const agree = subjectHead ? { gender: subjectHead.pos === 'noun' ? genderOf(subjectHead, spec) : null, number: template.S.number ?? 'singular' } : undefined;
        if (template.O) {
            const r = template.O.adp ? prepositionalPhrase(template.O, ctx, adpPos) : nounPhrase(template.O, { case: copula ? caseS : caseO, agree }, ctx);
            parts.O = r.tokens;
        }
        if (template.V) {
            const v = template.V;
            const toks = [];
            if (v.neg) toks.push(ctx.word(ctx.need('not:particle')));
            if (v.aux) toks.push(ctx.word(ctx.need(v.aux)));
            toks.push(...ctx.alternatives(v.head).length > 1
                ? [{ kind: 'alts', options: ctx.alternatives(v.head).map(e => [ctx.word(e)]) }]
                : [ctx.word(verbEntry)]);
            parts.V = toks;
        }
        if (template.initial) parts.initial = template.initial.flatMap(np => nounPhrase(np, { case: model.baseCase }, ctx).tokens);

        const sequence = template.seq ?? [...(parts.initial ? ['initial'] : []), ...spec.order.split('')];
        const tokens = sequence.flatMap(k => parts[k] ?? []);
        return { id: template.id, english: template.en, tokens, partial: ctx.partial.length ? [...ctx.partial] : undefined };
    } catch (e) {
        if (e instanceof Skip) return { id: template.id, english: template.en, skipped: 'missing', missing: e.message };
        throw e;
    }
}

export function generateSamples(templates, lang) {
    const samples = [];
    const skipped = [];
    for (const t of templates) {
        const r = realize(t, lang);
        if (r.skipped) { if (r.skipped === 'missing') skipped.push({ id: r.id, english: r.english, missing: r.missing }); continue; }
        samples.push({ number: samples.length + 1, ...r });
    }
    return { samples, skipped };
}

export function tokenText(tokens) {
    return tokens.map(t => t.kind === 'alts' ? `[${t.options.map(o => tokenText(o)).join('|')}]` : t.form).join(' ');
}
