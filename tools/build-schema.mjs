// Generates schema/vocabulary.schema.json from src/lexicon/schema.js (single source of truth).
import { writeFileSync } from 'node:fs';
import { SCHEMA_VERSION, POS, DOMAINS, TIERS, ERAS, RELATIONS, ENTRY_FIELDS, REQUIRED_FIELDS, FEATURES } from '../src/lexicon/schema.js';

const strArr = { type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true };
const featureProps = Object.fromEntries(Object.entries(FEATURES).map(([k, v]) =>
    [k, v.type === 'boolean' ? { type: 'boolean' } : { enum: [...v.values] }]));
const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'vocabulary.schema.json',
    title: 'Conlang vocabulary',
    description: 'Generated from src/lexicon/schema.js. Cross-entry rules (unique ids, relation targets, inverse closure) are enforced by tools/validate.mjs.',
    type: 'object',
    required: ['schema', 'vocabulary'],
    additionalProperties: false,
    properties: {
        schema: { const: SCHEMA_VERSION },
        vocabulary: { type: 'array', items: { $ref: '#/$defs/entry' } }
    },
    $defs: {
        entry: {
            type: 'object',
            required: [...REQUIRED_FIELDS],
            additionalProperties: false,
            properties: {
                id: { type: 'string', pattern: '^[a-z0-9_]+(\\.[a-z0-9_]+)+$' },
                lemma: { type: 'string', minLength: 1, pattern: '^(?!to\\s)[^_()]+$' },
                gloss: { type: 'string', minLength: 1 },
                pos: { enum: [...POS] },
                domain: { enum: [...DOMAINS] },
                group: { type: 'string', minLength: 1 },
                tier: { enum: [...TIERS] },
                region: strArr, culture: strArr, biome: strArr,
                era: { type: 'array', items: { enum: [...ERAS] }, uniqueItems: true },
                tags: strArr,
                features: { type: 'object', additionalProperties: false, properties: featureProps },
                relations: {
                    type: 'object', additionalProperties: false,
                    properties: Object.fromEntries(RELATIONS.map(r => [r, { type: 'array', minItems: 1, items: { type: 'string' }, uniqueItems: true }]))
                }
            }
        }
    }
};
if (ENTRY_FIELDS.length !== Object.keys(schema.$defs.entry.properties).length) throw new Error('schema.js ENTRY_FIELDS and the generated properties are out of sync');
writeFileSync(new URL('../schema/vocabulary.schema.json', import.meta.url), JSON.stringify(schema, null, 2) + '\n');
console.log('schema/vocabulary.schema.json written');
