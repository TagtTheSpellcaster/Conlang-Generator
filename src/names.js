// Proper-name generator: personal names, family/clan names, place names and epithets.
// Pure and deterministic ((language, kind, salt) -> same list). It never changes the language itself: sounds come
// from the language's phonology (including the genre's sound bias), meanings from words of its own lexicon.
import { createWordFactory } from './phonology/words.js';
import { attach } from './morphology/inflect.js';
import { rng, pick } from './core/rng.js';

export const NAME_KINDS = Object.freeze([
    { id: 'person', label: 'Personal names' },
    { id: 'family', label: 'Family and clan names' },
    { id: 'place', label: 'Place names' },
    { id: 'epithet', label: 'Epithets' }
]);

// Per-genre naming custom.
//   person: 'single' (one name) | 'clan' (given + clan) | 'epithet' (given + epithet) | 'title' (title + given); mean = syllables of a given name
//   words: lemmas that give the genre its flavour, added to the common stock of name words (animals, elements, colours...)
//   heads: lemmas added to the place-name heads (hill, ford, harbour...)
const S = (person, mean, words, heads, domains) => Object.freeze({ person, mean, words: words.split(' '), heads: heads.split(' '), domains });
const NAME_STYLES = Object.freeze({
    default: S('clan', 2.2, '', '', { heads: ['settlement', 'nature'], nouns: ['animal', 'nature', 'body'] }),
    war: S('epithet', 1.5, 'spear sword shield banner blade arrow axe wall', 'fort gate wall tower', { heads: ['war', 'settlement'], nouns: ['weapon', 'war'] }),
    orcish: S('clan', 1.6, 'fang skull claw blood bone axe', 'pit cave camp', { heads: ['nature'], nouns: ['animal', 'body', 'weapon'] }),
    giant: S('single', 2.2, 'stone mountain boulder thunder root', 'peak mountain cliff', { heads: ['nature'], nouns: ['nature'] }),
    marine: S('epithet', 2.4, 'wave tide reef shell pearl storm anchor salt', 'bay reef harbour shore island', { heads: ['maritime', 'nature'], nouns: ['maritime'] }),
    fey: S('epithet', 2.6, 'moss petal leaf dew willow thorn', 'grove glade pool meadow', { heads: ['nature'], nouns: ['nature', 'music'] }),
    draconic: S('title', 2.8, 'scale flame hoard ash gold ember', 'lair peak', { heads: ['nature'], nouns: ['material'] }),
    dwarven: S('clan', 1.8, 'anvil hammer forge iron gold gem coal', 'hall mine forge', { heads: ['settlement', 'craft'], nouns: ['craft', 'material'] }),
    infernal: S('title', 2.4, 'ash flame sin chain', 'pit gate', { heads: ['settlement'], nouns: ['abstract'] }),
    arcane: S('title', 2.6, 'star rune book glass mist', 'tower library', { heads: ['settlement'], nouns: ['magic'] }),
    machine: S('single', 1.4, 'steel engine signal wire', 'node station', { heads: ['technology'], nouns: ['technology'] }),
    hive: S('single', 1.3, 'seed swarm nest', 'nest', { heads: ['nature'], nouns: ['animal'] }),
    women: S('epithet', 2.3, 'mother sister rose thread lamp', 'house garden well', { heads: ['household'], nouns: ['family'] }),
    artisan: S('epithet', 1.7, 'anvil hammer clay wood thread', 'workshop forge', { heads: ['craft', 'settlement'], nouns: ['craft'] }),
    thieves: S('epithet', 1.5, 'knife shadow coin cat key', 'alley market gate', { heads: ['settlement'], nouns: ['object'] }),
    nomad: S('clan', 2.0, 'horse steppe wind herd tent', 'pasture steppe camp', { heads: ['nature'], nouns: ['animal', 'transport'] }),
    sacred: S('title', 2.8, 'dawn light grace star', 'temple shrine altar', { heads: ['faith', 'settlement'], nouns: ['faith'] }),
    undead: S('epithet', 2.4, 'bone grave shadow ash night', 'tomb grave crypt', { heads: ['settlement', 'faith'], nouns: ['body'] }),
    merchant: S('clan', 1.7, 'coin salt silk grain scale', 'market harbour road bridge', { heads: ['settlement', 'transport'], nouns: ['object'] })
});
export const nameStyle = genre => NAME_STYLES[genre] ?? NAME_STYLES.default;

const TITLES = ['king', 'queen', 'lord', 'lady', 'chief', 'priest', 'elder', 'master', 'captain', 'prophet', 'judge', 'wizard', 'mage', 'leader', 'ruler'];
// only plain Latin letters are capitalised: capitals of phonetic symbols (esh, eng...) are unfamiliar or look like other letters
const cap = w => /^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w;
const usable = e => !e.gloss && !/\s/.test(e.lemma) && !!e.form;

// Words that make sense in a name or an epithet: animals, elements, colours, qualities (the language only uses those it has).
const NAME_NOUNS = 'wolf bear eagle hawk raven fox lion stag boar serpent snake dragon bull horse crow owl oak ash stone river mountain star moon sun storm thunder fire flame frost snow wind ice sea wave rock iron gold silver blood bone shadow night dawn dusk king'.split(' ');
const PLACE_HEADS = 'hill river lake ford bridge hall tower castle fort village town gate harbour bay valley forest grove cliff peak field well mine road island'.split(' ');
const NAME_ADJECTIVES = 'bright dark swift strong old young great brave wise red black white golden silent fierce proud cold deep high long sharp grim tall wild free green blue fast hard soft quiet cruel noble'.split(' ');

// Pools come from the language's own lexicon. The curated stock plus the genre's flavour words are used when there are enough of them;
// otherwise the pool widens to everyday words of the genre's domains, then to any word of that kind.
function pools(lexicon, spec) {
    const style = nameStyle(spec.genre);
    const MAX_FORM = 7;
    const byLemma = (pos, lemmas) => lexicon.filter(e => e.pos === pos && usable(e) && lemmas.includes(e.lemma));
    const widen = (pos, domains, minimum = 6) => {
        const all = lexicon.filter(e => e.pos === pos && usable(e));
        const inDomain = domains ? all.filter(e => domains.includes(e.domain)) : all;
        const steps = [inDomain.filter(e => e.tier !== 'domain' && e.form.length <= MAX_FORM), inDomain.filter(e => e.form.length <= MAX_FORM), all.filter(e => e.form.length <= MAX_FORM), all];
        return steps.find(t => t.length >= minimum) ?? all;
    };
    const nouns = byLemma('noun', [...NAME_NOUNS, ...style.words]);
    const heads = byLemma('noun', [...PLACE_HEADS, ...style.heads]);
    const curatedAdjectives = byLemma('adjective', NAME_ADJECTIVES);
    const adjectives = curatedAdjectives.length >= 4 ? curatedAdjectives : widen('adjective', ['quality'], 4);
    const stock = nouns.length >= 6 ? nouns : widen('noun', style.domains.nouns);
    return {
        style, epithetAdjs: adjectives, epithetNouns: stock,
        placeHeads: heads.length >= 3 ? heads : widen('noun', style.domains.heads), placeMods: [...stock, ...adjectives],
        titles: lexicon.filter(e => e.pos === 'noun' && usable(e) && TITLES.includes(e.lemma))
    };
}

export function generateNames(lang, { kind = 'person', count = 12, salt = 0 } = {}) {
    const { spec, lexicon } = lang;
    if (!NAME_KINDS.some(k => k.id === kind)) throw new Error(`Unknown name kind "${kind}".`);
    const n = Math.max(1, Math.min(60, Math.floor(count) || 12));
    const P = pools(lexicon, spec);
    const base = `${spec.seed}|names|${kind}|${salt}`;
    const r = rng(`${base}|choice`);
    const sounds = (mean, tag) => createWordFactory({
        consonants: spec.consonants, vowels: spec.vowels, mean: Math.max(1, Math.min(4, mean)), seed: `${base}|${tag}`,
        onsetClusters: spec.onsetClusters, codaClusters: spec.codaClusters, maxCluster: spec.maxCluster, soundBias: spec.soundBias
    });
    // names are shorter than ordinary words: one to three syllables, never the long profile
    const given = sounds(P.style.mean <= 1.8 ? 1.4 : 2.0, 'given'), family = sounds(2.0, 'family');
    const wordPart = (e, role) => ({ text: cap(e.form), role, meaning: e.lemma });
    const headFirst = spec.adjPosition === 'after';

    // two words fused into one name, in the language's modifier/head order; a linking vowel is inserted where the junction would be unpronounceable.
    // The English gloss always reads modifier-head ("fire-wolf").
    const compound = (modifier, head, role) => {
        const [a, b] = headFirst ? [head, modifier] : [modifier, head];
        return { part: { text: cap(a.form + attach(a.form, b.form, spec)), role, meaning: `${modifier.lemma}-${head.lemma}` }, gloss: `${modifier.lemma}-${head.lemma}` };
    };
    // a phrase of the language: adjective and noun in the language's own order; the gloss reads adjective-noun
    const phrase = () => {
        const adj = pick(P.epithetAdjs, r), noun = pick(P.epithetNouns, r);
        const [a, b] = spec.adjPosition === 'before' ? [adj, noun] : [noun, adj];
        return { parts: [{ text: cap(a.form), role: 'epithet', meaning: a.lemma }, { text: b.form, role: 'epithet', meaning: b.lemma }], gloss: `${adj.lemma} ${noun.lemma}` };
    };
    // a clan name is either a fresh word or a compound of two nouns
    const clanName = () => {
        if (r() < 0.5) return { parts: [{ text: cap(family()), role: 'family' }], gloss: null };
        const a = pick(P.epithetNouns, r), b = pick(P.epithetNouns.filter(e => e.id !== a.id), r);
        const c = compound(a, b, 'family');
        return { parts: [c.part], gloss: c.gloss };
    };

    // each generator returns { parts: [{text, role, meaning?}], gloss: English reading or null }
    const make = {
        person: () => {
            const g = { text: cap(given()), role: 'given' };
            if (P.style.person === 'single') return { parts: [g], gloss: null };
            if (P.style.person === 'title' && P.titles.length) { const t = pick(P.titles, r); return { parts: [wordPart(t, 'title'), g], gloss: t.lemma }; }
            if (P.style.person === 'epithet') { const e = phrase(); return { parts: [g, ...e.parts], gloss: e.gloss }; }
            const c = clanName();
            return { parts: [g, ...c.parts], gloss: c.gloss };
        },
        family: () => clanName(),
        place: () => {
            const head = pick(P.placeHeads, r), mod = pick(P.placeMods.filter(e => e.id !== head.id), r);
            const c = compound(mod, head, 'place');
            return { parts: [c.part], gloss: c.gloss };
        },
        epithet: () => phrase()
    };

    const seen = new Set(), names = [];
    for (let guard = 0; names.length < n && guard < n * 40; guard++) {
        const { parts, gloss } = make[kind]();
        const name = parts.map(p => p.text).join(' ');
        if (seen.has(name) || parts.some(p => p.text.length > 12)) continue;
        seen.add(name);
        names.push({ kind, name, meaning: gloss, parts });
    }
    return names;
}
