// Chooses which expanded letters a language uses. A few symbols out of each chosen group, never the whole set: a believable
// alphabet has two or three marked letters, not every variant. Pure and deterministic in (groups, inventory, seed).
import { EXPANSIONS, EXPANSION_KEYS } from './models.js';
import { rng } from '../core/rng.js';

export const MAX_EXTRA_VOWELS = 4;
export const MAX_EXTRA_CONSONANTS = 4;

const asList = x => [].concat(x ?? []);

// groups: keys of EXPANSIONS. vowels / consonants: the base inventory (to decide which marked letters have a base letter).
export function chooseExpanded(groups, { vowels, consonants, seed }) {
    const r = rng(`${seed}|expanded-letters`);
    const baseVowels = vowels, baseConsonants = consonants;
    const out = { groups: [], vowels: [], consonants: [], notes: [] };
    const have = (list, base) => asList(base).length === 0 || asList(base).some(b => list.includes(b));
    const sample = (candidates, count) => {
        const pool = [...candidates], chosen = [];
        while (chosen.length < count && pool.length) chosen.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
        return chosen.sort((a, b) => candidates.indexOf(a) - candidates.indexOf(b));
    };
    for (const key of groups) {
        const g = EXPANSIONS[key];
        if (!g) continue;
        const room = (list, cap) => cap - list.length;
        const take = (kind, list, cap, base) => {
            const candidates = g[kind].symbols.filter(s => !out.vowels.includes(s) && !out.consonants.includes(s) && !baseVowels.includes(s) && !baseConsonants.includes(s) && have(base, g[kind].bases[s]));
            const want = candidates.length >= 3 ? 2 + (r() < 0.5 ? 1 : 0) : candidates.length;
            const picked = sample(candidates, Math.min(want, Math.max(0, room(list, cap))));
            list.push(...picked);
            return picked.length;
        };
        const nv = take('vowels', out.vowels, MAX_EXTRA_VOWELS, vowels), nc = take('consonants', out.consonants, MAX_EXTRA_CONSONANTS, consonants);
        if (nv + nc > 0) out.groups.push(key);
        else out.notes.push(`Expanded letters "${key}": none of its letters fits the chosen vowels and consonants (or the limit of extra letters is reached); ignored.`);
    }
    return out;
}

export const isExpansionKey = k => EXPANSION_KEYS.includes(k);
