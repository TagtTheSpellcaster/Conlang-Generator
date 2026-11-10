// Dictionary schema v2 — the single source of truth.
// Used by the engine, the vocabulary manager, the CLI validator and the tests.
// schema/vocabulary.schema.json is generated from these constants (tools/build-schema.mjs).

export const SCHEMA_VERSION = 2;

export const POS = Object.freeze([
    'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'determiner',
    'numeral', 'quantifier', 'adposition', 'conjunction', 'particle', 'auxiliary'
]);

export const DOMAINS = Object.freeze([
    'abstract', 'action', 'animal', 'body', 'clothing', 'craft', 'faith', 'family', 'food', 'grammar', 'household',
    'magic', 'maritime', 'material', 'music', 'nature', 'need', 'number', 'object', 'quality', 'settlement', 'society',
    'space', 'technology', 'time', 'transport', 'war', 'weapon'
]);

// core: always in the lexicon; common: preferred; domain: only when the filters match.
export const TIERS = Object.freeze(['core', 'common', 'domain']);

export const ERAS = Object.freeze(['prehistoric', 'ancient', 'medieval', 'renaissance', 'modern', 'futuristic']);

export const ANIMACY = Object.freeze(['human', 'animate', 'inanimate']);
export const TRANSITIVITY = Object.freeze(['intransitive', 'transitive', 'ditransitive', 'copula']);
export const PERSONS = Object.freeze([1, 2, 3]);
export const NUMBERS = Object.freeze(['singular', 'plural']);

// Typed features: which keys are allowed for which POS, and their allowed values.
export const FEATURES = Object.freeze({
    animacy: { pos: ['noun'], values: ANIMACY },
    countable: { pos: ['noun'], type: 'boolean' },
    transitivity: { pos: ['verb'], values: TRANSITIVITY },
    person: { pos: ['pronoun', 'determiner'], values: PERSONS },
    number: { pos: ['pronoun', 'determiner'], values: NUMBERS },
    role: { pos: ['pronoun'], values: ['subject', 'object'] }
});

// Relations. Every stored relation must also be stored on its target with the inverse name.
export const INVERSE = Object.freeze({
    opposite: 'opposite',
    gender_pair: 'gender_pair',
    related_to: 'related_to',
    same_as: 'same_as',
    part_of: 'has_part',
    has_part: 'part_of',
    derived_from: 'source_of',
    source_of: 'derived_from'
});
// Directional relation without a stored inverse (the inverse is computed by queries).
export const DIRECTIONAL = Object.freeze(['is_a']);
export const RELATIONS = Object.freeze([...Object.keys(INVERSE), ...DIRECTIONAL]);

export const ENTRY_FIELDS = Object.freeze([
    'id', 'lemma', 'gloss', 'pos', 'domain', 'group', 'tier',
    'region', 'culture', 'biome', 'era', 'tags', 'features', 'relations'
]);
export const REQUIRED_FIELDS = Object.freeze(['id', 'lemma', 'pos', 'domain', 'group', 'tier',
    'region', 'culture', 'biome', 'era', 'tags', 'features', 'relations']);
export const ARRAY_FIELDS = Object.freeze(['region', 'culture', 'biome', 'era', 'tags']);
export const ID_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = v => typeof v === 'string' && v.trim() !== '';

// Human-readable label of a sense: "to eat", "school (of fish)".
export function label(entry) {
    const base = entry.pos === 'verb' ? `to ${entry.lemma}` : entry.lemma;
    return entry.gloss ? `${base} (${entry.gloss})` : base;
}

export function cloneEntry(e) {
    return {
        id: e.id, lemma: e.lemma, ...(e.gloss ? { gloss: e.gloss } : {}), pos: e.pos, domain: e.domain, group: e.group, tier: e.tier,
        region: [...e.region], culture: [...e.culture], biome: [...e.biome], era: [...e.era], tags: [...e.tags],
        features: { ...e.features },
        relations: Object.fromEntries(Object.entries(e.relations).map(([k, v]) => [k, [...v]]))
    };
}

// Entry-level checks (no cross-entry checks). Returns an array of messages.
export function validateEntry(e, where = '') {
    const errors = [];
    const at = where || e?.id || 'entry';
    if (!isObj(e)) return [`${at}: entry must be an object.`];
    for (const f of REQUIRED_FIELDS) if (!(f in e)) errors.push(`${at}: missing "${f}".`);
    for (const f of Object.keys(e)) if (!ENTRY_FIELDS.includes(f)) errors.push(`${at}: unknown field "${f}".`);
    if (!nonEmpty(e.id) || !ID_PATTERN.test(e.id)) errors.push(`${at}: "id" must look like "domain.name" (lowercase, digits, underscores).`);
    if (!nonEmpty(e.lemma)) errors.push(`${at}: "lemma" must be a non-empty string.`);
    else if (/^to\s/i.test(e.lemma) || /_/.test(e.lemma) || /\(|\)/.test(e.lemma)) errors.push(`${at}: "lemma" must be a clean lemma (no "to ", underscores or parentheses; use "gloss" to disambiguate).`);
    if ('gloss' in e && !nonEmpty(e.gloss)) errors.push(`${at}: "gloss", when present, must be a non-empty string.`);
    if (!POS.includes(e.pos)) errors.push(`${at}: "pos" must be one of ${POS.join(', ')}.`);
    if (!DOMAINS.includes(e.domain)) errors.push(`${at}: "domain" must be one of ${DOMAINS.join(', ')}.`);
    if (!nonEmpty(e.group)) errors.push(`${at}: "group" must be a non-empty string.`);
    if (!TIERS.includes(e.tier)) errors.push(`${at}: "tier" must be one of ${TIERS.join(', ')}.`);
    for (const f of ARRAY_FIELDS) {
        if (!Array.isArray(e[f]) || e[f].some(x => !nonEmpty(x))) errors.push(`${at}: "${f}" must be an array of non-empty strings.`);
        else if (new Set(e[f]).size !== e[f].length) errors.push(`${at}: "${f}" contains duplicates.`);
    }
    if (Array.isArray(e.era)) for (const v of e.era) if (!ERAS.includes(v)) errors.push(`${at}: era "${v}" is not one of ${ERAS.join(', ')}.`);
    if (!isObj(e.features)) errors.push(`${at}: "features" must be an object.`);
    else {
        for (const [k, v] of Object.entries(e.features)) {
            const spec = FEATURES[k];
            if (!spec) { errors.push(`${at}: unknown feature "${k}".`); continue; }
            if (!spec.pos.includes(e.pos)) errors.push(`${at}: feature "${k}" is not valid for pos "${e.pos}".`);
            if (spec.type === 'boolean' ? typeof v !== 'boolean' : !spec.values.includes(v)) errors.push(`${at}: feature "${k}" has invalid value ${JSON.stringify(v)}.`);
        }
    }
    if (!isObj(e.relations)) errors.push(`${at}: "relations" must be an object.`);
    else for (const [k, v] of Object.entries(e.relations)) {
        if (!RELATIONS.includes(k)) errors.push(`${at}: unknown relation "${k}".`);
        if (!Array.isArray(v) || !v.length || v.some(x => !nonEmpty(x))) errors.push(`${at}: relation "${k}" must be a non-empty array of ids.`);
    }
    return errors;
}

// Whole-vocabulary checks: unique ids, targets exist, no self reference, inverse closure,
// unique (lemma, pos, gloss) per sense.
export function validateVocabulary(entries) {
    if (!Array.isArray(entries)) return ['"vocabulary" must be an array.'];
    const errors = [];
    const ids = new Map();
    const senses = new Map();
    entries.forEach((e, i) => {
        errors.push(...validateEntry(e, `entry ${i + 1}${e?.id ? ` (${e.id})` : ''}`));
        if (!e || typeof e.id !== 'string') return;
        if (ids.has(e.id)) errors.push(`duplicate id "${e.id}".`);
        ids.set(e.id, e);
        const key = `${String(e.lemma).toLowerCase()}|${e.pos}|${String(e.gloss ?? '').toLowerCase()}`;
        if (senses.has(key)) errors.push(`${e.id}: same lemma/pos/gloss as ${senses.get(key)} (add a gloss or merge them).`);
        else senses.set(key, e.id);
    });
    for (const e of entries) {
        if (!isObj(e?.relations)) continue;
        for (const [rel, targets] of Object.entries(e.relations)) {
            if (!Array.isArray(targets)) continue;
            for (const t of targets) {
                const target = ids.get(t);
                if (!target) { errors.push(`${e.id}.${rel} references unknown id "${t}".`); continue; }
                if (t === e.id) { errors.push(`${e.id}.${rel} references itself.`); continue; }
                const inv = INVERSE[rel];
                if (inv && !(target.relations?.[inv] || []).includes(e.id)) errors.push(`${e.id}.${rel} -> ${t}: missing inverse "${inv}" on ${t}.`);
            }
        }
    }
    return errors;
}

// Throws one Error carrying every message. For callers that prefer exceptions.
export function assertVocabulary(data, source = 'vocabulary') {
    if (!isObj(data) || !Array.isArray(data.vocabulary)) throw new Error(`${source}: expected { "schema": ${SCHEMA_VERSION}, "vocabulary": [...] }.`);
    if (data.schema !== SCHEMA_VERSION) throw new Error(`${source}: schema version ${JSON.stringify(data.schema)} is not supported (expected ${SCHEMA_VERSION}).`);
    const errors = validateVocabulary(data.vocabulary);
    if (errors.length) throw new Error(`${source}: ${errors.length} problem(s)\n` + errors.slice(0, 50).join('\n') + (errors.length > 50 ? `\n… and ${errors.length - 50} more` : ''));
    return data.vocabulary;
}

// Adds the stored inverse of every relation. Used by the migration and by the manager on save.
export function closeRelations(entries) {
    const byId = new Map(entries.map(e => [e.id, e]));
    for (const e of entries) {
        for (const [rel, targets] of Object.entries(e.relations)) {
            const inv = INVERSE[rel];
            if (!inv) continue;
            for (const t of targets) {
                const target = byId.get(t);
                if (!target) continue;
                const list = target.relations[inv] ||= [];
                if (!list.includes(e.id)) list.push(e.id);
            }
        }
    }
    return entries;
}
