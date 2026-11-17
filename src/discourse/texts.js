// Connected texts. A story is a list of lines over a small cast of actors; the referring expressions are decided from the
// discourse, not written into the template: an actor is introduced with an indefinite noun phrase, named again with a
// definite one, and referred to by a pronoun while it is the one just talked about (which a pro-drop language then leaves
// out altogether). Lines are the same templates as the sample sentences, so inflection, word order, case and agreement come
// from the language. The English is built from the same decisions (a hunter ... the hunter ... he).
import { buildIndex, templateRefs, realize } from '../syntax/realize.js';
import { rng } from '../core/rng.js';
import { toTemplate, SUBJECT_ROLES } from '../syntax/frame.js';
import { DiscourseState } from './state.js';
const SUBJECT = new Set(SUBJECT_ROLES);
// which role is the subject of the clause, by voice (the pronoun takes the subject form)
const SUBJECT_OF = { passive: new Set(['patient', 'theme']), causative: new Set(['causer']) };

const PRON = { male: 'pronoun.third_person_singular_male', female: 'pronoun.third_person_singular_female', neutral: 'pronoun.third_person_singular_neutral', plural: 'pronoun.third_person_plural' };
const EN_PRON = { male: ['he', 'him'], female: ['she', 'her'], neutral: ['it', 'it'], plural: ['they', 'them'] };
const POSS = { male: 'function.his', female: 'function.her', neutral: 'function.its', plural: 'function.their' };
const EN_POSS = { male: 'his', female: 'her', neutral: 'its', plural: 'their' };
const EN_REFL = { male: 'himself', female: 'herself', neutral: 'itself', plural: 'themselves' };
const vowel = w => /^[aeiou]/i.test(w);
const act = (head, en, pron = 'neutral', extra = {}) => ({ head, en, pron, ...extra });

const ACTORS = {
    hunter: act('hunter:noun', 'hunter', 'male'), wolf: act('wolf:noun', 'wolf'), farmer: act('farmer:noun', 'farmer', 'male'), storm: act('storm:noun', 'storm'),
    river: act('river:noun', 'river'), king: act('king:noun', 'king', 'male'), queen: act('queen:noun', 'queen', 'female'), child: act('child:noun', 'child', 'neutral'),
    woman: act('woman:noun', 'woman', 'female'), dragon: act('dragon:noun', 'dragon'), fox: act('fox:noun', 'fox'), crow: act('crow:noun', 'crow'), ship: act('ship:noun', 'ship'),
    fisher: act('fish:noun', 'fish'), dog: act('dog:noun', 'dog'), bear: act('bear:noun', 'bear'), man: act('man:noun', 'man', 'male')
};

const loc = (adp, noun, det = 'definite') => ({ adp: `${adp}:adposition`, np: { head: `${noun}:noun`, det } });
const V = (v, extra = {}) => ({ head: `${v}:verb`, ...extra });
const cop = adj => ({ head: `${adj}:adjective` });
const np = (head, det = 'definite', extra = {}) => ({ head, det, ...extra });

// Lines: frame = the clause by roles, with $1, $2 … where a character goes; en = English with {1} {2}; slots = the characters
// in the order of the English. A line without slots has nothing to track (descriptions, dialogue).
export const STORIES = Object.freeze([
    {
        id: 'hunter-wolf', title: 'The hunter and the wolf', kind: 'narrative',
        lines: [
            { link: 'once:adverb', frame: { pred: V('go'), roles: { agent: '$1', oblique: loc('into', 'forest') }, tense: 'past' }, en: 'Once {1} went into the forest.', slots: ['hunter'] },
            { frame: { pred: V('see'), roles: { agent: '$1', patient: '$2' }, tense: 'past' }, en: '{1} saw {2}.', slots: ['hunter', 'wolf'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('hungry') }, tense: 'past' }, en: '{1} was hungry.', slots: ['wolf'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('afraid') }, tense: 'past', coord: { conj: 'but:conjunction', frame: { pred: V('run', { neg: true }), roles: { agent: '$2' }, tense: 'past' } } }, en: '{1} was afraid, but {2} did not run.', slots: ['hunter', 'hunter'] },
            { link: 'then:conjunction', frame: { pred: V('go'), roles: { agent: '$1', adjunct: { head: 'away:adverb' } }, tense: 'past' }, en: 'Then {1} went away.', slots: ['wolf'] },
            { frame: { pred: V('go'), roles: { agent: '$1', oblique: loc('to', 'village') }, tense: 'past' }, en: '{1} went to the village.', slots: ['hunter'] }
        ]
    },
    {
        id: 'farmer-storm', title: 'The farmer and the storm', kind: 'narrative',
        lines: [
            { link: 'once:adverb', frame: { pred: V('live'), roles: { agent: '$1', oblique: loc('in', 'village', 'indefinite') }, tense: 'past' }, en: 'Once {1} lived in a village.', slots: ['farmer'] },
            { frame: { pred: V('have'), roles: { agent: '$1', patient: np('field:noun', 'indefinite'), oblique: loc('by', 'river') }, tense: 'past' }, en: '{1} had a field by the river.', slots: ['farmer'] },
            { link: 'usually:adverb', frame: { pred: V('go'), roles: { agent: '$1', oblique: loc('to', 'field') }, tense: 'past' }, en: 'Usually {1} went to the field.', slots: ['farmer'] },
            { link: 'then:conjunction', frame: { pred: V('come'), roles: { agent: '$1' }, tense: 'past' }, en: 'Then {1} came.', slots: ['storm'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('strong') }, tense: 'past', coord: { conj: 'and:conjunction', frame: { pred: V('rise'), roles: { agent: '$2' }, tense: 'past' } } }, en: '{1} was strong, and {2} rose.', slots: ['storm', 'river'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('afraid') }, tense: 'past' }, en: '{1} was afraid.', slots: ['farmer'] },
            { link: 'but:conjunction', frame: { pred: V('go'), roles: { agent: '$1', adjunct: { head: 'away:adverb' } }, tense: 'past' }, en: 'But {1} went away.', slots: ['storm'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('happy') }, tense: 'past' }, en: '{1} was happy.', slots: ['farmer'] }
        ]
    },
    {
        id: 'queen-crow', title: 'The queen and the crow', kind: 'narrative',
        lines: [
            { link: 'once:adverb', frame: { pred: V('live'), roles: { agent: '$1', oblique: loc('in', 'house', 'indefinite') }, tense: 'past' }, en: 'Once {1} lived in a house.', slots: ['queen'] },
            { frame: { pred: V('have'), roles: { agent: '$1', patient: '$2' }, tense: 'past' }, en: '{1} had {2}.', slots: ['queen', 'crow'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('wise') }, tense: 'past' }, en: '{1} was wise.', slots: ['crow'] },
            { link: 'then:conjunction', frame: { pred: V('see'), roles: { agent: '$1', patient: '$2' }, tense: 'past' }, en: 'Then {1} saw {2}.', slots: ['crow', 'fox'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('hungry') }, tense: 'past' }, en: '{1} was hungry.', slots: ['fox'] },
            { frame: { pred: V('bring'), roles: { agent: '$1', patient: np('bread:noun', 'indefinite') }, tense: 'past' }, en: '{1} brought bread.', slots: ['crow'] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('happy') }, tense: 'past' }, en: '{1} was happy.', slots: ['fox'] }
        ]
    },
    {
        id: 'man-and-dog', title: 'The man and his dog', kind: 'narrative',
        lines: [
            { link: 'once:adverb', frame: { pred: V('live'), roles: { agent: '$1', oblique: loc('in', 'village', 'indefinite') }, tense: 'past' }, en: 'Once {1} lived in a village.', slots: ['man'] },
            { frame: { pred: V('have'), roles: { agent: '$1', patient: '$2' }, tense: 'past' }, en: '{1} had {2}.', slots: ['man', 'dog'] },
            { frame: { pred: V('be'), roles: { theme: { head: 'dog:noun', poss: '$1' }, attribute: cop('hungry') }, tense: 'past' }, en: '{p1} dog was hungry.', slots: ['man'] },
            { link: 'then:conjunction', frame: { pred: V('feed'), roles: { agent: '$1', patient: '$2' }, tense: 'past' }, en: 'Then {1} fed {2}.', slots: ['man', 'dog'] },
            { link: 'then:conjunction', frame: { pred: V('wash'), roles: { agent: '$1', patient: { refl: '$1' }, oblique: loc('in', 'river', 'indefinite') }, tense: 'past' }, en: 'Then {1} washed {r1} in a river.', slots: ['man'] },
            { frame: { pred: V('see'), roles: { agent: '$1', patient: '$2' }, tense: 'past', info: { topic: 'O' } }, en: 'As for {2}, {1} saw it.', slots: ['man', 'dog'], dem: [2] },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('happy') }, tense: 'past' }, en: '{1} was happy.', slots: ['dog'] }
        ]
    },
    {
        id: 'woman-and-bread', title: 'The woman and the bread', kind: 'narrative',
        lines: [
            { link: 'once:adverb', frame: { pred: V('live'), roles: { agent: '$1', oblique: loc('in', 'village', 'indefinite') }, tense: 'past' }, en: 'Once {1} lived in a village.', slots: ['woman'] },
            { frame: { pred: V('cook'), roles: { agent: '$1', patient: np('bread:noun') }, tense: 'past' }, en: '{1} cooked the bread.', slots: ['woman'] },
            { frame: { voice: 'applicative', pred: V('cut'), roles: { agent: '$1', patient: np('bread:noun'), oblique: np('knife:noun', 'indefinite') }, tense: 'past' }, en: '{1} cut the bread with a knife.', slots: ['woman'],
                alt: { frame: { pred: V('cut'), roles: { agent: '$1', patient: np('bread:noun'), oblique: loc('with', 'knife', 'indefinite') }, tense: 'past' }, en: '{1} cut the bread with a knife.' } },
            { frame: { voice: 'passive', pred: V('eat'), roles: { patient: np('bread:noun'), agent: '$1' }, tense: 'past' }, en: 'The bread was eaten by {1}.', slots: ['child'],
                alt: { frame: { pred: V('eat'), roles: { agent: '$1', patient: np('bread:noun') }, tense: 'past' }, en: '{1} ate the bread.' } },
            { frame: { voice: 'causative', pred: V('laugh'), roles: { causer: '$1', agent: '$2' }, tense: 'past' }, en: '{1} made {2} laugh.', slots: ['child', 'woman'],
                alt: { frame: { pred: V('laugh'), roles: { agent: '$2' }, tense: 'past' }, en: '{2} laughed.' } },
            { frame: { pred: V('be'), roles: { theme: '$1', attribute: cop('happy') }, tense: 'past' }, en: '{1} was happy.', slots: ['woman'] }
        ]
    },
    {
        id: 'seen-by-whom', title: 'Who saw whom', kind: 'dialogue',
        lines: [
            { speaker: 'A', frame: { q: 'yesno', pred: V('see'), roles: { agent: np('wolf:noun'), patient: np('hunter:noun') }, tense: 'past' }, en: 'Did the wolf see the hunter?' },
            { speaker: 'B', frame: { initial: [{ head: 'no:particle' }], pred: V('see'), roles: { agent: np('hunter:noun'), patient: np('wolf:noun') }, tense: 'past', info: { focus: 'S' } }, en: 'No, it was the hunter who saw the wolf.' },
            { speaker: 'A', frame: { initial: [{ head: 'thanks:particle' }, { head: 'friend:noun' }], roles: {} }, en: 'Thank you, friend.' }
        ]
    },
    {
        id: 'river-night', title: 'Night by the river', kind: 'description',
        lines: [
            { frame: { pred: V('be'), roles: { theme: np('moon:noun'), attribute: cop('high') } }, en: 'The moon is high.' },
            { frame: { pred: V('be'), roles: { theme: np('river:noun'), attribute: cop('cold') }, coord: { conj: 'and:conjunction', frame: { pred: V('be'), roles: { theme: np('night:noun'), attribute: cop('dark') } } } }, en: 'The river is cold, and the night is dark.' },
            { frame: { pred: V('sleep'), roles: { agent: np('wolf:noun') } }, en: 'The wolf sleeps.' },
            { link: 'but:conjunction', frame: { pred: V('come'), roles: { agent: np('wind:noun') } }, en: 'But the wind comes.' },
            { frame: { pred: V('be'), roles: { theme: np('village:noun'), attribute: cop('quiet') } }, en: 'The village is quiet.' }
        ]
    },
    {
        id: 'bread-and-water', title: 'Bread and water', kind: 'dialogue',
        lines: [
            { speaker: 'A', frame: { initial: [{ head: 'hello:particle' }, { head: 'friend:noun' }], roles: {} }, en: 'Hello, friend.' },
            { speaker: 'B', frame: { initial: [{ head: 'hello:particle' }], q: 'yesno', pred: V('be'), roles: { theme: { head: 'pronoun.second_person_singular' }, attribute: cop('hungry') } }, en: 'Hello. Are you hungry?' },
            { speaker: 'A', frame: { initial: [{ head: 'yes:particle' }], pred: V('be'), roles: { theme: { head: 'pronoun.first_person_singular' }, attribute: cop('hungry') } }, en: 'Yes, I am hungry.' },
            { speaker: 'B', frame: { pred: V('have'), roles: { agent: { head: 'pronoun.first_person_singular' }, patient: { head: 'bread:noun', and: { head: 'water:noun' } } } }, en: 'I have bread and water.' },
            { speaker: 'B', frame: { mood: 'imperative', pred: V('eat'), roles: {} }, en: 'Eat.' },
            { speaker: 'A', frame: { initial: [{ head: 'thanks:particle' }, { head: 'friend:noun' }], roles: {} }, en: 'Thank you, friend.' }
        ]
    }
]);

// Resolves the characters of a story: the frames become plain templates (language-independent) and the English text is built
// from the same decisions of the discourse state.
export function compileStory(story) {
    const state = new DiscourseState(ACTORS);
    return story.lines.map((ln, i) => {
        const id = `${story.id}:${i + 1}`;
        let frame = ln.frame, en = ln.en, alt = null;
        if (ln.slots) {
            // marks which slots are subjects (they take the subject form of a pronoun); the subject role depends on the voice
            const markWith = (node, kinds) => {
                const mark = n => Array.isArray(n) ? n.map(mark) : n && typeof n === 'object'
                    ? Object.fromEntries(Object.entries(n).map(([k, v]) => [k, k === 'roles' ? Object.fromEntries(Object.entries(v).map(([role, x]) => { if (typeof x === 'string' && /^\$\d+$/.test(x)) kinds[x.slice(1)] = (SUBJECT_OF[n.voice ?? 'active'] ?? SUBJECT).has(role); return [role, x]; })) : mark(v)]))
                    : n;
                return mark(node);
            };
            const kinds = {}, skeleton = markWith(frame, kinds), nps = {}, words = {}, forms = {};
            ln.slots.forEach((key, k) => {
                const a = ACTORS[key], isSubject = kinds[k + 1] ?? false, form = state.refer(key, isSubject);
                forms[k + 1] = form;
                if (form === 'pron') { nps[k + 1] = { head: PRON[a.pron] }; words[k + 1] = EN_PRON[a.pron][isSubject ? 0 : 1]; }
                else if (form === 'def' && ln.dem?.includes(k + 1)) { nps[k + 1] = { head: a.head, dem: 'distal' }; words[k + 1] = `that ${a.en}`; }
                else { nps[k + 1] = { head: a.head, det: form === 'indef' ? 'indefinite' : 'definite' }; words[k + 1] = `${form === 'indef' ? (vowel(a.en) ? 'an' : 'a') : 'the'} ${a.en}`; }
            });
            state.endClause();
            const slotRef = v => typeof v === 'string' && /^\$\d+$/.test(v) ? v.slice(1) : null;
            const fillObject = node => {
                const out = {};
                for (const [k, v] of Object.entries(node)) {
                    const n = slotRef(v);
                    if (k === 'refl' && n) out.refl = ACTORS[ln.slots[n - 1]].pron;
                    else if (k === 'poss' && n) { if (forms[n] === 'pron') out.poss = POSS[ACTORS[ln.slots[n - 1]].pron]; else out.gen = nps[n]; }
                    else out[k] = fill(v);
                }
                return out;
            };
            const fill = node => Array.isArray(node) ? node.map(fill) : node && typeof node === 'object' ? fillObject(node) : typeof node === 'string' && /^\$\d+$/.test(node) ? nps[node.slice(1)] : node;
            // the English of a line; a pronoun takes the subject or the object form according to the roles of that version of the line
            const say = (text, subjects) => text.replace(/\{(\d+)\}/g, (_, n) => forms[n] === 'pron' ? EN_PRON[ACTORS[ln.slots[n - 1]].pron][subjects[n] ? 0 : 1] : words[n])
                .replace(/\{p(\d+)\}/g, (_, n) => forms[n] === 'pron' ? EN_POSS[ACTORS[ln.slots[n - 1]].pron] : `${words[n]}'s`)
                .replace(/\{r(\d+)\}/g, (_, n) => EN_REFL[ACTORS[ln.slots[n - 1]].pron]);
            frame = fill(skeleton);
            en = say(ln.en, kinds);
            en = en[0].toUpperCase() + en.slice(1);
            if (ln.alt) {   // the same line in the active voice, for languages without the construction of the main line
                const subjectsAlt = {};
                alt = { frame: fill(markWith(ln.alt.frame, subjectsAlt)), en: say(ln.alt.en, subjectsAlt) };
            }
        }
        const build = (fr, text) => { const t = toTemplate(fr); return { id, en: text, ...t, ...(ln.link ? { initial: [{ head: ln.link }, ...(t.initial ?? [])] } : {}) }; };
        const template = build(frame, en);
        if (alt) { alt.en = alt.en[0].toUpperCase() + alt.en.slice(1); alt.template = build(alt.frame, alt.en); }
        return { id, speaker: ln.speaker, en, frame, template, alt };
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
        const lines = COMPILED.get(id).map(l => {
            let res = realize(l.template, lang), en = l.en;
            if (res.skipped === 'unavailable' && l.alt) { res = realize(l.alt.template, lang); en = l.alt.en; }
            return res.skipped ? null : { en, speaker: l.speaker, tokens: res.tokens };
        });
        if (lines.some(l => !l)) continue;
        out.push({ id, title: story.title, kind: story.kind, lines });
    }
    return out;
}
