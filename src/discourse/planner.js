// Text planner. Where texts.js holds stories written by hand, the planner writes them: from the seed of the language it picks
// a story schema (a quest, an event, a meeting between two people), a cast whose members fit the verbs (verbs.js says what each
// verb accepts as agent, patient and recipient), and builds the lines as frames with their English. The lines then go through the
// same compilation as the hand-written stories, so references (a / the / pronoun), voice, subordination and the rest of the
// grammar are decided in one place. Only words the dictionary has are used, and the words used become required words of the language.
import { rng } from '../core/rng.js';
import { VERBS, CAST, ADJECTIVES } from './verbs.js';

export const SCHEMAS = Object.freeze(['quest', 'event', 'meeting']);
const ENGLISH = lemma => lemma;
const match = (classes, wanted) => [...classes].some(c => wanted.includes(c));

export function planStory(spec, index, schema, number = 1) {
    const r = rng(`${spec.seed}|plan|${schema}|${number}`);
    const has = ref => !!index.resolve(ref);
    const pick = list => list.length ? list[Math.floor(r() * list.length)] : null;
    const cast = CAST.filter(c => has(`${c.lemma}:noun`));
    const withClass = (letters, except = []) => cast.filter(c => match(c.classes, letters) && !except.includes(c.lemma));
    const verbs = (kind, test = () => true) => VERBS.filter(v => v.kind === kind && has(`${v.lemma}:verb`) && test(v));
    const adjFor = (c, pool) => {
        const all = (ADJECTIVES[[...c.classes].find(k => ADJECTIVES[k])] ?? []).filter(a => has(`${a}:adjective`));
        return pick(pool && all.some(a => pool.includes(a)) ? all.filter(a => pool.includes(a)) : all);
    };
    const FRIENDLY = ['kind', 'wise', 'happy', 'old', 'young', 'rich', 'poor', 'tired', 'small', 'sick'], HOSTILE = ['strong', 'angry', 'big', 'hungry', 'fast', 'cruel'];
    const actors = {};
    const use = key => { const c = CAST.find(x => x.lemma === key); actors[key] ??= { head: `${c.lemma}:noun`, en: ENGLISH(c.lemma), pron: c.pron, mass: c.mass, classes: c.classes }; return key; };
    const V = (lemma, extra = {}) => ({ head: `${lemma}:verb`, ...extra });
    const cop = a => ({ head: `${a}:adjective` });
    const past = lemma => VERBS.find(v => v.lemma === lemma)?.past ?? lemma;
    const lines = [];
    const add = (frame, en, slots, link, extra = {}) => lines.push({ ...(link ? { link } : {}), frame, en, ...(slots ? { slots: slots.map(use) } : {}), ...extra });
    const be = (slot, adj, extra = {}) => add({ pred: V('be'), roles: { theme: '$1', attribute: cop(adj) }, tense: 'past', ...extra }, `{1} was ${adj}.`, [slot]);
    const dwell = c => ['island', 'hill', 'mountain'].includes(c.lemma) ? 'on' : 'in';
    const goal = (mv, place) => ({ adp: `${mv.goal}:adposition`, np: place });

    if (schema === 'meeting') return planMeeting();
    const hero = pick(withClass('h')), other = pick(withClass('ha', [hero?.lemma]).filter(c => c.lemma !== hero?.lemma));
    const home = pick(withClass('d')), away = pick(withClass('p', [home?.lemma]));
    if (!hero || !other || !home || !away) return null;
    if (schema === 'quest') {
        const thing = pick(withClass('ofw'));
        const acquire = pick(verbs('t', v => v.agent.includes('h') && match(thing.classes, v.patient) && ['find', 'take', 'make', 'buy', 'catch', 'bake', 'cook', 'gather', 'carry'].includes(v.lemma)));
        const motion = pick(verbs('m', v => v.agent.includes('h') && v.lemma !== 'return'));
        const give = pick(verbs('d', v => match(thing.classes, v.patient) && match(other.classes, v.agent) && v.lemma !== 'show'));
        const look = pick(verbs('t', v => ['see', 'meet', 'watch'].includes(v.lemma)));
        if (!acquire || !motion || !give || !look) return null;
        add({ pred: V('live'), roles: { agent: '$1', oblique: { adp: `${dwell(home)}:adposition`, np: '$2' } }, tense: 'past' }, `Once {1} lived ${dwell(home)} {2}.`, [hero.lemma, home.lemma], 'once:adverb');
        if (hero.does && has(`${hero.does}:verb`) && r() < 0.6) add({ pred: V(hero.does), roles: { agent: '$1' }, tense: 'past' }, `Usually {1} ${past(hero.does)}.`, [hero.lemma], 'usually:adverb');
        if (match(thing.classes, 'fw') && r() < 0.5 && has(`${thing.classes.includes('w') ? 'thirsty' : 'hungry'}:adjective`)) be(hero.lemma, thing.classes.includes('w') ? 'thirsty' : 'hungry');
        add({ pred: V('want'), roles: { agent: '$1' }, tense: 'past', comp: { control: true, frame: { pred: V(acquire.lemma), roles: { patient: '$2' } } } }, `{1} wanted to ${acquire.lemma} {2}.`, [hero.lemma, thing.lemma]);
        add({ pred: V(motion.lemma), roles: { agent: '$1', oblique: goal(motion, '$2') }, tense: 'past' }, `Then {1} ${motion.past} ${motion.goal} {2}.`, [hero.lemma, away.lemma], 'then:conjunction');
        add({ pred: V(look.lemma), roles: { agent: '$1', patient: '$2' }, tense: 'past' }, `{1} ${look.past} {2}.`, [hero.lemma, other.lemma]);
        const friendly = r() < 0.5, adj = adjFor(other, friendly ? FRIENDLY : HOSTILE);
        if (adj) be(other.lemma, adj);
        if (adj && r() < 0.5) add({ pred: V('think'), roles: { agent: '$1' }, tense: 'past', comp: { conj: 'that:conjunction', frame: { pred: V('be'), roles: { theme: '$2', attribute: cop(adj) }, tense: 'past', shifted: true } } }, `{1} thought that {2} was ${adj}.`, [hero.lemma, other.lemma], null, { enNoShift: `{1} thought that {2} is ${adj}.` });
        if (friendly) {
            add({ pred: V(give.lemma), roles: { agent: '$1', patient: '$2', recipient: '$3' }, tense: 'past' }, `{1} ${give.past} {2} to {3}.`, [other.lemma, thing.lemma, hero.lemma]);
            be(hero.lemma, 'happy');
            const back = pick(verbs('m', v => v.agent.includes('h') && ['go', 'return', 'walk', 'travel'].includes(v.lemma)));
            if (back) add({ pred: V(back.lemma), roles: { agent: '$1', oblique: goal(back, '$2') }, tense: 'past' }, `Then {1} ${back.past} ${back.goal} {2}.`, [hero.lemma, home.lemma], 'then:conjunction');
        } else {
            be(hero.lemma, 'afraid');
            add({ pred: V('run'), roles: { agent: '$1', adjunct: { head: 'away:adverb' } }, tense: 'past' }, 'Then {1} ran away.', [hero.lemma], 'then:conjunction');
            if (has('sad:adjective')) be(hero.lemma, 'sad');
        }
        return finish(`The ${hero.lemma} and the ${other.lemma}`, 'narrative');
    }
    // event: something arrives, the hero reacts
    const visitor = pick(withClass('an', [hero.lemma])), arrive = pick(verbs('m', v => v.agent.includes('n') && v.lemma === 'come'));
    const seeing = pick(verbs('t', v => ['see', 'hear', 'watch'].includes(v.lemma) && v.patient.includes('n')));
    if (!visitor || !arrive || !seeing) return null;
    const vAdj = adjFor(visitor), fear = has('afraid:adjective');
    const food = pick(withClass('f'));
    const feed = pick(verbs('t', v => v.lemma === 'feed'));
    const mover = pick(verbs('m', v => v.lemma === 'go'));
    add({ pred: V('live'), roles: { agent: '$1', oblique: { adp: `${dwell(home)}:adposition`, np: '$2' } }, tense: 'past' }, `Once {1} lived ${dwell(home)} {2}.`, [hero.lemma, home.lemma], 'once:adverb');
    add({ pred: V(arrive.lemma), roles: { agent: '$1' }, tense: 'past' }, `Then {1} ${arrive.past}.`, [visitor.lemma], 'then:conjunction');
    add({ pred: V(seeing.lemma), roles: { agent: '$1', patient: '$2' }, tense: 'past' }, `{1} ${seeing.past} {2}.`, [hero.lemma, visitor.lemma]);
    if (vAdj && fear) add({ pred: V('be'), roles: { theme: '$1', attribute: cop('afraid') }, tense: 'past', adv: { conj: 'because:conjunction', frame: { pred: V('be'), roles: { theme: '$2', attribute: cop(vAdj) }, tense: 'past' } } }, `{1} was afraid because {2} was ${vAdj}.`, [hero.lemma, visitor.lemma]);
    if (visitor.classes.includes('a') && food && feed && has('hungry:adjective') && r() < 0.6) {
        add({ pred: V('think'), roles: { agent: '$1' }, tense: 'past', comp: { conj: 'that:conjunction', frame: { pred: V('be'), roles: { theme: '$2', attribute: cop('hungry') }, tense: 'past', shifted: true } } }, '{1} thought that {2} was hungry.', [hero.lemma, visitor.lemma], null, { enNoShift: '{1} thought that {2} is hungry.' });
        add({ pred: V('give'), roles: { agent: '$1', patient: '$2', recipient: '$3' }, tense: 'past' }, `{1} gave {2} to {3}.`, [hero.lemma, food.lemma, visitor.lemma]);
    }
    if (mover) add({ pred: V('go'), roles: { agent: '$1', adjunct: { head: 'away:adverb' } }, tense: 'past' }, '{1} went away.', [visitor.lemma], 'then:conjunction');
    be(hero.lemma, 'happy');
    return finish(`The ${hero.lemma} and the ${visitor.lemma}`, 'narrative');

    // a short dialogue between two people on the road; no characters to track, the pronouns are those of the speakers
    function planMeeting() {
        const me = { head: 'pronoun.first_person_singular' }, you = { head: 'pronoun.second_person_singular' };
        const job = pick(withClass('h')), thing = pick(withClass('ofw')), town = pick(withClass('p'));
        const wanting = pick(verbs('w', v => v.lemma === 'want')), going = pick(verbs('m', v => v.lemma === 'go'));
        if (!job || !thing || !town || !wanting || !going) return null;
        const np = (c, det = 'indefinite') => c.mass ? { head: `${c.lemma}:noun` } : { head: `${c.lemma}:noun`, det };
        const article = c => c.mass ? '' : /^[aeiou]/.test(c.lemma) ? 'an ' : 'a ';
        const say = (speaker, frame, en) => lines.push({ speaker, frame, en });
        say('A', { initial: [{ head: 'hello:particle' }, { head: 'friend:noun' }], roles: {} }, 'Hello, friend.');
        say('B', { initial: [{ head: 'interrogative.who' }], pred: V('be'), roles: { theme: you }, seq: ['initial', 'V', 'S'] }, 'Who are you?');
        say('A', { pred: V('be'), roles: { theme: me, attribute: np(job) } }, `I am ${article(job)}${job.lemma}.`);
        const wh = r() < 0.5;
        if (wh) {
            say('B', { initial: [{ head: 'interrogative.what' }], pred: V('want'), roles: { agent: you }, seq: ['initial', 'S', 'V'] }, 'What do you want?');
            say('A', { pred: V('want'), roles: { agent: me, patient: np(thing) } }, `I want ${article(thing)}${thing.lemma}.`);
        } else {
            say('B', { initial: [{ head: 'interrogative.where' }], pred: V('go'), roles: { agent: you }, seq: ['initial', 'S', 'V'] }, 'Where do you go?');
            say('A', { pred: V('go'), roles: { agent: me, oblique: { adp: 'to:adposition', np: { head: `${town.lemma}:noun`, det: 'definite' } } } }, `I go to the ${town.lemma}.`);
        }
        say('B', { pred: V('have'), roles: { agent: me, patient: np(thing, 'indefinite') } }, `I have ${article(thing)}${thing.lemma}.`);
        say('A', { initial: [{ head: 'thanks:particle' }, { head: 'friend:noun' }], roles: {} }, 'Thank you, friend.');
        return finish('A meeting on the road', 'dialogue');
    }
    function finish(title, kind) {
        return { id: `plan:${schema}:${number}`, title, kind, lines, actors, planned: true };
    }
}

// the stories planned for a language: one of each schema that could be built with the words of the dictionary
export function planStories(spec, index, schemas = SCHEMAS) {
    return schemas.map((s, i) => planStory(spec, index, s, i + 1)).filter(Boolean);
}
