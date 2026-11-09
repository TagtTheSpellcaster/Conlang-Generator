// Validates a vocabulary file. Usage: node tools/validate.mjs [path]   (default: data/vocabulary.json)
// Exit code 0 = valid, 1 = problems found, 2 = file unreadable.
import { readFileSync } from 'node:fs';
import { SCHEMA_VERSION, validateVocabulary } from '../src/lexicon/schema.js';

const path = process.argv[2] ?? new URL('../data/vocabulary.json', import.meta.url);
let data;
try { data = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { console.error(`Cannot read ${path}: ${e.message}`); process.exit(2); }
const problems = [];
if (data?.schema !== SCHEMA_VERSION) problems.push(`"schema" must be ${SCHEMA_VERSION}.`);
problems.push(...validateVocabulary(data?.vocabulary));
if (problems.length) {
    console.error(problems.slice(0, 100).join('\n'));
    console.error(`\n${problems.length} problem(s) in ${path}`);
    process.exit(1);
}
console.log(`OK — ${data.vocabulary.length} entries, schema ${SCHEMA_VERSION}`);
