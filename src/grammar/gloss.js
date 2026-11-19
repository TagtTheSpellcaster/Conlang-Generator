// Interlinear glossing for the grammar guide, after the Leipzig Glossing Rules (https://www.eva.mpg.de/lingua/resources/glossing-rules.php).
// glossWord(entry, features, morph) inflects a word with the real engine (inflect.js) and glosses every part the engine reports,
// so the guide can never show a form the language does not produce. The test fails if inflect() yields a part kind without a gloss.
import { inflect } from '../morphology/inflect.js';

// code -> [label, in the Leipzig list?]. Codes outside the list are the usual extensions and are marked as such on the page.
export const ABBREVIATIONS = Object.freeze({
    NOM: ['nominative', true], ACC: ['accusative', true], GEN: ['genitive', true], DAT: ['dative', true], LOC: ['locative', true],
    ABL: ['ablative', true], INS: ['instrumental', true], ERG: ['ergative', true], ABS: ['absolutive', true],
    SG: ['singular', true], PL: ['plural', true], DU: ['dual', true],
    M: ['masculine', true], F: ['feminine', true], N: ['neuter', true], C: ['common gender', true], AN: ['animate', true], INAN: ['inanimate', true],
    '1': ['first person', true], '2': ['second person', true], '3': ['third person', true], POSS: ['possessive', true],
    PRS: ['present', true], PST: ['past', true], FUT: ['future', true], PROG: ['progressive', true], PRF: ['perfect', true],
    PASS: ['passive', true], ANTIP: ['antipassive', true], CAUS: ['causative', true], APPL: ['applicative', true],
    IMP: ['imperative', true], OPT: ['optative', true], POT: ['potential', true], NEG: ['negation, negative', true], CVB: ['converb', true], CMPR: ['comparative', true],
    COND: ['conditional', true], PROH: ['prohibitive', false], DIR: ['direct evidential', false], REP: ['reported evidential', false], INFR: ['inferential evidential', false],
    RSN: ['reason clause marker', false], TEMP: ['temporal clause marker', false], CONC: ['concessive clause marker', false], SIM: ['simultaneous clause marker', false],
    OBJ: ['object form of a pronoun', false], ADD: ['additive (“also”)', false], DEF: ['definite', true], INDF: ['indefinite', true], PTV: ['partitive', true], REFL: ['reflexive', true],
    Q: ['question particle', true], TOP: ['topic', true], FOC: ['focus', true], COMP: ['complementizer', true], SBR: ['subordinator', true], PROX: ['proximal', true], DIST: ['distal', true], HON: ['honorific', true], QUOT: ['quotative', true]
});

const GENDER = { masculine: 'M', feminine: 'F', neuter: 'N', common: 'C', animate: 'AN', inanimate: 'INAN' };
const CASE = { nominative: 'NOM', accusative: 'ACC', genitive: 'GEN', dative: 'DAT', locative: 'LOC', ablative: 'ABL', instrumental: 'INS', ergative: 'ERG', absolutive: 'ABS' };
const NUMBER = { singular: 'SG', plural: 'PL', dual: 'DU' };
const TENSE = { present: 'PRS', past: 'PST', future: 'FUT' };
const ASPECT = { progressive: 'PROG', perfect: 'PRF' };
const VOICE = { passive: 'PASS', antipassive: 'ANTIP', causative: 'CAUS', applicative: 'APPL' };
const MOOD = { imperative: 'IMP', optative: 'OPT' };
const EVID = { direct: 'DIR', reported: 'REP', inferred: 'INFR' };
const SUB = { reason: 'RSN', condition: 'COND', time: 'TEMP', concession: 'CONC', simultaneous: 'SIM' };

const cell = c => { const [p, n] = String(c).split('.'); return `${p}${NUMBER[n] ?? String(n).toUpperCase()}`; };   // "1.singular" -> 1SG
const need = (map, key, what) => { if (!(key in map)) throw new Error(`no gloss for ${what} "${key}"`); return map[key]; };
const lemmaGloss = e => e.lemma.replace(/[\s']+/g, '.');

// meaning (as inflect() reports it) -> gloss codes joined with dots
export function glossOf(part, entry) {
    const m = part.meaning;
    switch (part.kind) {
        case 'stem': case 'stem-alt': return lemmaGloss(entry);
        case 'suppletive': return `${lemmaGloss(entry)}.${m === 'more' ? 'CMPR' : need(TENSE, m, 'tense')}`;
        case 'number': return need(NUMBER, m, 'number');
        case 'gender': return need(GENDER, m, 'gender');
        case 'case': return need(CASE, m, 'case');
        case 'degree': return 'CMPR';
        case 'possessor': return `${cell(m.replace(/^poss\./, ''))}.POSS`;
        case 'fused': {
            const bits = m.split('.');
            if (entry.pos === 'verb') return `${need(TENSE, bits[0], 'tense')}.${cell(bits.slice(1).join('.'))}`;
            return bits.map(b => GENDER[b] ?? NUMBER[b] ?? CASE[b] ?? need({}, b, 'fused value')).join('.');
        }
        case 'voice': return need(VOICE, m, 'voice');
        case 'potential': return 'POT';
        case 'negation': return 'NEG';
        case 'prohibitive': return 'PROH';
        case 'mood': return need(MOOD, m, 'mood');
        case 'aspect': return need(ASPECT, m, 'aspect');
        case 'converb': return 'CVB';
        case 'tense': return need(TENSE, m, 'tense');
        case 'agreement': return cell(m);
        case 'evidential': return need(EVID, m, 'evidential');
        case 'subordinator': return m === 'converb' ? 'CVB' : need(SUB, m, 'subordinator');
        case 'additive': return 'ADD';
        default: throw new Error(`no gloss for part kind "${part.kind}"`);
    }
}

// the codes used in a gloss string (so the page can list exactly the abbreviations it uses)
export function codesIn(gloss) {
    return (String(gloss).match(/[A-Z]+|\d/g) ?? []).filter(c => ABBREVIATIONS[c]);
}

// -> { form, seg: "house-PL-LOC" segmented, gloss, parts, irregular, codes }
export function glossWord(entry, features, morph) {
    const r = inflect(entry, features, morph);
    const glosses = r.parts.map(p => glossOf(p, entry));
    return {
        form: r.form,
        seg: r.parts.map(p => p.text).join('-'),
        gloss: glosses.join('-'),
        parts: r.parts,
        irregular: r.parts.some(p => p.kind === 'stem-alt' || p.kind === 'suppletive'),
        fused: r.parts.some(p => p.kind === 'fused'),
        codes: [...new Set(glosses.flatMap(codesIn))]
    };
}
