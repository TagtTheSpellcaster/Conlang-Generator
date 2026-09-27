/**
 * Conlang Engine Studio
 * Version: 2.2.0
 * Architecture: True VOS/OVS Constituent Engine & Expanded Historical-Semantic Matrix
 */

const Phonetics = {
    vowels: {
        standard: ['a', 'e', 'i', 'o', 'u'],
        minimal: ['a', 'i', 'u'],
        extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
    },
    consonants: {
        balanced: ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 's', 'r', 'l'],
        guttural: ['k', 'q', 'x', 'g', 'r', 'kh', 'gh', 'q', 't'],
        sibilant: ['s', 'z', 'sh', 'zh', 'f', 'v', 'r', 'l', 'th'],
        soft: ['m', 'n', 'l', 'r', 'w', 'j', 'v', 'dh']
    },
    ipaMap: {
        'a': '/a/', 'e': '/e/', 'i': '/i/', 'o': '/o/', 'u': '/u/', 'y': '/y/', 'ø': '/ø/', 'æ': '/æ/',
        'p': '/p/', 't': '/t/', 'k': '/k/', 'b': '/b/', 'd': '/d/', 'g': '/ɡ/', 'm': '/m/', 'n': '/n/',
        's': '/s/', 'z': '/z/', 'r': '/r/', 'l': '/l/', 'q': '/q/', 'x': '/x/', 'kh': '/x/', 'gh': '/ɣ/',
        'sh': '/ʃ/', 'zh': '/ʒ/', 'f': '/f/', 'v': '/v/', 'th': '/θ/', 'dh': '/ð/', 'w': '/w/', 'j': '/j/'
    }
};

const SyllableStructures = {
    musical: ['CV', 'V', 'CVV'],
    dark: ['CVC', 'CCVC', 'CVCC'],
    magical: ['CV', 'CVV', 'VC'],
    aquatic: ['CV', 'V', 'CVC'],
    harsh: ['CCVC', 'CVC', 'CVCC', 'CCVCC']
};

const ExpandedCulturalDomains = {
    medieval: [
        "feud", "castle", "knight", "honor", "vassal", "lance", "crown", "inn", "horse", "guard", "coin",
        "fief", "bailiff", "moat", "portcullis", "cloister", "herald", "chainmail", "blacksmith", "timber",
        "falconry", "parchment", "tithe", "squire", "armorer", "mace", "almoner", "keep", "drawbridge",
        "baron", "viscount", "archers", "crossbow", "pillage", "banner", "manor", "gallows", "relic", "abbey"
    ],
    ancient: [
        "empire", "chariot", "oracle", "bronze", "tomb", "papyrus", "forum", "guard", "gold", "phalanx",
        "sartor", "aqueduct", "centurion", "senate", "gladiator", "amphitheater", "catacomb", "sculpture",
        "toga", "obelisk", "tribute", "patrician", "plebeian", "scepter", "scribe", "mural", "pantheon"
    ],
    primitive: [
        "hunt", "tribe", "cave", "flint", "pelt", "totem", "spring", "beast", "fire", "hearth", "carcass",
        "spearhead", "sinew", "shaman", "amber", "fang", "tallow", "shelter", "track", "forage", "marrow",
        "cliff", "clearing", "hide", "stalk", "thicket", "cavern", "stonehead", "bark", "tendon", "ash"
    ],
    renaissance: [
        "art", "guild", "patron", "cannon", "sail", "monarch", "shop", "coin", "map", "astrolabe", "canvas",
        "fresco", "alchemist", "galleon", "telescope", "engraving", "compass", "manuscript", "merchant",
        "diplomat", "caravel", "gilding", "scholar", "academy", "scaffold", "piazza", "inkwell", "quill"
    ],
    african: [
        "savanna", "spirit", "ancestor", "drum", "elder", "drought", "well", "beast", "baobab", "savannah",
        "mask", "griot", "cowrie", "millet", "gazelle", "terracotta", "spear", "chieftain", "herdsman",
        "riverbed", "clay", "talisman", "monsoon", "thatch", "horn", "ebony", "charcoal", "pasture"
    ],
    alien: [
        "plasma", "void", "hive", "orbit", "core", "nexus", "station", "ship", "guard", "nebula", "pulsar",
        "warp", "reactor", "biosphere", "hyperdrive", "xenon", "portal", "singularity", "isotope", "array",
        "subspace", "alloy", "hologram", "cryo", "transmitter", "cybernetics", "matrix", "beacon", "drone"
    ]
};

const ContextualLexicon = {
    coreNouns: ["man", "person", "sun"],
    coreVerbs: ["be", "have"],

    nouns: [
        "moon", "water", "fire", "earth", "sky", "woman", "child",
        "king", "leader", "god", "spirit", "sword", "shield", "trade", "gold", "house", "city",
        "star", "river", "tree", "animal", "beast", "life", "death", "blood", "war", "peace",
        "food", "bread", "night", "day", "shadow", "light", "stone", "iron", "wind", "sea",
        "mountain", "valley", "forest", "rain", "storm", "ice", "road", "gate", "bridge", "tower"
    ],
    verbs: [
        "run", "walk", "speak", "see", "hear", "fight", "build", "love", "hate", "eat",
        "drink", "sleep", "die", "live", "give", "take", "think", "know", "lead", "rule",
        "seek", "find", "call", "stop", "strike", "guard", "carry", "break", "bind", "fly"
    ],
    adjectives: [
        "great", "small", "bright", "dark", "strong", "weak", "old", "young", "good", "evil",
        "hot", "cold", "fast", "slow", "hard", "soft", "wise", "wild", "holy", "mortal",
        "clean", "safe", "cheap", "rich", "bound", "silent", "sharp", "heavy", "lightweight", "pure"
    ],
    pronouns: [
        "I", "you", "he", "she", "it", "we (inclusive)", "we (exclusive)",
        "they (proximate)", "they (obviate)", "they (ancestral)", "they (collective)"
    ],
    possessives: [
        "my", "your", "his", "her", "its", "our", "their"
    ],
    grammatical: [
        "and", "or", "but", "if", "in", "on", "at", "with", "from", "to", "by", "for", "this", "that"
    ]
};

class ConlangEngine {
    constructor() {
        this.currentConfig = {};
        this.usedWords = new Set();
        this.lastGeneratedData = null;
        this.lexiconMap = new Map();
    }

    boxMullerRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    generatePhonotacticWord(targetSyllables = 2, isGrammatical = false, isCoreLexeme = false) {
        const vowels = Phonetics.vowels[this.currentConfig.vowelSet] || Phonetics.vowels.standard;
        const consonants = Phonetics.consonants[this.currentConfig.consonantSet] || Phonetics.consonants.balanced;
        const structures = SyllableStructures[this.currentConfig.aesthetic] || SyllableStructures.musical;

        let numSyllables;
        if (isGrammatical) {
            numSyllables = 1;
        } else if (isCoreLexeme) {
            numSyllables = Math.random() > 0.5 ? 1 : 2;
        } else {
            numSyllables = Math.max(2, Math.round(targetSyllables));
        }

        let word = '';
        let attempts = 0;

        do {
            word = '';
            for (let i = 0; i < numSyllables; i++) {
                const struct = structures[Math.floor(Math.random() * structures.length)];
                for (let char of struct) {
                    if (char === 'C') {
                        word += consonants[Math.floor(Math.random() * consonants.length)];
                    } else if (char === 'V') {
                        word += vowels[Math.floor(Math.random() * vowels.length)];
                    }
                }
            }
            attempts++;
            if (attempts > 150) {
                word += attempts; 
                break;
            }
        } while (this.usedWords.has(word));

        this.usedWords.add(word);
        return word;
    }

    generateLanguageName() {
        const oldUsed = new Set(this.usedWords);
        const nameWord1 = this.generatePhonotacticWord(2, false, false);
        const nameWord2 = this.generatePhonotacticWord(1, true, false);
        
        let name = '';
        if (this.currentConfig.aesthetic === 'musical' || this.currentConfig.aesthetic === 'magical') {
            name = nameWord1.charAt(0).toUpperCase() + nameWord1.slice(1) + '-' + nameWord2;
        } else if (this.currentConfig.aesthetic === 'dark' || this.currentConfig.aesthetic === 'harsh') {
            name = nameWord1.charAt(0).toUpperCase() + nameWord1.slice(1).toUpperCase() + " " + nameWord2.toUpperCase();
        } else {
            name = nameWord1.charAt(0).toUpperCase() + nameWord1.slice(1);
        }
        
        this.usedWords = oldUsed;
        return name;
    }

    // Costruttore di frasi con Reale Applicazione dell'Ordine Sintattico (VOS, SOV, etc.)
    generateProceduralPhraseCategory(categoryIndex, count, culture, wordOrder, articles, caseSuffix, suffix) {
        const phrases = [];
        
        const culturalShelterMap = {
            primitive: { shelter: "cave", guard: "beast", coin: "flint", guide: "totem", water: "spring" },
            medieval: { shelter: "inn", guard: "guard", coin: "coin", guide: "castle", water: "well" },
            ancient: { shelter: "tomb", guard: "centurion", coin: "gold", guide: "forum", water: "river" },
            renaissance: { shelter: "shop", guard: "diplomat", coin: "coin", guide: "guild", water: "river" },
            african: { shelter: "savanna", guard: "elder", coin: "cowrie", guide: "ancestor", water: "well" },
            alien: { shelter: "station", guard: "drone", coin: "core", guide: "nexus", water: "plasma" }
        };

        const ctx = culturalShelterMap[culture] || culturalShelterMap.medieval;

        const templates = {
            0: [
                { s: "peace", v: "be", o: "you", eng: "Peace be with you." },
                { s: "I", v: "be", o: "person", eng: "I am a person of this land." },
                { s: "you", v: "speak", o: "word", eng: "You speak known words." },
                { s: "my", v: "be", o: "friend", eng: "My friend is here." },
                { s: "I", v: "know", o: "not", eng: "I do not know." }
            ],
            1: [
                { s: "where", v: "be", o: ctx.shelter, eng: `Where is the ${ctx.shelter}?` },
                { s: "I", v: "walk", o: ctx.guide, eng: `I walk towards the ${ctx.guide}.` },
                { s: "river", v: "be", o: "far", eng: "The river is far from here." },
                { s: "you", v: "see", o: "road", eng: "Do you see the right road?" },
                { s: "we", v: "stop", o: "here", eng: "We stop here immediately." }
            ],
            2: [
                { s: "I", v: "have", o: "hunger", eng: "I have hunger and need food." },
                { s: "where", v: "find", o: ctx.water, eng: `Where can I find ${ctx.water}?` },
                { s: "we", v: "need", o: ctx.shelter, eng: `We need a safe ${ctx.shelter} for night.` },
                { s: "food", v: "be", o: "good", eng: "This food is good." },
                { s: "I", v: "drink", o: "water", eng: "I wish to drink water." }
            ],
            3: [
                { s: "what", v: "cost", o: ctx.coin, eng: `How much ${ctx.coin} does this cost?` },
                { s: "I", v: "take", o: "trade", eng: "I take this trade item." },
                { s: "you", v: "give", o: ctx.coin, eng: `You give the ${ctx.coin}.` },
                { s: "this", v: "be", o: "great", eng: "This object is of great value." },
                { s: "I", v: "have", o: "no", eng: "I have no goods to trade." }
            ],
            4: [
                { s: "help", v: "be", o: "need", eng: "Help is needed immediately!" },
                { s: "call", v: "see", o: ctx.guard, eng: `Call the ${ctx.guard}!` },
                { s: "fire", v: "be", o: "danger", eng: "Fire brings great danger!" },
                { s: "I", v: "have", o: "blood", eng: "I am wounded and bleeding." },
                { s: "beast", v: "run", o: "fast", eng: "The wild beast runs fast!" }
            ],
            5: [
                { s: "sun", v: "be", o: "bright", eng: "The sun is bright today." },
                { s: "night", v: "be", o: "cold", eng: "The night is cold and dark." },
                { s: "you", v: "be", o: "wise", eng: "You are a wise person." },
                { s: "we", v: "live", o: "peace", eng: "We live in peace together." },
                { s: "day", v: "come", o: "fast", eng: "A new day comes fast." }
            ]
        };

        const pool = templates[categoryIndex] || templates[0];

        for (let i = 0; i < count; i++) {
            const baseObj = pool[i % pool.length];
            
            const getLex = (key) => {
                const found = this.lexiconMap.get(key.toLowerCase());
                return found || this.generatePhonotacticWord(2, false, false);
            };

            let sTerm = getLex(baseObj.s);
            let vTerm = getLex(baseObj.v);
            let oTerm = getLex(baseObj.o);

            // APPLICAZIONE MARCATORE DEL SOGGETTO AL SOGGETTO
            if (this.currentConfig.grammarStrategy === 'cases') {
                sTerm += caseSuffix;
            }

            if (this.currentConfig.morphologyType === 'agglutinative' && Math.random() > 0.6) {
                vTerm = vTerm + '-' + suffix;
            }

            // APPLICAZIONE RIGIDA DELL'ORDINE DEI COSTITUENTI SELEZIONATO
            let cWords = [];
            for (let char of wordOrder) { // Esempio: wordOrder = "VOS" -> char = 'V', poi 'O', poi 'S'
                if (char === 'S') cWords.push(sTerm);
                if (char === 'V') cWords.push(vTerm);
                if (char === 'O') cWords.push(oTerm);
            }

            if (articles.definite && Math.random() > 0.5) {
                cWords.unshift(articles.definite);
            }

            const conlangStr = cWords.join(' ');
            phrases.push({
                conlang: conlangStr.charAt(0).toUpperCase() + conlangStr.slice(1) + '.',
                english: baseObj.eng
            });
        }

        return phrases;
    }

    buildDataset(config) {
        this.currentConfig = config;
        this.usedWords.clear();
        this.lexiconMap.clear();

        const langName = this.generateLanguageName();

        let resolvedSociology = config.sociology;
        if (config.sociology === 'egalitarian') {
            resolvedSociology = 'Tribal / Communal Egalitarianism (Deictic Focus)';
        }

        // Generazione casuale/procedurale dell'ordine delle parole per questa lingua
        const wordOrderPermutations = ['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV'];
        const wordOrder = wordOrderPermutations[Math.floor(Math.random() * wordOrderPermutations.length)];

        const prefix = this.generatePhonotacticWord(1, true);
        const suffix = this.generatePhonotacticWord(1, true);
        const caseSuffix = this.generatePhonotacticWord(1, true);

        const affixSemantics = {
            prefix: { form: prefix, meaning: "Agentive / Nominalizer (actor)" },
            suffix: { form: suffix, meaning: "Intensive / Augmentative (great / major state)" }
        };

        const articles = {};
        if (config.articleMode === 'both' || config.articleMode === 'definite_only' || config.articleMode === 'partitive') {
            articles.definite = this.generatePhonotacticWord(1, true);
        }
        if (config.articleMode === 'both' || config.articleMode === 'indefinite_only' || config.articleMode === 'partitive') {
            articles.indefinite = this.generatePhonotacticWord(1, true);
        }
        if (config.articleMode === 'partitive') {
            articles.partitive = this.generatePhonotacticWord(1, true);
        }

        const vocabulary = [];

        const registerWord = (english, category, isGrammatical = false, isCore = false) => {
            const syllables = isGrammatical ? 1 : (isCore ? 1 : config.meanLength + (this.boxMullerRandom() * config.stdDev));
            const conlangWord = this.generatePhonotacticWord(syllables, isGrammatical, isCore);
            const entry = { conlang: conlangWord, english: english, category: category };
            vocabulary.push(entry);
            const key = english.toLowerCase().split('(')[0].trim();
            this.lexiconMap.set(key, conlangWord);
            return conlangWord;
        };

        // 1. STRUTTURALI E PRONOMI
        if (articles.definite) registerWord("the (definite article)", "Article", true);
        if (articles.indefinite) registerWord("a / an (indefinite article)", "Article", true);
        if (articles.partitive) registerWord("some / part of (partitive article)", "Article", true);
        if (config.grammarStrategy === 'cases') registerWord("[Nominative Subject Suffix]", "Case Suffix", true);

        ContextualLexicon.pronouns.forEach(p => registerWord(p, "Pronoun", true));
        ContextualLexicon.possessives.forEach(p => registerWord(p, "Possessive", true));
        ContextualLexicon.grammatical.forEach(g => registerWord(g, "Grammatical Word", true));

        // 2. RADICI PRIMORDIALI
        ContextualLexicon.coreNouns.forEach(cn => registerWord(cn, "Noun", false, true));
        ContextualLexicon.coreVerbs.forEach(cv => registerWord(cv, "Verb", false, true));

        // 3. DIZIONARIO ESTESO SENZA CLONI O NUMERI IN PARENTESI
        const culturalDomainTerms = ExpandedCulturalDomains[config.culture] || ExpandedCulturalDomains.medieval;
        
        const categories = [
            { type: 'Noun', concepts: [...ContextualLexicon.nouns, ...culturalDomainTerms] },
            { type: 'Verb', concepts: ContextualLexicon.verbs },
            { type: 'Adjective', concepts: ContextualLexicon.adjectives }
        ];

        let index = 0;
        while (vocabulary.length < 600) {
            const cat = categories[index % categories.length];
            const concept = cat.concepts[index % cat.concepts.length];
            
            // Registrazione pulita del termine specifico senza sufissi numerici astratti
            if (!this.lexiconMap.has(concept.toLowerCase())) {
                registerWord(concept, cat.type, false, false);
            } else {
                // Se i termini del sottoinsieme finiscono, genera un nuovo sostantivo/verbo composito semanticamente valido
                const altConcept = `${concept} ${cat.type === 'Noun' ? 'realm' : 'act'}`;
                registerWord(altConcept, cat.type, false, false);
            }
            index++;
        }

        // 4. GENERAZIONE DELLE 100 FRASI PROCEDURALI (CON VERO ALLINEAMENTO VOS/SOV/SVO)
        const sentenceCategories = [
            { title: "1. Greetings, Identity & Basic Interaction", count: 20 },
            { title: "2. Navigation, Movement & Directions", count: 20 },
            { title: "3. Primary Needs, Sustenance & Lodging", count: 20 },
            { title: "4. Trade, Commerce & Purchases", count: 15 },
            { title: "5. Emergencies, Health & Safety", count: 15 },
            { title: "6. Sociality & Small Talk", count: 10 }
        ];

        const sentences = [];
        sentenceCategories.forEach((catInfo, catIdx) => {
            const generatedPhrases = this.generateProceduralPhraseCategory(
                catIdx, catInfo.count, config.culture, wordOrder, articles, caseSuffix, suffix
            );
            generatedPhrases.forEach(p => {
                sentences.push({ ...p, sectionTitle: catInfo.title });
            });
        });

        // 5. GENERAZIONE DIALOGHI ADATTIVI
        const dialogues = [];
        for (let i = 0; i < 20; i++) {
            const dialogueLines = [];
            const turns = Math.floor(Math.random() * 3) + 2;
            const baseIdx = (i * 4) % sentences.length;

            for (let t = 0; t < turns; t++) {
                const speaker = t % 2 === 0 ? "Speaker A" : "Speaker B";
                const sentenceObj = sentences[(baseIdx + t) % sentences.length];
                dialogueLines.push({
                    speaker: speaker,
                    conlang: sentenceObj.conlang,
                    english: sentenceObj.english
                });
            }
            dialogues.push(dialogueLines);
        }

        const vowelsList = Phonetics.vowels[config.vowelSet] || Phonetics.vowels.standard;
        const consList = Phonetics.consonants[config.consonantSet] || Phonetics.consonants.balanced;

        const grammar = {
            languageName: langName,
            phonology: {
                vowelInventory: vowelsList,
                consonantInventory: consList,
                ipaVowels: vowelsList.map(v => Phonetics.ipaMap[v] || `/${v}/`),
                ipaConsonants: consList.map(c => Phonetics.ipaMap[c] || `/${c}/`),
                syllableStructures: SyllableStructures[config.aesthetic] || SyllableStructures.musical,
                phonotacticConstraints: `Mean Syllables: ${config.meanLength}, Std Dev: ${config.stdDev}. Monosyllables strictly reserved for grammatical words.`
            },
            morphology: {
                type: config.morphologyType === 'agglutinative' ? 'Agglutinative (Affix Stacking)' : 'Isolating / Fusional',
                derivationalAffixes: {
                    prefix: `${affixSemantics.prefix.form}- : ${affixSemantics.prefix.meaning}`,
                    suffix: `-${affixSemantics.suffix.form} : ${affixSemantics.suffix.meaning}`
                },
                inflectionalCases: config.grammarStrategy === 'cases' ? { nominativeSubjectSuffix: `-${caseSuffix} (Marks nominal subject strictly regardless of clause position)` } : 'None (Prepositional)'
            },
            syntax: {
                wordOrder: `${wordOrder} Order Alignment`,
                grammaticalRelations: config.grammarStrategy === 'cases' ? 'Case-Marked Suffixes' : 'Prepositional & Fixed Positional Order',
                articleSystem: articles
            },
            semanticsAndContext: {
                aestheticProfile: config.aesthetic,
                culturalProfile: config.culture,
                sociolinguisticContext: resolvedSociology
            }
        };

        this.lastGeneratedData = {
            metadata: {
                generatedAt: new Date().toISOString(),
                languageName: langName,
                configuration: { ...config, sociology: resolvedSociology, wordOrder }
            },
            grammar,
            vocabulary,
            sentences,
            dialogues
        };

        return this.lastGeneratedData;
    }
}

// UI Controller
document.addEventListener('DOMContentLoaded', () => {
    const engine = new ConlangEngine();

    const quickBtn = document.getElementById('quick-generate-btn');
    const customBtn = document.getElementById('custom-generate-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const titleBadge = document.getElementById('conlang-title-badge');

    const descPreset = document.getElementById('descriptive-preset');
    const cultPreset = document.getElementById('cultural-preset');
    const socioPreset = document.getElementById('sociological-preset');
    const meanLengthInput = document.getElementById('mean-length');
    const stdDevInput = document.getElementById('std-dev');
    const articleModeSelect = document.getElementById('article-mode');
    const morphologySelect = document.getElementById('morphology-type');
    const grammarStrategySelect = document.getElementById('grammar-strategy');
    const vowelPreset = document.getElementById('vowel-inventory');
    const consPreset = document.getElementById('consonant-inventory');

    function getFormConfig() {
        return {
            aesthetic: descPreset.value === 'custom' ? 'musical' : descPreset.value,
            culture: cultPreset.value,
            sociology: socioPreset.value,
            meanLength: parseFloat(meanLengthInput.value) || 2.5,
            stdDev: parseFloat(stdDevInput.value) || 0.8,
            articleMode: articleModeSelect.value,
            morphologyType: morphologySelect.value,
            grammarStrategy: grammarStrategySelect.value,
            vowelSet: vowelPreset.value,
            consonantSet: consPreset.value
        };
    }

    function renderOutput(data) {
        titleBadge.textContent = `Language: ${data.grammar.languageName}`;

        const grammarContainer = document.getElementById('grammar-container');
        const g = data.grammar;
        grammarContainer.innerHTML = `
            <div class="grammar-section">
                <h3>Systemic Summary: ${g.languageName}</h3>
                <div class="grammar-grid">
                    <div class="grammar-item">
                        <strong>Phonological Inventory:</strong><br>
                        Vowels: ${g.phonology.vowelInventory.join(', ')} (${g.phonology.ipaVowels.join(' ')})<br>
                        Consonants: ${g.phonology.consonantInventory.join(', ')} (${g.phonology.ipaConsonants.join(' ')})
                    </div>
                    <div class="grammar-item">
                        <strong>Phonotactics & Syllable Rules:</strong><br>
                        Structures: [${g.phonology.syllableStructures.join(', ')}]<br>
                        ${g.phonology.phonotacticConstraints}
                    </div>
                    <div class="grammar-item">
                        <strong>Morphology & Affixation:</strong><br>
                        Type: ${g.morphology.type}<br>
                        Prefix: <em>${g.morphology.derivationalAffixes.prefix}</em><br>
                        Suffix: <em>${g.morphology.derivationalAffixes.suffix}</em>
                    </div>
                    <div class="grammar-item">
                        <strong>Syntax & Word Order:</strong><br>
                        Constituent Alignment: <strong>${g.syntax.wordOrder}</strong><br>
                        Articles: ${Object.keys(g.syntax.articleSystem).length > 0 ? JSON.stringify(g.syntax.articleSystem) : 'None'}<br>
                        Sociolinguistics: <em>${g.semanticsAndContext.sociolinguisticContext}</em>
                    </div>
                </div>
            </div>
        `;

        const wordsContainer = document.getElementById('words-container');
        wordsContainer.innerHTML = data.vocabulary.map(item => `
            <div class="card">
                <span class="category-tag">${item.category}</span>
                <div class="conlang-word">${item.conlang}</div>
                <div class="translation">${item.english}</div>
            </div>
        `).join('');

        const sentencesContainer = document.getElementById('sentences-container');
        let sentencesHTML = '';
        let currentSection = '';

        data.sentences.forEach((item) => {
            if (item.sectionTitle !== currentSection) {
                currentSection = item.sectionTitle;
                sentencesHTML += `<div class="section-header">${currentSection}</div>`;
            }
            sentencesHTML += `
                <div class="card" style="margin-bottom: 0.6rem;">
                    <div class="conlang-word">${item.conlang}</div>
                    <div class="translation">${item.english}</div>
                </div>
            `;
        });
        sentencesContainer.innerHTML = sentencesHTML;

        const dialoguesContainer = document.getElementById('dialogues-container');
        dialoguesContainer.innerHTML = data.dialogues.map((dialogue, index) => `
            <div class="dialogue-box">
                <h4>Dialogue #${index + 1}</h4>
                ${dialogue.map(line => `
                    <div class="dialogue-line">
                        <span class="speaker">${line.speaker}:</span>${line.conlang}
                        <br><small class="translation">${line.english}</small>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    function executeGeneration(config) {
        const result = engine.buildDataset(config);
        renderOutput(result);
    }

    quickBtn.addEventListener('click', () => {
        const presets = ['musical', 'dark', 'magical', 'aquatic', 'harsh'];
        const cultures = ['medieval', 'ancient', 'primitive', 'renaissance', 'african', 'alien'];
        const articleModes = ['both', 'definite_only', 'indefinite_only', 'partitive', 'none'];
        
        const randomConfig = {
            aesthetic: presets[Math.floor(Math.random() * presets.length)],
            culture: cultures[Math.floor(Math.random() * cultures.length)],
            sociology: 'egalitarian',
            meanLength: 2.5,
            stdDev: 0.8,
            articleMode: articleModes[Math.floor(Math.random() * articleModes.length)],
            morphologyType: Math.random() > 0.5 ? 'agglutinative' : 'isolating',
            grammarStrategy: Math.random() > 0.5 ? 'cases' : 'prepositions',
            vowelSet: 'standard',
            consonantSet: 'balanced'
        };

        descPreset.value = randomConfig.aesthetic;
        cultPreset.value = randomConfig.culture;
        articleModeSelect.value = randomConfig.articleMode;
        morphologySelect.value = randomConfig.morphologyType;
        grammarStrategySelect.value = randomConfig.grammarStrategy;
        
        executeGeneration(randomConfig);
    });

    customBtn.addEventListener('click', () => {
        executeGeneration(getFormConfig());
    });

    exportJsonBtn.addEventListener('click', () => {
        if (!engine.lastGeneratedData) return;
        
        const jsonString = JSON.stringify(engine.lastGeneratedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${engine.lastGeneratedData.grammar.languageName.toLowerCase().replace(/\s+/g, '-')}-conlang.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    copyJsonBtn.addEventListener('click', () => {
        if (!engine.lastGeneratedData) return;
        
        const jsonString = JSON.stringify(engine.lastGeneratedData, null, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            const originalText = copyJsonBtn.textContent;
            copyJsonBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyJsonBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy JSON: ', err);
        });
    });

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    executeGeneration(getFormConfig());
});
