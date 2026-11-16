// Connected texts. A story is a list of lines over a small cast of actors; the referring expressions are decided from the
// discourse, not written into the template: an actor is introduced with an indefinite noun phrase, named again with a
// definite one, and referred to by a pronoun while it is the one just talked about (which a pro-drop language then leaves
// out altogether). Lines are the same templates as the sample sentences, so inflection, word order, case and agreement come
// from the language. The English is built from the same decisions (a hunter ... the hunter ... he).
import { buildIndex, templateRefs, realize } from '../syntax/realize.js';
import { rng } from '../core/rng.js';

const PRON = { male: 'pronoun.third_person_singular_male', female: 'pronoun.third_person_singular_female', neutral: 'pronoun.third_person_singular_neutral', plural: 'pronoun.third_person_plural' };
const EN_PRON = { male: ['he', 'him'], female: ['she', 'her'], neutral: ['it', 'it'], plural: ['they', 'them'] };
const vowel = w => /^[aeiou]/i.test(w);
const act = (head, en, pron = 'neutral', extra = {}) => ({ head, en, pron, ...extra });

const ACTORS = {
    hunter: act('hunter:noun', 'hunter', 'male'), wolf: act('wolf:noun', 'wolf'), farmer: act('farmer:noun', 'farmer', 'male'), storm: act('storm:noun', 'storm'),
    river: act('river:noun', 'river'), king: act('king:noun', 'king', 'male'), queen: act('queen:noun', 'queen', 'female'), child: act('child:noun', 'child', 'neutral'),
    woman: act('woman:noun', 'woman', 'female'), dragon: act('dragon:noun', 'dragon'), fox: act('fox:noun', 'fox'), crow: act('crow:noun', 'crow'), ship: act('ship:noun', 'ship'),
    fisher: act('fish:noun', 'fish'), bear: act('bear:noun', 'bear'), man: act('man:noun', 'man', 'male')
};

const loc = (adp, noun, det = 'definite') => ({ adp: `${adp}:adposition`, np: { head: `${noun}:noun`, det } });
const V = (v, extra = {}) => ({ head: `${v}:verb`, ...extra });
const cop = adj => ({ head: `${adj}:adjective` });

// Lines: t = template skeleton with $1, $2 … where an actor goes; en = English with the same {1} {2}; slots = actors in order.
export const STORIES = Object.freeze([
    {
        id: 'hunter-wolf', title: 'The hunter and the wolf', kind: 'narrative', actors: ['hunter', 'wolf'],
        lines: [
            { link: 'once:adverb', t: { S: '$1', V: V('go'), A: loc('into', 'forest'), tense: 'past' }, en: 'Once {1} went into the forest.', slots: ['hunter'] },
            { t: { S: '$1', V: V('see'), O: '$2', tense: 'past' }, en: '{1} saw {2}.', slots: ['hunter', 'wolf'] },
            { t: { S: '$1', V: V('be'), O: cop('hungry'), tense: 'past' }, en: '{1} was hungry.', slots: ['wolf'] },
            { t: { S: '$1', V: V('be'), O: cop('afraid'), tense: 'past', coord: { conj: 'but:conjunction', clause: { S: '$2', V: V('run', { neg: true }), tense: 'past' } } }, en: '{1} was afraid, but {2} did not run.', slots: ['hunter', 'hunter'] },
            { link: 'then:conjunction', t: { S: '$1', V: V('go'), B: { head: 'away:adverb' }, tense: 'past' }, en: 'Then {1} went away.', slots: ['wolf'] },
            { t: { S: '$1', V: V('go'), A: loc('to', 'village'), tense: 'past' }, en: '{1} went to the village.', slots: ['hunter'] }
        ]
    },
    {
        id: 'farmer-storm', title: 'The farmer and the storm', kind: 'narrative', actors: ['farmer', 'storm', 'river'],
        lines: [
            { link: 'once:adverb', t: { S: '$1', V: V('live'), A: loc('in', 'village', 'indefinite'), tense: 'past' }, en: 'Once {1} lived in a village.', slots: ['farmer'] },
            { t: { S: '$1', V: V('have'), O: { head: 'field:noun', det: 'indefinite' }, A: loc('by', 'river'), tense: 'past' }, en: '{1} had a field by the river.', slots: ['farmer'] },
            { link: 'usually:adverb', t: { S: '$1', V: V('go'), A: loc('to', 'field'), tense: 'past' }, en: 'Usually {1} went to the field.', slots: ['farmer'] },
            { link: 'then:conjunction', t: { S: '$1', V: V('come'), tense: 'past' }, en: 'Then {1} came.', slots: ['storm'] },
            { t: { S: '$1', V: V('be'), O: cop('strong'), tense: 'past', coord: { conj: 'and:conjunction', clause: { S: '$2', V: V('rise'), tense: 'past' } } }, en: '{1} was strong, and {2} rose.', slots: ['storm', 'river'] },
            { t: { S: '$1', V: V('be'), O: cop('afraid'), tense: 'past' }, en: '{1} was afraid.', slots: ['farmer'] },
            { link: 'but:conjunction', t: { S: '$1', V: V('go'), B: { head: 'away:adverb' }, tense: 'past' }, en: 'But {1} went away.', slots: ['storm'] },
            { t: { S: '$1', V: V('be'), O: cop('happy'), tense: 'past' }, en: '{1} was happy.', slots: ['farmer'] }
        ]
    },
    {
        id: 'queen-crow', title: 'The queen and the crow', kind: 'narrative', actors: ['queen', 'crow', 'fox'],
        lines: [
            { link: 'once:adverb', t: { S: '$1', V: V('live'), A: loc('in', 'house', 'indefinite'), tense: 'past' }, en: 'Once {1} lived in a house.', slots: ['queen'] },
            { t: { S: '$1', V: V('have'), O: '$2', tense: 'past' }, en: '{1} had {2}.', slots: ['queen', 'crow'] },
            { t: { S: '$1', V: V('be'), O: cop('wise'), tense: 'past' }, en: '{1} was wise.', slots: ['crow'] },
            { link: 'then:conjunction', t: { S: '$1', V: V('see'), O: '$2', tense: 'past' }, en: 'Then {1} saw {2}.', slots: ['crow', 'fox'] },
            { t: { S: '$1', V: V('be'), O: cop('hungry'), tense: 'past' }, en: '{1} was hungry.', slots: ['fox'] },
            { t: { S: '$1', V: V('bring'), O: { head: 'bread:noun', det: 'indefinite' }, tense: 'past' }, en: '{1} brought bread.', slots: ['crow'] },
            { t: { S: '$1', V: V('be'), O: cop('happy'), tense: 'past' }, en: '{1} was happy.', slots: ['fox'] }
        ]
    },
    {
        id: 'river-night', title: 'Night by the river', kind: 'description', actors: [],
        lines: [
            { raw: true, t: { S: { head: 'moon:noun', det: 'definite' }, V: V('be'), O: cop('high') }, en: 'The moon is high.' },
            { raw: true, t: { S: { head: 'river:noun', det: 'definite' }, V: V('be'), O: cop('cold'), coord: { conj: 'and:conjunction', clause: { S: { head: 'night:noun', det: 'definite' }, V: V('be'), O: cop('dark') } } }, en: 'The river is cold, and the night is dark.' },
            { raw: true, t: { S: { head: 'wolf:noun', det: 'definite' }, V: V('sleep') }, en: 'The wolf sleeps.' },
            { raw: true, link: 'but:conjunction', t: { S: { head: 'wind:noun', det: 'definite' }, V: V('come') }, en: 'But the wind comes.' },
            { raw: true, t: { S: { head: 'village:noun', det: 'definite' }, V: V('be'), O: cop('quiet') }, en: 'The village is quiet.' }
        ]
    },
    {
        id: 'bread-and-water', title: 'Bread and water', kind: 'dialogue', actors: [],
        lines: [
            { raw: true, speaker: 'A', t: { initial: [{ head: 'hello:particle' }, { head: 'friend:noun' }] }, en: 'Hello, friend.' },
            { raw: true, speaker: 'B', t: { initial: [{ head: 'hello:particle' }], q: 'yesno', S: { head: 'pronoun.second_person_singular' }, V: V('be'), O: cop('hungry') }, en: 'Hello. Are you hungry?' },
            { raw: true, speaker: 'A', t: { initial: [{ head: 'yes:particle' }], S: { head: 'pronoun.first_person_singular' }, V: V('be'), O: cop('hungry') }, en: 'Yes, I am hungry.' },
            { raw: true, speaker: 'B', t: { S: { head: 'pronoun.first_person_singular' }, V: V('have'), O: { head: 'bread:noun', and: { head: 'water:noun' } } }, en: 'I have bread and water.' },
            { raw: true, speaker: 'B', t: { mood: 'imperative', V: V('eat') }, en: 'Eat.' },
            { raw: true, speaker: 'A', t: { initial: [{ head: 'thanks:particle' }, { head: 'friend:noun' }] }, en: 'Thank you, friend.' }
        ]
    }
]);

// Resolves the actors of a story into plain templates (language-independent) and the English text.
export function compileStory(story) {
    const mentioned = new Set();
    let prev = [];
    return story.lines.map((ln, i) => {
        const id = `${story.id}:${i + 1}`;
        if (ln.raw || !ln.slots) {
            const t = { ...ln.t, ...(ln.link ? { initial: [{ head: ln.link }, ...(ln.t.initial ?? [])] } : {}) };
            return { id, speaker: ln.speaker, en: ln.en, template: { id, en: ln.en, ...t } };
        }
        const roles = {};
        const mark = (node, key) => Array.isArray(node) ? node.map(n => mark(n, key)) : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).map(([k, v]) => [k, mark(v, k)])) : typeof node === 'string' && /^\$\d+$/.test(node) ? (roles[node.slice(1)] = key === 'S' ? 'subj' : 'obj', node) : node;
        const skeleton = mark(ln.t, '');
        const nps = {}, words = {};
        const recent = [...prev];
        ln.slots.forEach((key, k) => {
            const a = ACTORS[key], role = roles[k + 1] ?? 'obj';
            const sameClass = recent.filter((x, j) => recent.indexOf(x) === j && ACTORS[x].pron === a.pron);
            const first = !mentioned.has(key);
            let form;
            if (first) form = 'indef'; else if (recent.includes(key) && sameClass.length <= 1) form = 'pron'; else form = 'def';
            if (form === 'pron') { nps[k + 1] = { head: PRON[a.pron] }; words[k + 1] = EN_PRON[a.pron][role === 'subj' ? 0 : 1]; }
            else { nps[k + 1] = { head: a.head, det: form === 'indef' ? 'indefinite' : 'definite' }; words[k + 1] = `${form === 'indef' ? (vowel(a.en) ? 'an' : 'a') : 'the'} ${a.en}`; }
            mentioned.add(key); recent.push(key);
        });
        prev = [...ln.slots];
        const fill = node => Array.isArray(node) ? node.map(fill) : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fill(v)])) : typeof node === 'string' && /^\$\d+$/.test(node) ? nps[node.slice(1)] : node;
        let en = ln.en.replace(/\{(\d+)\}/g, (_, n) => words[n]);
        en = en[0].toUpperCase() + en.slice(1);
        const t = fill(skeleton);
        return { id, en, template: { id, en, ...t, ...(ln.link ? { initial: [{ head: ln.link }] } : {}) } };
    });
}

const COMPILED = new Map(STORIES.map(s => [s.id, compileStory(s)]));
export const storyRefs = story => [...new Set(COMPILED.get(story.id).flatMap(l => [...templateRefs(l.template)]))];

// which stories a language has (all those whose words exist), in a seed-dependent order; their words become required
export function chooseStories(spec, vocabulary, count = 3) {
    const index = buildIndex(vocabulary), r = rng(`${spec.seed}|stories`);
    const ok = STORIES.filter(s => storyRefs(s).every(ref => index.resolve(ref)));
    const ordered = ok.map(s => [r(), s]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const picked = [ordered.find(s => s.kind === 'dialogue'), ...ordered.filter(s => s.kind !== 'dialogue')].filter(Boolean).slice(0, count);
    const entries = [...new Set(picked.flatMap(storyRefs))].map(ref => index.resolve(ref)).filter(Boolean);
    return { ids: picked.map(s => s.id), entries };
}

export function realizeStories(lang, ids) {
    const out = [];
    for (const id of ids) {
        const story = STORIES.find(s => s.id === id);
        const lines = COMPILED.get(id).map(l => { const res = realize(l.template, lang); return res.skipped ? null : { en: l.en, speaker: l.speaker, tokens: res.tokens }; });
        if (lines.some(l => !l)) continue;
        out.push({ id, title: story.title, kind: story.kind, lines });
    }
    return out;
}
