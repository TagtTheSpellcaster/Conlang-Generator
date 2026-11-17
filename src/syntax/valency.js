// Voice and valency: how a language changes the number of arguments of a verb.
//   passive       the patient becomes the subject, the agent is demoted to an oblique phrase or dropped
//   antipassive   (ergative languages only) the patient is demoted, the agent takes the intransitive subject case
//   causative     a causer is added as the new subject; the old agent becomes the object (intransitive verb) or a dative phrase
//   applicative   an oblique (instrument, place, beneficiary) becomes the object; the old object turns into a dative phrase
// Each operation is absent, a verb suffix (agglutinative languages only) or a separate particle before the verb.
import { rng } from '../core/rng.js';

export const VOICES = Object.freeze(['passive', 'antipassive', 'causative', 'applicative']);
const CHANCE = { passive: 0.85, antipassive: 0.7, causative: 0.9, applicative: 0.5 };
const AFFIX_SHARE = 0.8;

export function chooseValency(spec) {
    const r = rng(`${spec.seed}|valency`);
    const ergative = spec.relations === 'ergative';
    const out = {};
    for (const v of VOICES) {
        const has = r() < CHANCE[v], affix = r() < AFFIX_SHARE;     // both rolled for every voice: the others do not move when one changes
        out[v] = !has || (v === 'antipassive' && !ergative) ? null : (spec.morphology === 'agglutinative' && affix ? 'affix' : 'particle');
    }
    // a language with none of the operations would have no use for the chapter: keep at least the causative
    if (!VOICES.some(v => out[v])) out.causative = spec.morphology === 'agglutinative' ? 'affix' : 'particle';
    return Object.freeze(out);
}

const WHAT = { passive: 'passive', antipassive: 'antipassive', causative: 'causative', applicative: 'applicative' };
export function describeValency(valency) {
    const how = s => s === 'affix' ? 'verb suffix' : s === 'particle' ? 'particle before the verb' : 'not marked (no such construction)';
    return Object.fromEntries(VOICES.map(v => [WHAT[v], how(valency[v])]));
}
