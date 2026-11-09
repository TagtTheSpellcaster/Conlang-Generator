import { readFileSync } from 'node:fs';
const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
export const vocabularyFile = load('../data/vocabulary.json');
export const vocabulary = vocabularyFile.vocabulary;
export const templates = load('../data/sentence-templates.json').templates;
export const refsOf = t => {
    const refs = [];
    const walk = (x, key) => {
        if (key === 'head' || key === 'adp' || key === 'poss' || key === 'aux' || key === 'adj') refs.push(...[x].flat());
        else if (x && typeof x === 'object' && !Array.isArray(x)) Object.entries(x).forEach(([k, v]) => walk(v, k));
        else if (Array.isArray(x)) x.forEach(v => walk(v, key));
    };
    for (const k of ['S', 'V', 'O', 'initial']) if (t[k]) walk(t[k], k);
    return refs.filter(r => typeof r === 'string');
};
