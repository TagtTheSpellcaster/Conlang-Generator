// Language genres: broad families of fictional languages. A genre is data only and has three parts:
//   grammar    default structural options (same names as the spec options)
//   sound      default phonology options plus `bias`: multipliers for phonetic classes or single symbols
//              (bias.c for consonants, bias.v for vowels; 0 removes a symbol, 1 is neutral)
//   semantics  how much the genre cares about each part of the vocabulary:
//              domains (domainsAvoid: the same, for negative weights) / groups ("domain/group") / tags / cultures / biomes / eras: score bonuses (negative = avoid)
//              exclude: domains and tags that are never selected (except core concepts needed by the sample sentences)
// resolveSpec() uses grammar and sound as defaults for every option the caller leaves unset; select.js uses semantics.
// Weights are tuned so a genre fills roughly a third to a half of the lexicon with its own vocabulary.

// Culture / biome / era the interface selects when the genre is chosen. Only the dimensions where the genre has a clear
// identity are listed (a war tongue has a culture but no biome or era); the others stay on "Any". The selection is a soft
// preference that adds weight to matching entries; the user can change it.
const PROFILES = {
    war: { culture: 'militaristic' }, orcish: { culture: 'tribal' }, giant: { biome: 'alpine', era: 'prehistoric' },
    marine: { culture: 'maritime', biome: 'ocean' }, fey: { culture: 'animist', biome: 'forest' }, draconic: {},
    dwarven: { culture: 'artisan' }, infernal: { culture: 'occult' }, arcane: { culture: 'scholarly' },
    machine: { culture: 'technocratic', era: 'futuristic' }, hive: { culture: 'communal' }, women: { culture: 'sisterhood' },
    artisan: { culture: 'artisan' }, thieves: { culture: 'urban' }, nomad: { culture: 'nomadic', biome: 'grassland' },
    sacred: { culture: 'religious' }, undead: { culture: 'occult' }, merchant: { culture: 'mercantile' }
};

const G = (id, label, summary, grammar, sound, semantics) => Object.freeze({ id, label, summary, grammar, sound, semantics, profile: Object.freeze({ ...PROFILES[id] }) });

export const GENRES = Object.freeze(Object.fromEntries([
    G('war', 'War tongue',
        'Short, hard-edged words that carry across a battlefield: no articles, fixed command order, distinct open vowels, plenty of military concepts.',
        { morphology: 'isolating', articles: 'none', order: 'VSO', relations: 'prepositions', plural: 'none', number: 'singular', gender: 'none', adjPosition: 'after' },
        { consonants: 'european', vowels: 'minimal', mean: 1.2, onsetClusters: ['sibilant_stop'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { stop: 3, voiceless: 1.6, sonorant: 0.35, glide: 0.2, nasal: 0.6 }, v: { open: 2 }, closed: 2.5 } },
        { domains: { war: 5, weapon: 3.5, society: 0.5 }, groups: { 'society/military_and_security': 3, 'society/government': 1, 'weapon/defensive': 3, 'weapon/combat_and_warfare': 3, 'weapon/combat_actions': 3, 'weapon/melee': 2, 'weapon/ranged': 2, 'weapon/ancient_and_historical': 2 }, tags: { violence: 1.5, war: 1, weapon: 0.5 },
            cultures: { warrior: 2, militaristic: 2.5 }, biomes: {}, eras: {},
            domainsAvoid: { music: -1.5, household: -1.5, clothing: -1, food: -0.5, faith: -1 }, exclude: { domains: [], tags: [] } }),

    G('orcish', 'Orcish',
        'Guttural and blunt: voiced stops, z, r and dark back vowels, thick clusters, simple agglutinating grammar without articles.',
        { morphology: 'agglutinative', articles: 'none', order: 'SOV', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'minimal', adjPosition: 'before' },
        { consonants: 'english', vowels: 'standard', mean: 1.5, onsetClusters: ['harsh', 'liquids'], codaClusters: ['liquid_stop'], maxCluster: 2,
            bias: { c: { stop: 1.6, voiced: 1.4, harsh: 2.2, 'θ': 0.2, f: 0.5, sonorant: 0.7 }, v: { back: 2.6, open: 1.4, front: 0.35 }, closed: 1.8 } },
        { domains: { weapon: 3, war: 0.5, animal: 1.5, body: 1.5, food: 1.2 }, groups: { 'war/ranks_and_roles': 2.5, 'war/war_actions': 2.5, 'war/war_qualities': 2, 'war/organization': 1.5, 'war/logistics_and_camp': 1.5, 'war/command_and_signals': 1 }, tags: { violence: 2, monster: 2.5 },
            cultures: { tribal: 2.5, warrior: 1.5 }, biomes: { mountain: 1, forest: 0.5 }, eras: {},
            domainsAvoid: { music: -2, faith: -1, clothing: -1.5, magic: -1 }, exclude: { domains: [], tags: [] } }),

    G('giant', 'Giants',
        'Slow, heavy and low: nasals, voiced stops and deep vowels, long memory words, few grammatical categories.',
        { morphology: 'isolating', articles: 'none', order: 'SOV', relations: 'prepositions', plural: 'none', number: 'singular', gender: 'none', adjPosition: 'before' },
        { consonants: 'european', vowels: 'standard', mean: 2.4, onsetClusters: ['none'], codaClusters: ['nasal_stop'], maxCluster: 2,
            bias: { c: { nasal: 2.6, voiced: 1.8, stop: 1.1, fricative: 0.5, glide: 0.4, voiceless: 0.6 }, v: { back: 3, open: 1.6, front: 0.35 }, closed: 1.8 } },
        { domains: { nature: 1.2, body: 1.2, animal: 1, material: 1, abstract: 0.2 }, groups: { 'nature/landform': 3, 'nature/natural_material': 2, 'abstract/deep_time': 4 },
            tags: { giant: 4, mountain: 3 }, cultures: { tribal: 1.5 }, biomes: { mountain: 3, alpine: 2.5, tundra: 1.5 }, eras: { prehistoric: 1.5 },
            domainsAvoid: { technology: -2.5, clothing: -1.5, music: -1 }, exclude: { domains: [], tags: [] } }),

    G('marine', 'Sea-folk',
        'Fluid and long: liquids, nasals and glides, open syllables, vowel-rich agglutinating words with many suffixes; the vocabulary of tides, depths and shores.',
        { morphology: 'agglutinative', articles: 'none', order: 'SOV', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'extensive', adjPosition: 'after' },
        { consonants: 'european', vowels: 'standard', mean: 3.6, onsetClusters: ['none'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { liquid: 3, nasal: 2, glide: 2, v: 1.5, stop: 0.35, voiceless: 0.6 }, v: { a: 1.8, u: 1.5, e: 1.3 }, closed: 0 } },
        { domains: { maritime: 5, nature: 1.2, animal: 0.8 }, groups: { 'nature/water': 5, 'nature/fishing': 3, 'nature/ecology': 0.5 }, tags: { sea: 3, marine_life: 1.5, fish: 1.5 },
            cultures: { maritime: 3 }, biomes: { ocean: 3.5, freshwater: 2 }, eras: {},
            domainsAvoid: { weapon: -1, technology: -1.5, settlement: -0.7, clothing: -0.7 }, exclude: { domains: [], tags: [] } }),

    G('fey', 'Fey',
        'Light, melodic, ornate: liquids and glides, high and front vowels, no hard clusters, rich cases and a dual number; no concept of war beyond what the sample sentences require.',
        { morphology: 'agglutinative', articles: 'none', order: 'SVO', plural: 'suffix', number: 'singular-plural-dual', gender: 'masculine-feminine-neuter', relations: 'cases', caseSystem: 'extensive', adjPosition: 'before' },
        { consonants: 'japanese', vowels: 'extended', mean: 3, onsetClusters: ['none'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { liquid: 2.5, glide: 2.5, nasal: 1.4, sibilant: 1.3, voiced: 0.9, stop: 0.55 }, v: { front: 1.8, close: 1.5, i: 1.6 }, closed: 0 } },
        { domains: { nature: 1.5, magic: 0.4, music: 3, abstract: 0.5, animal: 0.8 }, groups: { 'nature/vegetation': 2, 'nature/celestial': 1.5, 'nature/atmosphere': 1, 'magic/spellcraft': 1.5, 'magic/magical_forces': 1, 'magic/magic_actions': 1.5, 'magic/magic_qualities': 1 },
            tags: { fey: 5, fantasy: 2, glade: 2, infernal: -5, undead: -5, fiend: -5, death: -3, grave: -3, vice: -3 }, cultures: { animist: 3, shamanic: 2 }, biomes: { forest: 3, grassland: 1 }, eras: {},
            domainsAvoid: { technology: -2.5, household: -0.5 }, exclude: { domains: ['war', 'weapon', 'technology'], tags: ['violence'] } }),

    G('draconic', 'Draconic',
        'Imperious and sibilant: hissing and guttural consonants, harsh clusters, formal fusional grammar with definite articles; hoards, flame, time and dominion.',
        { morphology: 'fusional', articles: 'definite', order: 'SVO', plural: 'suffix', number: 'singular-plural', gender: 'masculine-feminine-neuter', relations: 'cases', caseSystem: 'extensive', adjPosition: 'after' },
        { consonants: 'semitic', vowels: 'standard', mean: 2.4, onsetClusters: ['harsh'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { sibilant: 2, guttural: 2, harsh: 1.4, nasal: 0.7 }, v: { open: 2, back: 2, front: 0.45 }, closed: 0.8 } },
        { domains: { magic: 0.2, abstract: 0.3, material: 1.2, time: 1.2, animal: 0.8 }, groups: { 'animal/dragon_kind': 5, 'abstract/hoard_and_pride': 5, 'animal/dragon_acts': 4 },
            tags: { dragon: 6, hoard: 4, treasure: 3, fantasy: 1, magic: 1 }, cultures: { aristocratic: 2, warrior: 1 }, biomes: { mountain: 2 }, eras: { ancient: 1 },
            domainsAvoid: { household: -2, clothing: -2, food: -1 }, exclude: { domains: [], tags: [] } }),

    G('dwarven', 'Dwarven',
        'Compact and stony: stops and r, back vowels, hard clusters; agglutinating with possessives and genitives. Vocabulary of mines, metal, stone, clan and craft.',
        { morphology: 'agglutinative', articles: 'none', order: 'SOV', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'moderate', adjPosition: 'before' },
        { consonants: 'slavic', vowels: 'standard', mean: 2, onsetClusters: ['liquids', 'harsh'], codaClusters: ['liquid_stop'], maxCluster: 3,
            bias: { c: { stop: 1.6, harsh: 1.5, r: 1.5, voiceless: 1.2, glide: 0.4 }, v: { back: 2.4, open: 1.3, front: 0.4 } } },
        { domains: { craft: 1.5, material: 3, weapon: 2.5, technology: 1.5, war: 1.5, family: 1 }, groups: { 'nature/natural_material': 2, 'nature/landform': 1.2, 'technology/craft_tool': 3.5, 'technology/hand_tool': 2, 'material/material_process': 1.5 },
            tags: { smithing: 3, stone: 3, masonry: 2, metal: 2, giant: 0.5 }, cultures: { artisan: 3, tribal: 1 }, biomes: { mountain: 3 }, eras: {},
            domainsAvoid: { music: -0.5, maritime: -1.5 }, exclude: { domains: [], tags: [] } }),

    G('infernal', 'Infernal',
        'Cold, sibilant and legalistic: sibilants, dentals and r with unusual rounded vowels; fusional grammar with definite articles; contracts, vices and torment.',
        { morphology: 'fusional', articles: 'definite', order: 'SOV', plural: 'suffix', number: 'singular-plural', gender: 'masculine-feminine-neuter', relations: 'cases', caseSystem: 'extensive', adjPosition: 'after' },
        { consonants: 'european', vowels: 'extended', mean: 2, onsetClusters: ['harsh', 'greek'], codaClusters: ['liquid_stop'], maxCluster: 2,
            bias: { c: { sibilant: 2.4, dental: 1.4, r: 2, nasal: 0.6, glide: 0.4 }, v: { 'ø': 2, y: 2, front: 1.2, back: 0.8 } } },
        { domains: { magic: 0.2, abstract: 0.3, faith: 0.3 }, groups: { 'magic/hell_and_devils': 4, 'magic/hell_places_and_things': 4, 'abstract/hell_acts_and_vices': 4 },
            tags: { infernal: 6, fiend: 4, vice: 3, death: 0.5, fey: -3 }, cultures: { occult: 3, theocratic: 1 }, biomes: {}, eras: {},
            domainsAvoid: { nature: -1, household: -1, music: -0.5 }, exclude: { domains: [], tags: [] } }),

    G('arcane', 'Arcane',
        'Stately and learned: liquids, nasals and sibilants, a few Greek-type clusters, fusional grammar with a dual; spells, rites, runes and forces.',
        { morphology: 'fusional', articles: 'definite', order: 'SVO', plural: 'suffix', number: 'singular-plural-dual', gender: 'masculine-feminine-neuter', relations: 'cases', caseSystem: 'extensive', adjPosition: 'after' },
        { consonants: 'european', vowels: 'standard', mean: 3, onsetClusters: ['liquids', 'greek'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { liquid: 1.6, nasal: 1.3, sibilant: 1.3, harsh: 0.8 }, v: { front: 1.4, i: 1.4, e: 1.2 }, closed: 0.6 } },
        { domains: { magic: 4, abstract: 1, time: 1, faith: 0.4 }, groups: { 'society/education_and_knowledge': 1.5, 'nature/celestial': 1 },
            tags: { magic: 5, spell: 3, fantasy: 1, infernal: -3, undead: -2, fiend: -3 }, cultures: { scholarly: 3, shamanic: 1.5, religious: 1, monastic: 1 }, biomes: {}, eras: {},
            domainsAvoid: { weapon: -1.5, war: -1.5, food: -0.5 }, exclude: { domains: [], tags: [] } }),

    G('machine', 'Machine speech',
        'Short, regular, CV-based forms with plain agglutinating grammar and fixed order; the vocabulary of computing, hardware, signals and states.',
        { morphology: 'agglutinative', articles: 'none', order: 'SOV', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'minimal', adjPosition: 'after' },
        { consonants: 'japanese', vowels: 'standard', mean: 1.6, onsetClusters: ['none'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { stop: 1.5, z: 1.5, r: 1.3, h: 0.5 }, v: { open: 1.5 }, closed: 0 } },
        { domains: { technology: 4, number: 2, space: 2, abstract: 1 }, groups: { 'technology/science_fiction': 4, 'technology/digital': 3, 'technology/electronic_technology': 3, 'weapon/science_fiction': 1 },
            tags: { machine: 5, digital: 3, computing: 3, hardware: 2 }, cultures: { technocratic: 3, posthuman: 3, spacefaring: 2, post_industrial: 1.5 }, biomes: {}, eras: { futuristic: 3, modern: 1 },
            domainsAvoid: { family: -1.5, animal: -1.5, food: -1.5, clothing: -1.5, music: -1 }, exclude: { domains: [], tags: [] } }),

    G('hive', 'Hive-speech',
        'Buzzing and clipped: sibilants and high front vowels, clusters of s-plus-stop, communal agglutinating grammar; castes, brood, trails and the body of an insect.',
        { morphology: 'agglutinative', articles: 'none', order: 'OVS', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'minimal', adjPosition: 'after' },
        { consonants: 'european', vowels: 'standard', mean: 1.6, onsetClusters: ['sibilant_stop', 'harsh'], codaClusters: ['sibilant_stop'], maxCluster: 3,
            bias: { c: { sibilant: 2.6, voiceless: 1.4, nasal: 0.5, liquid: 0.7 }, v: { front: 2, close: 1.4, back: 0.4 } } },
        { domains: { animal: 0.6, nature: 0.3, body: 0.8 }, groups: {}, tags: { hive: 6, insect: 4, colony: 2 }, cultures: { communal: 3, tribal: 1 }, biomes: {}, eras: {},
            domainsAvoid: { music: -2, faith: -1.5, clothing: -2, household: -1 }, exclude: { domains: [], tags: [] } }),

    G('women', 'Women\'s secret tongue',
        'In the manner of Nüshu: soft, rounded and open-syllabled, agglutinating; the vocabulary of sisterhood, letters and songs, weddings, needlework, the inner courtyard and childbirth.',
        { morphology: 'agglutinative', articles: 'none', order: 'SOV', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'moderate', adjPosition: 'before' },
        { consonants: 'japanese', vowels: 'standard', mean: 2, onsetClusters: ['none'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { nasal: 2, liquid: 1.5, glide: 1.5, sibilant: 1.2, stop: 0.7, harsh: 0.6 }, v: { front: 1.5, i: 1.4, a: 1.3, back: 0.9 }, closed: 0 } },
        { domains: { family: 2.5, household: 2.5, clothing: 2, body: 1, abstract: 0.8 }, groups: { 'craft/weaving_and_dyeing': 1.5, 'craft/weaving_actions': 2, 'craft/needlework': 3, 'society/family_and_kinship': 1.5 },
            tags: { women: 6, sisterhood: 4, letter: 2, needlework: 2, wedding: 2 }, cultures: { sisterhood: 4, rural: 1 }, biomes: {}, eras: {},
            domainsAvoid: { weapon: -3, maritime: -1, technology: -1.5 }, exclude: { domains: ['war'], tags: ['violence'] } }),

    G('artisan', 'Artisans\' cant',
        'The terse jargon of the workshop: stops and liquids, short compound-free words, fixed order; tools, materials, processes and guild vocabulary.',
        { morphology: 'isolating', articles: 'none', order: 'SOV', relations: 'prepositions', plural: 'none', number: 'singular', gender: 'none', adjPosition: 'before' },
        { consonants: 'english', vowels: 'standard', mean: 1.8, onsetClusters: ['liquids'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { stop: 1.7, voiceless: 1.2, nasal: 0.8, glide: 0.5 }, v: { open: 1.2 } } },
        { domains: { craft: 5, material: 3, technology: 2, object: 1 }, groups: { 'technology/craft_tool': 3, 'technology/hand_tool': 2, 'society/labor_and_professions': 1.5 },
            tags: { craft: 3, smithing: 2, carpentry: 2, masonry: 2, textile: 2, tool: 1 }, cultures: { artisan: 4 }, biomes: {}, eras: {},
            domainsAvoid: { music: -0.5 }, exclude: { domains: [], tags: [] } }),

    G('thieves', 'Thieves\' cant',
        'Slangy and clipped: short words, sibilants and stops, fixed order, no articles; crime, tools of the trade, the city underworld and its dangers.',
        { morphology: 'isolating', articles: 'none', order: 'SVO', relations: 'prepositions', plural: 'none', number: 'singular', gender: 'none', adjPosition: 'before' },
        { consonants: 'english', vowels: 'standard', mean: 1.4, onsetClusters: ['sibilant_stop'], codaClusters: ['sibilant_stop'], maxCluster: 3,
            bias: { c: { stop: 1.5, sibilant: 1.5, voiceless: 1.2, glide: 0.4 }, v: { front: 1.4, open: 0.9, back: 0.8 } } },
        { domains: { society: 0.4, abstract: 0.2 }, groups: { 'society/law_and_justice': 1.5 }, tags: { thieves: 6, crime: 3, thief: 3, violence: 0.5 },
            cultures: { urban: 2, mercantile: 1 }, biomes: {}, eras: {},
            domainsAvoid: { faith: -1, nature: -1.5, music: -1 }, exclude: { domains: [], tags: [] } }),

    G('nomad', 'Steppe tongue',
        'Open and rolling: back vowels and velars, agglutinating with many cases, no gender; herds, horses, tents, wind and migration.',
        { morphology: 'agglutinative', articles: 'none', order: 'SOV', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'extensive', adjPosition: 'before' },
        { consonants: 'slavic', vowels: 'standard', mean: 2.2, onsetClusters: ['none'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { velar: 1.8, r: 1.5, nasal: 1.1, sibilant: 0.8, labial: 0.8 }, v: { back: 1.8, open: 1.4, front: 0.6 } } },
        { domains: { animal: 1.5, nature: 0.6, transport: 1.5, food: 1, clothing: 1 }, groups: { 'settlement/dwelling_type': 6, 'society/nomad_life': 4, 'society/nomad_society': 4, 'society/nomad_acts': 3 },
            tags: { nomad: 5, camp: 3 }, cultures: { nomadic: 4, pastoral: 3, tribal: 2 }, biomes: { grassland: 3, desert: 2, tundra: 1, savanna: 1.5 }, eras: {},
            domainsAvoid: { technology: -1.5, settlement: -1.5, maritime: -1.5 }, exclude: { domains: [], tags: [] } }),

    G('sacred', 'Sacred language',
        'Stately and sonorous: liquids and nasals, open syllables, fusional grammar with definite articles and a dual, verb-first order; prayer, rite, clergy and the divine.',
        { morphology: 'fusional', articles: 'definite', order: 'VSO', plural: 'suffix', number: 'singular-plural-dual', gender: 'masculine-feminine-neuter', relations: 'cases', caseSystem: 'extensive', adjPosition: 'after' },
        { consonants: 'european', vowels: 'standard', mean: 3.2, onsetClusters: ['none'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { liquid: 2, nasal: 1.5, sibilant: 1.1, voiced: 1.2, voiceless: 0.8 }, v: { open: 1.3, mid: 1.3 }, closed: 0.15 } },
        { domains: { faith: 5, abstract: 0.6, music: 2, society: 0.3 }, groups: { 'society/religion': 3 }, tags: { faith: 3, sacred: 3, rite: 2, divine: 2 },
            cultures: { religious: 3, theocratic: 3, monastic: 3 }, biomes: {}, eras: {},
            domainsAvoid: { weapon: -1, war: -1 }, exclude: { domains: [], tags: [] } }),

    G('undead', 'Tongue of the dead',
        'Hollow and breathy: nasals, liquids and gutturals, low back vowels, fusional grammar without gender or articles; graves, decay, mourning and the restless.',
        { morphology: 'fusional', articles: 'none', order: 'VSO', plural: 'suffix', number: 'singular-plural', gender: 'none', relations: 'cases', caseSystem: 'minimal', adjPosition: 'after' },
        { consonants: 'semitic', vowels: 'standard', mean: 2.6, onsetClusters: ['none'], codaClusters: ['liquid_stop'], maxCluster: 2,
            bias: { c: { nasal: 2, liquid: 1.5, guttural: 1.8, voiceless: 0.7, sibilant: 0.7 }, v: { back: 2.4, open: 1.1, front: 0.35 } } },
        { domains: { magic: 0.3, abstract: 0.6, body: 1.2 }, groups: {}, tags: { undead: 6, death: 5, grave: 3, fey: -3 }, cultures: { occult: 2 }, biomes: {}, eras: {},
            domainsAvoid: { music: -1, food: -2, household: -1.5, clothing: -1 }, exclude: { domains: [], tags: [] } }),

    G('merchant', 'Trade pidgin',
        'A plain contact language of the markets: short, regular open syllables, isolating grammar, no gender; prices, goods, weights, debts and routes.',
        { morphology: 'isolating', articles: 'none', order: 'SVO', relations: 'prepositions', plural: 'none', number: 'singular', gender: 'none', adjPosition: 'before' },
        { consonants: 'japanese', vowels: 'standard', mean: 1.6, onsetClusters: ['none'], codaClusters: ['none'], maxCluster: 2,
            bias: { c: { sonorant: 1.2, h: 0.5 }, v: {}, closed: 0 } },
        { domains: { society: 0.3, number: 1.5, object: 0.5 }, groups: { 'society/trade_and_business': 3, 'society/economy': 3, 'technology/transport_technology': 0.5 },
            tags: { trade: 5, market: 3, merchant: 3 }, cultures: { mercantile: 3.5, urban: 1 }, biomes: {}, eras: {},
            domainsAvoid: { faith: -0.5, magic: -0.5 }, exclude: { domains: [], tags: [] } })
].map(g => [g.id, g])));

export const GENRE_IDS = Object.freeze(Object.keys(GENRES));

// Order used to turn a genre's `grammar` and `sound` into spec defaults.
export const GRAMMAR_KEYS = Object.freeze(['morphology', 'articles', 'order', 'plural', 'number', 'gender', 'relations', 'caseSystem', 'adjPosition']);
export const SOUND_KEYS = Object.freeze(['consonants', 'vowels', 'mean', 'onsetClusters', 'codaClusters', 'maxCluster']);

export const genreDefaults = id => (GENRES[id] ? { ...GENRES[id].grammar, ...Object.fromEntries(SOUND_KEYS.filter(k => k in GENRES[id].sound).map(k => [k, GENRES[id].sound[k]])) } : {});
