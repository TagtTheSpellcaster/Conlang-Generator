// Figurative expressions: phrases whose meaning is not the sum of their words ("long hand" = thief, "to hold one's tongue" =
// to keep silent). The same pattern recurs across languages (the heart as the seat of feeling, the hand of giving, the
// tongue of speech), but each language picks its own. Each idiom is a sentence template (same format as the sample
// sentences) plus its figurative meaning; the language realises the ones it has words for, with its own word order.
// A language has about a dozen, chosen by its seed; their words are always in its lexicon.
import { rng } from '../core/rng.js';
import { buildIndex, templateRefs, realize } from '../syntax/realize.js';

const np = (head, extra = {}) => ({ head, ...extra });
const P = (head, adj) => ({ initial: [np(head, adj ? { adj } : {})] });
const OF = (head, of) => ({ initial: [np(head, { gen: { adp: 'of:adposition', case: 'genitive', np: np(of) } })] });
const clause = (S, V, O, extra = {}) => ({ S, V, ...(O ? { O } : {}), ...extra });
const he = { head: 'pronoun.third_person_singular_male' }, she = { head: 'pronoun.third_person_singular_female' };
const verb = (v, extra = {}) => ({ head: `${v}:verb`, ...extra });

export const IDIOMS = Object.freeze([
    { id: 'i-long-hand', theme: 'body', en: 'a long hand', meaning: 'a thief', ...P('hand:noun', 'long:adjective') },
    { id: 'i-heavy-heart', theme: 'body', en: 'a heavy heart', meaning: 'sorrow', ...P('heart:noun', 'heavy:adjective') },
    { id: 'i-cold-heart', theme: 'body', en: 'a cold heart', meaning: 'cruelty, a cruel person', ...P('heart:noun', 'cold:adjective') },
    { id: 'i-big-heart', theme: 'body', en: 'a big heart', meaning: 'generosity', ...P('heart:noun', 'big:adjective') },
    { id: 'i-open-hand', theme: 'body', en: 'an open hand', meaning: 'generosity', ...P('hand:noun', 'open:adjective') },
    { id: 'i-hot-head', theme: 'body', en: 'a hot head', meaning: 'a quick temper', ...P('head:noun', 'hot:adjective') },
    { id: 'i-sweet-mouth', theme: 'speech', en: 'a sweet mouth', meaning: 'flattery, a flatterer', ...P('mouth:noun', 'sweet:adjective') },
    { id: 'i-sharp-tongue', theme: 'speech', en: 'a sharp tongue', meaning: 'a biting speaker', ...P('tongue:noun', 'sharp:adjective') },
    { id: 'i-snake-tongue', theme: 'speech', en: 'the tongue of a snake', meaning: 'a liar', ...OF('tongue:noun', 'snake:noun') },
    { id: 'i-stone-heart', theme: 'body', en: 'a heart of stone', meaning: 'a person without pity', ...OF('heart:noun', 'stone:noun') },
    { id: 'i-iron-hand', theme: 'power', en: 'a hand of iron', meaning: 'harsh rule', ...OF('hand:noun', 'iron:noun') },
    { id: 'i-eye-day', theme: 'kenning', en: 'the eye of the day', meaning: 'the sun', ...OF('eye:noun', 'day:noun') },
    { id: 'i-road-whale', theme: 'kenning', en: 'the road of the ships', meaning: 'the sea', ...OF('road:noun', 'ship:noun') },
    { id: 'i-tooth-war', theme: 'kenning', en: 'the tooth of war', meaning: 'a sword', ...OF('tooth:noun', 'war:noun') },
    { id: 'i-dark-day', theme: 'fortune', en: 'a dark day', meaning: 'a time of misfortune', ...P('day:noun', 'dark:adjective') },
    { id: 'i-long-night', theme: 'fortune', en: 'a long night', meaning: 'a time of hardship', ...P('night:noun', 'long:adjective') },
    { id: 'i-long-road', theme: 'fortune', en: 'a long road', meaning: 'a hard life or a long task', ...P('road:noun', 'long:adjective') },
    { id: 'i-bitter-water', theme: 'fortune', en: 'bitter water', meaning: 'grief, a bitter experience', ...P('water:noun', 'bitter:adjective') },
    { id: 'i-golden-word', theme: 'speech', en: 'a golden word', meaning: 'good advice', ...P('word:noun', 'golden:adjective') },
    { id: 'i-hold-tongue', theme: 'speech', en: 'I hold my tongue.', meaning: 'I keep silent', ...clause({ head: 'pronoun.first_person_singular' }, verb('hold'), np('tongue:noun', { poss: 'my:determiner' })) },
    { id: 'i-swallow-tongue', theme: 'speech', en: 'She swallowed her tongue.', meaning: 'she was struck silent', ...clause(she, verb('swallow'), np('tongue:noun', { poss: 'her:determiner' }), { tense: 'past' }) },
    { id: 'i-lose-head', theme: 'body', en: 'He lost his head.', meaning: 'he panicked', ...clause(he, verb('lose'), np('head:noun', { poss: 'his:determiner' }), { tense: 'past' }) },
    { id: 'i-wolf-door', theme: 'fortune', en: 'The wolf is at the door.', meaning: 'danger or hunger is near', ...clause(np('wolf:noun', { det: 'definite' }), verb('be'), null, { A: { adp: 'at:adposition', case: 'locative', np: np('door:noun', { det: 'definite' }) } }) },
    { id: 'i-break-bread', theme: 'bond', en: 'We broke bread together.', meaning: 'we became friends', ...clause({ head: 'pronoun.first_person_plural' }, verb('break'), np('bread:noun'), { tense: 'past' }) },
    { id: 'i-share-salt', theme: 'bond', en: 'They ate salt together.', meaning: 'they are bound by hospitality', ...clause({ head: 'pronoun.third_person_plural' }, verb('eat'), np('salt:noun'), { tense: 'past' }) },
    { id: 'i-drink-blood', theme: 'bond', en: 'They drank blood.', meaning: 'they swore an oath', ...clause({ head: 'pronoun.third_person_plural' }, verb('drink'), np('blood:noun'), { tense: 'past' }) },
    { id: 'i-long-tongue', theme: 'speech', en: 'He has a long tongue.', meaning: 'he talks too much', ...clause(he, verb('have'), np('tongue:noun', { adj: 'long:adjective' })) },
    { id: 'i-fire-bones', theme: 'fortune', en: 'Fire is in his bones.', meaning: 'he is full of energy', ...clause(np('fire:noun'), verb('be'), null, { A: { adp: 'in:adposition', case: 'locative', np: np('bone:noun', { poss: 'his:determiner' }) } }) },
    { id: 'i-fox-friend', theme: 'character', en: 'a fox among friends', meaning: 'a cunning person', initial: [np('fox:noun')], A: { adp: 'among:adposition', case: 'locative', np: np('friend:noun', { number: 'plural' }) } },
    { id: 'i-blind-eye', theme: 'character', en: 'a blind eye', meaning: 'refusal to see a wrong', ...P('eye:noun', 'blind:adjective') },
    { id: 'i-cold-hand', theme: 'character', en: 'a cold hand', meaning: 'an unwelcoming reception', ...P('hand:noun', 'cold:adjective') },
    { id: 'i-wise-crow', theme: 'character', en: 'a wise crow', meaning: 'a clever person', ...P('crow:noun', 'wise:adjective') }
]);
const BY_ID = new Map(IDIOMS.map(i => [i.id, i]));

// Which idioms this language has: decided from the seed before the lexicon is chosen, among those whose words exist.
export function chooseIdioms(spec, vocabulary, count = 12) {
    const index = buildIndex(vocabulary), r = rng(`${spec.seed}|idioms`);
    const ok = IDIOMS.filter(i => [...templateRefs(i)].every(ref => index.resolve(ref)));
    const keyed = ok.map(i => [r(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const chosen = keyed.slice(0, count);
    const refs = new Set(chosen.flatMap(i => [...templateRefs(i)]));
    return { ids: chosen.map(i => i.id), entries: [...refs].map(ref => index.resolve(ref)).filter(Boolean) };
}

// Realises the chosen idioms in the language: [{ id, en, meaning, theme, tokens }]
export function realizeIdioms(lang, ids) {
    const out = [];
    for (const id of ids) {
        const t = BY_ID.get(id);
        if (!t) continue;
        const res = realize(t, lang);
        if (res.skipped) continue;
        out.push({ id, en: t.en, meaning: t.meaning, theme: t.theme, tokens: res.tokens });
    }
    return out;
}
