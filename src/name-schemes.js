// Naming customs for personal names, modelled on real-world systems. Each scheme composes names from the language's own
// sounds and words; grammatical markers ("son of", "clan", day names...) are words of the language (taken from its lexicon when
// it has the word, otherwise made up once per language). Pure: the context comes from generateNames in names.js.
import { attach } from './morphology/inflect.js';
import { rng, pick } from './core/rng.js';

export const PERSON_SCHEMES = Object.freeze([
    { id: 'genre', label: 'Follow the genre (default)' },
    { id: 'single', label: 'Single name' },
    { id: 'clan', label: 'Given name + clan name' },
    { id: 'epithet', label: 'Given name + epithet' },
    { id: 'title', label: 'Title + given name' },
    { id: 'tria', label: 'Roman tria nomina (praenomen, nomen, cognomen)' },
    { id: 'greek', label: 'Ancient Greek (name, father\'s genitive, deme)' },
    { id: 'slavic', label: 'Slavic (name, patronymic, surname)' },
    { id: 'icelandic', label: 'Icelandic (name + parent\'s name + -son/-daughter)' },
    { id: 'gaelic', label: 'Gaelic (Mac- / O- prefixes)' },
    { id: 'fitz', label: 'Norman-Celtic (Fitz- prefix)' },
    { id: 'welsh', label: 'Welsh (chain of "ap")' },
    { id: 'scandinavian', label: 'Scandinavian (fixed patronymic or natural surname)' },
    { id: 'arabic', label: 'Arabic nasab (ibn / bint + nisba)' },
    { id: 'spanish', label: 'Spanish (two surnames)' },
    { id: 'eastasian', label: 'East Asian (family name first)' },
    { id: 'indian-north', label: 'North Indian (name + jati / gotra)' },
    { id: 'indian-south', label: 'South Indian (village and father initials)' },
    { id: 'sikh', label: 'Sikh (Singh / Kaur)' },
    { id: 'balinese', label: 'Balinese (birth order)' },
    { id: 'akan', label: 'Akan (day-of-birth names)' },
    { id: 'yoruba', label: 'Yoruba / Igbo (circumstance names)' },
    { id: 'teknonym', label: 'Teknonymy ("father of ...", "mother of ...")' },
    { id: 'amazonian', label: 'Amazonian (public and secret name)' },
    { id: 'native-american', label: 'Native American (nature / deed name + clan)' },
    { id: 'ethiopian', label: 'Ethiopian (name + father + grandfather)' },
    { id: 'mongolian', label: 'Mongolian (clan + name, apotropaic names)' },
    { id: 'burmese', label: 'Burmese (day-of-birth letters)' },
    { id: 'minangkabau', label: 'Minangkabau (matrilineal clan)' },
    { id: 'necronym', label: 'Necronymy (taboo after a death)' },
    { id: 'inuit', label: 'Inuit atiq (name of a dead relative)' }
]);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CIRCUMSTANCE = 'god gift joy rain night day dawn moon star child king life hope peace love wealth'.split(' ');
const DEEDS = 'run walk fly see sing hunt stand swim sleep jump hear speak fight dance climb'.split(' ');
const CLAN_ANIMALS = 'wolf bear turtle eagle deer hawk fox raven owl crow snake horse'.split(' ');
const APOTROPAIC_ADJ = 'bad ugly poor'.split(' '), APOTROPAIC_NOUN = 'dog pig rat worm'.split(' ');
const RELATIVES = ['grandfather', 'grandmother', 'uncle', 'aunt', 'father', 'mother', 'brother', 'sister'];

// ctx: { spec, lexicon, r, given, family, fixedSounds (independent of the salt), cap, usable, compound, phrase, clanName, wordPart, P }
export function buildSchemes(ctx) {
    const { spec, lexicon, r, given, family, fixedSounds, cap, usable, compound, phrase, clanName, wordPart, P } = ctx;
    const word = (lemma, pos = 'noun') => lexicon.find(e => e.lemma === lemma && e.pos === pos && usable(e));
    const some = (lemmas, pos = 'noun') => lemmas.map(l => word(l, pos)).filter(Boolean);
    const fixed = {};   // words that must be the same for every name of a language
    const stable = (key, mean = 1.1) => (fixed[key] ??= fixedSounds(mean, `marker-${key}`)());
    const marker = (key, lemma) => { const e = lemma && word(lemma); return e ? e.form : stable(key); };
    const pool = (key, n) => (fixed[`pool-${key}`] ??= (() => { const make = fixedSounds(1.6, `pool-${key}`); return Array.from({ length: n }, make); })());
    const male = () => r() < 0.5;
    const suffix = (stem, mark) => stem + attach(stem, mark, spec);
    const P1 = (text, role, meaning) => ({ text, role, ...(meaning ? { meaning } : {}) });
    const nounGloss = e => e.lemma;
    const nounPick = () => pick(P.epithetNouns, r);

    const s = {
        single: () => ({ parts: [P1(given(), 'given')], gloss: null }),
        clan: () => { const c = clanName(); return { parts: [P1(given(), 'given'), ...c.parts], gloss: c.gloss }; },
        epithet: () => { const e = phrase(); return { parts: [P1(given(), 'given'), ...e.parts], gloss: e.gloss }; },
        title: () => {
            if (!P.titles.length) return s.single();
            const t = pick(P.titles, r);
            return { parts: [wordPart(t, 'title'), P1(given(), 'given')], gloss: t.lemma };
        },
        tria: () => {
            const praenomen = pick(pool('praenomen', 8), r);
            const nomen = suffix(family(), marker('gens'));
            const cognomen = r() < 0.5 ? nounPick() : pick(P.epithetAdjs, r);
            return { parts: [P1(praenomen, 'given'), P1(nomen, 'family'), wordPart(cognomen, 'cognomen')], gloss: `cognomen: ${nounGloss(cognomen)}` };
        },
        greek: () => {
            const father = given(), place = pick(P.placeHeads, r), mod = pick(P.placeMods.filter(e => e.id !== place.id), r);
            const deme = compound(mod, place, 'deme');
            return { parts: [P1(given(), 'given'), P1(suffix(father, marker('genitive')), 'patronymic'), P1(suffix(deme.part.text, marker('demotic')), 'deme')],
                gloss: `genitive of the father's name; deme ${deme.gloss}` };
        },
        slavic: () => {
            const m = male(), father = given();
            const patronymic = suffix(father, marker(m ? 'patronymic-m' : 'patronymic-f'));
            const surname = m ? family() : suffix(family(), marker('surname-f'));
            return { parts: [P1(given(), 'given'), P1(patronymic, 'patronymic'), P1(surname, 'family')], gloss: `${m ? 'male' : 'female'}: patronymic from ${cap(father)}` };
        },
        icelandic: () => {
            const m = male(), viaFather = r() < 0.85, parent = given();
            const mark = m ? marker('son', 'son') : marker('daughter', 'daughter');
            return { parts: [P1(given(), 'given'), P1(suffix(parent, mark), 'patronymic')], gloss: `${m ? 'son' : 'daughter'} of ${viaFather ? 'the father' : 'the mother'} ${cap(parent)}` };
        },
        gaelic: () => {
            const ancestor = given(), son = r() < 0.6;
            return { parts: [P1(given(), 'given'), P1(cap(marker(son ? 'mac' : 'o')) + cap(ancestor), 'family')], gloss: son ? `son of ${cap(ancestor)}` : `descendant of ${cap(ancestor)}` };
        },
        fitz: () => {
            const parent = given();
            return { parts: [P1(given(), 'given'), P1(cap(marker('fitz', 'son')) + cap(parent), 'family')], gloss: `son of ${cap(parent)} (noble descent)` };
        },
        welsh: () => {
            const chain = Array.from({ length: 1 + Math.floor(r() * 3) }, given);
            const ap = cap(marker('ap', 'son'));
            return { parts: [P1(given(), 'given'), ...chain.flatMap(n => [P1(ap, 'marker'), P1(n, 'patronymic')])], gloss: `son of ${chain.map(cap).join(', son of ')}` };
        },
        scandinavian: () => {
            if (r() < 0.5) { const father = given(); return { parts: [P1(given(), 'given'), P1(suffix(father, marker('patronymic-fixed')), 'family')], gloss: `fixed patronymic from ${cap(father)}` }; }
            const a = nounPick(), b = pick(P.epithetNouns.filter(e => e.id !== a.id), r), c = compound(a, b, 'family');
            return { parts: [P1(given(), 'given'), c.part], gloss: `nature surname ${c.gloss}` };
        },
        arabic: () => {
            const m = male(), chain = [given(), ...(r() < 0.5 ? [given()] : [])];
            const ibn = cap(marker(m ? 'son' : 'daughter', m ? 'son' : 'daughter'));
            const nisba = suffix(family(), marker('nisba'));
            return { parts: [P1(given(), 'given'), ...chain.flatMap((n, i) => [P1(i ? cap(marker('son', 'son')) : ibn, 'marker'), P1(n, 'patronymic')]), P1(nisba, 'nisba')],
                gloss: `${m ? 'son' : 'daughter'} of ${chain.map(cap).join(', son of ')}; nisba (origin) at the end` };
        },
        spanish: () => ({ parts: [P1(given(), 'given'), ...(r() < 0.3 ? [P1(given(), 'given')] : []), P1(family(), 'family'), P1(family(), 'family')], gloss: "father's surname, then mother's surname" }),
        eastasian: () => {
            const familyName = pick(pool('eastasian-family', 14), r);
            if (r() < 0.5) { const a = nounPick(), b = pick(P.epithetNouns.filter(e => e.id !== a.id), r), c = compound(a, b, 'given'); return { parts: [P1(familyName, 'family'), c.part], gloss: `given name ${c.gloss}; family name first` }; }
            return { parts: [P1(familyName, 'family'), P1(given(), 'given')], gloss: 'family name first' };
        },
        'indian-north': () => ({ parts: [P1(given(), 'given'), P1(pick(pool('jati', 12), r), 'family')], gloss: 'given name + jati (caste group) / gotra (lineage)' }),
        'indian-south': () => {
            const village = family(), father = given(), me = given();
            return { parts: [P1(`${cap(village)[0]}.`, 'initial'), P1(`${cap(father)[0]}.`, 'initial'), P1(me, 'given')], gloss: `initials: village ${cap(village)}, father ${cap(father)}` };
        },
        sikh: () => {
            const m = male();
            const mark = m ? marker('singh', 'lion') : marker('kaur', 'princess');
            return { parts: [P1(given(), 'given'), P1(mark, 'family')], gloss: `${m ? 'lion' : 'princess'} (the same word for every ${m ? 'man' : 'woman'})` };
        },
        balinese: () => {
            const order = [1, 2, 3, 4].map(i => marker(`order${i}`));
            const k = 1 + Math.floor(r() * 9);
            const again = k > 4 ? [P1(marker('again'), 'marker')] : [];
            return { parts: [P1(order[(k - 1) % 4], 'order'), ...again, P1(given(), 'given')], gloss: `child number ${k}${k > 4 ? ' (the cycle starts again)' : ''}` };
        },
        akan: () => {
            const names = pool('akan-days', 14), d = Math.floor(r() * 7), m = male();
            return { parts: [P1(names[d * 2 + (m ? 0 : 1)], 'day'), P1(given(), 'given')], gloss: `born on ${DAYS[d]} (${m ? 'male' : 'female'})` };
        },
        yoruba: () => {
            let nouns = some(CIRCUMSTANCE);
            if (nouns.length < 4) nouns = P.epithetNouns;
            const a = pick(nouns, r), b = pick(nouns.filter(e => e.id !== a.id), r), c = compound(a, b, 'given');
            return { parts: [c.part], gloss: `circumstance name ${c.gloss}` };
        },
        teknonym: () => {
            const m = male(), child = given();
            const parent = word(m ? 'father' : 'mother');
            const mark = parent ? parent.form : marker(m ? 'father' : 'mother');
            const [a, b] = spec.adjPosition === 'after' ? [mark, child] : [child, mark];
            return { parts: [P1(a, 'marker'), P1(b, 'given')], gloss: `${m ? 'father' : 'mother'} of ${cap(child)}` };
        },
        amazonian: () => {
            const secret = given();
            return { parts: [P1(given(), 'given')], gloss: `public name; the secret name ${cap(secret)} is never said aloud` };
        },
        'native-american': () => {
            const nouns = some(CLAN_ANIMALS), verbs = some(DEEDS, 'verb');
            const n = nounPick(), v = verbs.length ? pick(verbs, r) : null;
            const clan = pick(nouns.length ? nouns : P.epithetNouns, r);
            const first = v ? compound(n, v, 'given') : { part: P1(given(), 'given'), gloss: null };
            return { parts: [first.part, wordPart(clan, 'clan')], gloss: `${v ? `${n.lemma} ${v.lemma}s` : 'name from a vision'}; clan: ${clan.lemma} (through the mother)` };
        },
        ethiopian: () => ({ parts: [P1(given(), 'given'), P1(given(), 'patronymic'), P1(given(), 'patronymic')], gloss: "own name, father's name, paternal grandfather's name" }),
        mongolian: () => {
            const clanName_ = pick(pool('ovog', 8), r);
            const adjs = some(APOTROPAIC_ADJ, 'adjective'), nouns = some(APOTROPAIC_NOUN);
            if (r() < 0.3 && adjs.length && nouns.length) {
                const a = pick(adjs, r), n = pick(nouns, r), c = compound(a, n, 'given');
                return { parts: [P1(clanName_, 'family'), c.part], gloss: `apotropaic name ${c.gloss}: meant to make evil spirits ignore the child` };
            }
            const a = nounPick(), b = pick(P.epithetNouns.filter(e => e.id !== a.id), r), c = compound(a, b, 'given');
            return { parts: [P1(clanName_, 'family'), c.part], gloss: `auspicious name ${c.gloss}` };
        },
        burmese: () => {
            const letters = (fixed.burmese ??= (() => {
                const make = fixedSounds(1.6, 'burmese-letters'), seen = [];
                for (let i = 0; i < 300; i++) { const c = [...make()][0]; if (!seen.includes(c)) seen.push(c); }
                const rr = rng(`${spec.seed}|names|burmese-shuffle`);
                const shuffled = seen.map(c => [rr(), c]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
                return DAYS.map((_, d) => { const l = shuffled.filter((_c, i) => i % 7 === d); return l.length ? l : [shuffled[d % shuffled.length]]; });
            })());
            const d = Math.floor(r() * 7), allowed = letters[d];
            let first = given();
            for (let i = 0; i < 400 && !allowed.includes([...first][0]); i++) first = given();
            const parts = [P1(first, 'given'), ...(r() < 0.6 ? [P1(given(), 'given')] : [])];
            return { parts, gloss: `born on ${DAYS[d]}: the first letter is one of ${allowed.join(' ')}` };
        },
        minangkabau: () => {
            const mother = given();
            return { parts: [P1(given(), 'given'), P1(pick(pool('suku', 7), r), 'clan')], gloss: `clan (suku) inherited from the mother ${cap(mother)}` };
        },
        necronym: () => {
            if (r() < 0.25) {
                const generic = marker(`generic${Math.floor(r() * 3)}`), taboo = given();
                return { parts: [P1(generic, 'marker')], gloss: `temporary name: the bearer shared the name ${cap(taboo)} with a person who died, so it is avoided` };
            }
            return { parts: [P1(given(), 'given')], gloss: null };
        },
        inuit: () => {
            const rel = pick(RELATIVES, r);
            return { parts: [P1(given(), 'given')], gloss: `atiq: the child bears the name, and is treated with the role, of a late ${rel}; any sex` };
        }
    };
    return s;
}
