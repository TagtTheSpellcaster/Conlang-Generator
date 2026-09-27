/**
 * Conlang Engine Studio
 * Version: 3.0.0
 * Features: Complete Italian Phrasebook Corpus (No Phrase Loops), Sandhi Rules, Clean Lexicon Limit
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
        "savanna", "spirit", "ancestor", "drum", "elder", "drought", "well", "beast", "baobab",
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
        "moon", "water", "fire", "earth", "sky", "woman", "child", "king", "leader", "god", "spirit", 
        "sword", "shield", "trade", "gold", "house", "city", "star", "river", "tree", "animal", 
        "beast", "life", "death", "blood", "war", "peace", "food", "bread", "night", "day", 
        "shadow", "light", "stone", "iron", "wind", "sea", "mountain", "valley", "forest", 
        "rain", "storm", "ice", "road", "gate", "bridge", "tower", "ocean", "cloud", "field",
        "desert", "swamp", "island", "shore", "wave", "ash", "dust", "smoke", "flame", "spark",
        "leaf", "root", "seed", "flower", "fruit", "wood", "grass", "bird", "fish", "snake",
        "wolf", "bear", "deer", "eagle", "dragon", "body", "head", "eye", "hand", "foot",
        "heart", "bone", "flesh", "mind", "soul", "voice", "word", "name", "truth", "lie",
        "law", "rule", "order", "chaos", "time", "year", "month", "season", "winter", "summer",
        "springtime", "autumn", "morning", "evening", "dawn", "dusk", "silence", "sound", "song",
        "story", "dream", "hope", "fear", "pain", "joy", "grief", "love", "hatred", "courage",
        "wisdom", "strength", "power", "glory", "shame", "freedom", "bondage", "gift", "work",
        "rest", "sleep", "path", "border", "wall", "door", "window", "roof", "bed", "table",
        "cup", "blade", "bow", "arrow", "spear", "armor", "helm", "ring", "crown", "throne",
        "jewel", "silver", "copper", "bronze", "glass", "cloth", "rope", "wheel", "cart", "boat"
    ],
    verbs: [
        "run", "walk", "speak", "see", "hear", "fight", "build", "love", "hate", "eat",
        "drink", "sleep", "die", "live", "give", "take", "think", "know", "lead", "rule",
        "seek", "find", "call", "stop", "strike", "guard", "carry", "break", "bind", "fly",
        "stand", "sit", "lie down", "rise", "fall", "climb", "swim", "jump", "touch", "hold",
        "push", "pull", "throw", "catch", "cut", "burn", "freeze", "wash", "clean", "open",
        "close", "hide", "show", "seek out", "lose", "win", "learn", "teach", "forget", "remember",
        "ask", "answer", "say", "tell", "sing", "shout", "whisper", "listen", "watch", "read",
        "write", "draw", "make", "destroy", "heal", "harm", "help", "hinder", "buy", "sell",
        "pay", "steal", "protect", "attack", "surrender", "escape", "wait", "begin", "end", "continue"
    ],
    adjectives: [
        "great", "small", "bright", "dark", "strong", "weak", "old", "young", "good", "evil",
        "hot", "cold", "fast", "slow", "hard", "soft", "wise", "wild", "holy", "mortal",
        "clean", "safe", "cheap", "rich", "bound", "silent", "sharp", "heavy", "lightweight", "pure",
        "new", "ancient", "high", "low", "long", "short", "wide", "narrow", "deep", "shallow",
        "thick", "thin", "heavy-set", "full", "empty", "dry", "wet", "sweet", "bitter", "sour",
        "salty", "smooth", "rough", "clean-cut", "dirty", "true", "false", "calm", "fierce", "kind",
        "cruel", "brave", "cowardly", "proud", "humble", "noble", "common", "free", "captive", "alive",
        "dead", "sick", "healthy", "blind", "deaf", "mute", "sharp-eyed", "swift", "firm", "loose"
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

// Corpus frasi strutturato in italiano senza duplicati procedurali
const ItalianSentenceCorpus = [
    {
        sectionTitle: "1. Saluti e cortesia",
        phrases: [
            { s: "peace", v: "be", o: "you", ita: "Ciao.", art: "none" },
            { s: "sun", v: "be", o: "good", ita: "Buongiorno.", art: "none" },
            { s: "night", v: "be", o: "good", ita: "Buonasera.", art: "none" },
            { s: "I", v: "walk", o: "away", ita: "Arrivederci.", art: "none" },
            { s: "we", v: "see", o: "soon", ita: "A presto.", art: "none" },
            { s: "I", v: "ask", o: "favor", ita: "Per favore.", art: "none" },
            { s: "I", v: "give", o: "thanks", ita: "Grazie.", art: "none" },
            { s: "I", v: "give", o: "great thanks", ita: "Grazie mille.", art: "none" },
            { s: "you", v: "be", o: "welcome", ita: "Prego.", art: "none" },
            { s: "I", v: "ask", o: "pardon", ita: "Scusa / Mi scusi.", art: "none" },
            { s: "problem", v: "be", o: "not", ita: "Non c’è problema.", art: "none" },
            { s: "this", v: "be", o: "true", ita: "Sì.", art: "none" },
            { s: "this", v: "be", o: "false", ita: "No.", art: "none" },
            { s: "all", v: "be", o: "good", ita: "Va bene.", art: "none" },
            { s: "I", v: "bind", o: "word", ita: "D’accordo.", art: "none" }
        ]
    },
    {
        sectionTitle: "2. Comunicazione di base",
        phrases: [
            { s: "I", v: "know", o: "not", ita: "Non capisco.", art: "none" },
            { s: "I", v: "know", o: "truth", ita: "Capisco.", art: "none" },
            { s: "I", v: "speak", o: "bad", ita: "Non parlo bene questa lingua.", art: "none" },
            { s: "you", v: "speak", o: "word", ita: "Parli la lingua?", art: "none" },
            { s: "you", v: "speak", o: "slow", ita: "Parla più lentamente, per favore.", art: "none" },
            { s: "you", v: "say", o: "again", ita: "Può ripetere?", art: "none" },
            { s: "you", v: "say", o: "again", ita: "Puoi ripetere?", art: "none" },
            { s: "what", v: "be", o: "meaning", ita: "Cosa significa?", art: "none" },
            { s: "how", v: "say", o: "word", ita: "Come si dice questo?", art: "none" },
            { s: "how", v: "sound", o: "word", ita: "Come si pronuncia?", art: "none" },
            { s: "you", v: "write", o: "it", ita: "Puoi scriverlo?", art: "none" },
            { s: "I", v: "hear", o: "not", ita: "Non ho capito.", art: "none" },
            { s: "I", v: "hear", o: "word", ita: "Ho capito.", art: "none" },
            { s: "I", v: "know", o: "nothing", ita: "Non lo so.", art: "none" },
            { s: "I", v: "be", o: "not sure", ita: "Non sono sicuro.", art: "none" }
        ]
    },
    {
        sectionTitle: "3. Identità e informazioni personali",
        phrases: [
            { s: "my", v: "be", o: "name", ita: "Mi chiamo così.", art: "none" },
            { s: "what", v: "be", o: "name", ita: "Come ti chiami?", art: "none" },
            { s: "I", v: "come", o: "far", ita: "Sono di un altro luogo.", art: "none" },
            { s: "where", v: "come", o: "you", ita: "Da dove vieni?", art: "none" },
            { s: "I", v: "live", o: "here", ita: "Vivo qui.", art: "none" },
            { s: "I", v: "be", o: "traveler", ita: "Sono un viaggiatore.", art: "indefinite" },
            { s: "I", v: "work", o: "here", ita: "Sono qui per lavoro.", art: "none" },
            { s: "I", v: "stay", o: "day", ita: "Sono qui per qualche giorno.", art: "none" },
            { s: "I", v: "need", o: "help", ita: "Ho bisogno di aiuto.", art: "none" },
            { s: "you", v: "help", o: "me", ita: "Puoi aiutarmi?", art: "none" }
        ]
    },
    {
        sectionTitle: "4. Orientamento",
        phrases: [
            { s: "where", v: "be", o: "place", ita: "Dov’è il luogo?", art: "definite" },
            { s: "where", v: "be", o: "water", ita: "Dov’è il bagno?", art: "definite" },
            { s: "where", v: "be", o: "road", ita: "Dov’è la stazione?", art: "definite" },
            { s: "where", v: "be", o: "trade", ita: "Dov’è il mercato?", art: "definite" },
            { s: "where", v: "be", o: "gate", ita: "Dov’è l’uscita?", art: "definite" },
            { s: "where", v: "be", o: "door", ita: "Dov’è l’ingresso?", art: "definite" },
            { s: "it", v: "be", o: "far", ita: "È lontano?", art: "none" },
            { s: "it", v: "be", o: "near", ita: "È vicino?", art: "none" },
            { s: "road", v: "be", o: "where", ita: "A destra o a sinistra?", art: "none" },
            { s: "I", v: "walk", o: "this road", ita: "Devo andare da questa parte?", art: "none" },
            { s: "I", v: "be", o: "good road", ita: "Sono sulla strada giusta?", art: "none" },
            { s: "time", v: "be", o: "how much", ita: "Quanto tempo ci vuole?", art: "none" },
            { s: "you", v: "show", o: "map", ita: "Puoi mostrarmelo sulla mappa?", art: "none" },
            { s: "you", v: "walk", o: "me", ita: "Accompagnami, per favore.", art: "none" },
            { s: "I", v: "be", o: "lost", ita: "Mi sono perso.", art: "none" }
        ]
    },
    {
        sectionTitle: "5. Cibo e acqua",
        phrases: [
            { s: "I", v: "have", o: "hunger", ita: "Ho fame.", art: "none" },
            { s: "I", v: "have", o: "thirst", ita: "Ho sete.", art: "none" },
            { s: "I", v: "eat", o: "food", ita: "Vorrei mangiare.", art: "none" },
            { s: "I", v: "drink", o: "water", ita: "Vorrei bere.", art: "none" },
            { s: "I", v: "need", o: "water", ita: "Vorrei dell’acqua.", art: "partitive" },
            { s: "you", v: "have", o: "food", ita: "Avete del cibo?", art: "none" },
            { s: "food", v: "be", o: "safe", ita: "È commestibile?", art: "none" },
            { s: "it", v: "be", o: "good", ita: "È sicuro da mangiare?", art: "none" },
            { s: "I", v: "eat", o: "not", ita: "Non mangio questo.", art: "none" },
            { s: "food", v: "make", o: "sick", ita: "Sono allergico a questo.", art: "none" },
            { s: "what", v: "be", o: "cost", ita: "Quanto costa?", art: "none" },
            { s: "I", v: "pay", o: "now", ita: "Il conto, per favore.", art: "none" },
            { s: "this", v: "be", o: "all", ita: "È tutto qui?", art: "none" },
            { s: "I", v: "take", o: "more", ita: "Posso avere ancora di questo?", art: "none" },
            { s: "food", v: "be", o: "good", ita: "È buono.", art: "none" }
        ]
    },
    {
        sectionTitle: "6. Alloggio e viaggio",
        phrases: [
            { s: "I", v: "need", o: "house", ita: "Ho bisogno di una stanza.", art: "indefinite" },
            { s: "you", v: "have", o: "room", ita: "Avete una stanza libera?", art: "indefinite" },
            { s: "what", v: "cost", o: "night", ita: "Quanto costa una notte?", art: "none" },
            { s: "I", v: "have", o: "word", ita: "Ho una prenotazione.", art: "indefinite" },
            { s: "where", v: "be", o: "room", ita: "Dov’è la mia stanza?", art: "none" },
            { s: "when", v: "leave", o: "ship", ita: "A che ora parte?", art: "definite" },
            { s: "when", v: "come", o: "ship", ita: "A che ora arriva?", art: "definite" },
            { s: "where", v: "be", o: "stop", ita: "Dov’è la fermata?", art: "definite" },
            { s: "I", v: "buy", o: "ticket", ita: "Un biglietto per questo luogo, per favore.", art: "indefinite" },
            { s: "I", v: "stop", o: "here", ita: "Devo scendere qui?", art: "none" },
            { s: "ship", v: "go", o: "there", ita: "Questo va in quel luogo?", art: "none" },
            { s: "time", v: "be", o: "long", ita: "Quanto dura il viaggio?", art: "none" }
        ]
    },
    {
        sectionTitle: "7. Denaro e acquisti",
        phrases: [
            { s: "what", v: "be", o: "price", ita: "Quanto costa?", art: "none" },
            { s: "price", v: "be", o: "high", ita: "È troppo caro.", art: "none" },
            { s: "you", v: "have", o: "cheap", ita: "Avete qualcosa di più economico?", art: "none" },
            { s: "I", v: "buy", o: "this", ita: "Vorrei comprarlo.", art: "none" },
            { s: "I", v: "buy", o: "not", ita: "Non voglio comprarlo.", art: "none" },
            { s: "I", v: "pay", o: "coin", ita: "Posso pagare con la carta / moneta?", art: "none" },
            { s: "you", v: "have", o: "coin", ita: "Avete il resto?", art: "none" },
            { s: "coin", v: "be", o: "wrong", ita: "Mi avete dato il resto sbagliato.", art: "none" }
        ]
    },
    {
        sectionTitle: "8. Emergenze",
        phrases: [
            { s: "help", v: "come", o: "now", ita: "Aiuto!", art: "none" },
            { s: "call", v: "see", o: "person", ita: "Chiamate qualcuno!", art: "none" },
            { s: "call", v: "see", o: "guard", ita: "Chiamate la guardia!", art: "definite" },
            { s: "call", v: "see", o: "healer", ita: "Chiamate un medico!", art: "indefinite" },
            { s: "call", v: "see", o: "cart", ita: "Chiamate un'ambulanza!", art: "indefinite" },
            { s: "I", v: "be", o: "hurt", ita: "Sono ferito.", art: "none" },
            { s: "body", v: "be", o: "bad", ita: "Mi sento male.", art: "none" },
            { s: "thief", v: "take", o: "gold", ita: "Mi hanno derubato.", art: "none" },
            { s: "I", v: "lose", o: "this", ita: "Ho perso questo oggetto.", art: "none" },
            { s: "I", v: "be", o: "danger", ita: "Sono in pericolo.", art: "none" }
        ]
    }
];

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

    applySandhi(word) {
        if (!word || word.length < 2) return word;

        let res = word;

        // Sandhi Interno 1: Fusione di vocali adiacenti identiche (es. aa -> a)
        res = res.replace(/([aeiouyøæ])\1+/gi, '$1');

        // Sandhi Interno 2: Eliminazione di tripli nessi consonantici
        res = res.replace(/([bcdfghjklmnpqrstvwxz])\1{2,}/gi, '$1$1');

        // Sandhi Interno 3: Assimilazione nasale regressiva (np -> mp, nk -> ngk)
        res = res.replace(/np/g, 'mp').replace(/nb/g, 'mb').replace(/nk/g, 'ngk');

        // Sandhi Interno 4: Inserimento epentetico per evitare iato vocalico diretto
        res = res.replace(/ia/g, 'iya').replace(/ua/g, 'uwa').replace(/eo/g, 'eyo');

        return res;
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

        let rawWord = '';
        let processedWord = '';
        let attempts = 0;

        do {
            rawWord = '';
            for (let i = 0; i < numSyllables; i++) {
                const struct = structures[Math.floor(Math.random() * structures.length)];
                for (let char of struct) {
                    if (char === 'C') {
                        rawWord += consonants[Math.floor(Math.random() * consonants.length)];
                    } else if (char === 'V') {
                        rawWord += vowels[Math.floor(Math.random() * vowels.length)];
                    }
                }
            }
            
            processedWord = this.applySandhi(rawWord);
            attempts++;

            if (attempts > 150) {
                processedWord += attempts;
                break;
            }
        } while (this.usedWords.has(processedWord) || processedWord.length < 2);

        this.usedWords.add(processedWord);
        return processedWord;
    }

    generateMarkov2ndOrderWord() {
        if (!this.lastGeneratedData || !this.lastGeneratedData.vocabulary || this.lastGeneratedData.vocabulary.length === 0) {
            return this.generatePhonotacticWord(2);
        }

        const corpus = this.lastGeneratedData.vocabulary.map(v => v.conlang.toLowerCase());
        const transitions = {};
        const starters = [];

        corpus.forEach(word => {
            if (word.length >= 2) {
                starters.push(word.slice(0, 2));
            }
            const padded = '^' + word + '$';
            for (let i = 0; i < padded.length - 2; i++) {
                const state = padded.slice(i, i + 2);
                const nextChar = padded[i + 2];
                if (!transitions[state]) transitions[state] = [];
                transitions[state].push(nextChar);
            }
        });

        let generated = '';
        let attempts = 0;

        do {
            let currentState = '^' + (starters[Math.floor(Math.random() * starters.length)] || 'ba')[0];
            generated = currentState.replace('^', '');

            while (generated.length < 12) {
                const choices = transitions[currentState];
                if (!choices || choices.length === 0) break;
                
                const next = choices[Math.floor(Math.random() * choices.length)];
                if (next === '$') break;
                
                generated += next;
                currentState = currentState[1] + next;
            }

            generated = this.applySandhi(generated);
            attempts++;
            if (attempts > 100) break;

        } while (generated.length < 2 || this.usedWords.has(generated));

        if (generated.length < 2) {
            generated = this.generatePhonotacticWord(2);
        } else {
            this.usedWords.add(generated);
        }

        return generated;
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

    buildClause(sKey, vKey, oKey, wordOrder, articles, caseSuffix, suffix, forceArticle = null) {
        const getLex = (key) => {
            const found = this.lexiconMap.get(key.toLowerCase());
            return found || this.generatePhonotacticWord(2, false, false);
        };

        let sTerm = getLex(sKey);
        let vTerm = getLex(vKey);
        let oTerm = getLex(oKey);

        if (this.currentConfig.grammarStrategy === 'cases') {
            sTerm = this.applySandhi(sTerm + caseSuffix);
        }

        if (this.currentConfig.morphologyType === 'agglutinative' && Math.random() > 0.6) {
            vTerm = this.applySandhi(vTerm + suffix);
        }

        let cWords = [];
        for (let char of wordOrder) {
            if (char === 'S') cWords.push(sTerm);
            if (char === 'V') cWords.push(vTerm);
            if (char === 'O') cWords.push(oTerm);
        }

        if (forceArticle === 'definite' && articles.definite) {
            cWords.unshift(articles.definite);
        } else if (forceArticle === 'indefinite' && articles.indefinite) {
            cWords.unshift(articles.indefinite);
        } else if (forceArticle === 'partitive' && articles.partitive) {
            cWords.unshift(articles.partitive);
        }

        const conlangStr = this.applySandhi(cWords.join(' '));
        return conlangStr.charAt(0).toUpperCase() + conlangStr.slice(1) + '.';
    }

    generateCorpusSentences(wordOrder, articles, caseSuffix, suffix) {
        const sentences = [];

        ItalianSentenceCorpus.forEach(cat => {
            cat.phrases.forEach(item => {
                const conlangStr = this.buildClause(
                    item.s, item.v, item.o, wordOrder, articles, caseSuffix, suffix, item.art
                );
                sentences.push({
                    conlang: conlangStr,
                    english: item.ita,
                    sectionTitle: cat.sectionTitle
                });
            });
        });

        return sentences;
    }

    generateNarrativeDialogues(culture, wordOrder, articles, caseSuffix, suffix) {
        const dialogCategories = [
            {
                categoryTitle: "Control & Suspicion",
                topics: [
                    {
                        title: "1. Checkpoint / Border Control",
                        A1: { s: "you", v: "stop", o: "gate", eng: "Halt! State your purpose at the gate.", art: "definite" },
                        B1: { s: "I", v: "carry", o: "trade", eng: "I carry peaceful trade goods for the market.", art: "none" },
                        A2: { s: "you", v: "show", o: "seal", eng: "Show me a valid seal or pass.", art: "indefinite" },
                        B2: { s: "I", v: "give", o: "coin", eng: "Here is the seal and my tribute.", art: "definite" }
                    },
                    {
                        title: "2. Tavern / Inn Contact",
                        A1: { s: "you", v: "sit", o: "shadow", eng: "Why do you sit alone in the shadow?", art: "definite" },
                        B1: { s: "I", v: "seek", o: "guide", eng: "I seek a silent guide for the road.", art: "indefinite" },
                        A2: { s: "I", v: "know", o: "path", eng: "I know the dangerous path very well.", art: "definite" },
                        B2: { s: "we", v: "drink", o: "water", eng: "Then let us drink together and agree.", art: "none" }
                    },
                    {
                        title: "3. Encounter in the Wilds / Outer Space",
                        A1: { s: "who", v: "walk", o: "border", eng: "Who walks across our outer border?", art: "none" },
                        B1: { s: "we", v: "be", o: "traveler", eng: "We are lost travelers from afar.", art: "none" },
                        A2: { s: "you", v: "have", o: "weapon", eng: "Lower your weapon at once!", art: "indefinite" },
                        B2: { s: "I", v: "bind", o: "sword", eng: "I sheath my blade in peace.", art: "none" }
                    },
                    {
                        title: "4. Interrogation",
                        A1: { s: "you", v: "speak", o: "truth", eng: "Speak the truth! Who sent you here?", art: "definite" },
                        B1: { s: "I", v: "serve", o: "no", eng: "I serve no lord or enemy.", art: "none" },
                        A2: { s: "you", v: "hide", o: "gold", eng: "Why do you hide this stolen gold?", art: "this" },
                        B2: { s: "I", v: "find", o: "earth", eng: "I found it buried in the earth.", art: "none" }
                    }
                ]
            },
            {
                categoryTitle: "Commerce & Resources",
                topics: [
                    {
                        title: "5. Artifact / Technology Negotiation",
                        A1: { s: "I", v: "sell", o: "relic", eng: "I sell a rare ancient relic.", art: "indefinite" },
                        B1: { s: "this", v: "be", o: "old", eng: "Is this item truly authentic?", art: "none" },
                        A2: { s: "I", v: "swear", o: "power", eng: "I swear by its great power.", art: "none" },
                        B2: { s: "I", v: "give", o: "coin", eng: "I give you three coins for it.", art: "none" }
                    },
                    {
                        title: "6. Mount / Transport Rental",
                        A1: { s: "I", v: "need", o: "horse", eng: "I need a fast horse for three days.", art: "indefinite" },
                        B1: { s: "you", v: "pay", o: "gold", eng: "You must pay gold in advance.", art: "none" },
                        A2: { s: "horse", v: "be", o: "strong", eng: "Is the beast strong and healthy?", art: "definite" },
                        B2: { s: "beast", v: "run", o: "wind", eng: "The beast runs faster than the wind.", art: "definite" }
                    },
                    {
                        title: "7. Black Market / Fencer",
                        A1: { s: "you", v: "buy", o: "iron", eng: "Do you buy unregistered iron and goods?", art: "none" },
                        B1: { s: "I", v: "take", o: "all", eng: "I take all goods for the right price.", art: "none" },
                        A2: { s: "price", v: "be", o: "low", eng: "Your price is too low for this.", art: "definite" },
                        B2: { s: "I", v: "add", o: "bread", eng: "I add food and shelter to the deal.", art: "none" }
                    },
                    {
                        title: "8. Tax & Tribute Payment",
                        A1: { s: "king", v: "demand", o: "tithe", eng: "The authority demands the annual tithe.", art: "definite" },
                        B1: { s: "drought", v: "break", o: "crop", eng: "The drought broke our crops this year.", art: "definite" },
                        A2: { s: "you", v: "pay", o: "now", eng: "You must pay or face the guard.", art: "none" },
                        B2: { s: "we", v: "yield", o: "gold", eng: "We yield our last gold to survive.", art: "none" }
                    }
                ]
            },
            {
                categoryTitle: "Alliances & Diplomacy",
                topics: [
                    {
                        title: "9. Mercenary / Vassal Oath",
                        A1: { s: "I", v: "pledge", o: "sword", eng: "I pledge my sword to your house.", art: "none" },
                        B1: { s: "you", v: "fight", o: "war", eng: "Will you fight in our dark war?", art: "none" },
                        A2: { s: "I", v: "die", o: "honor", eng: "I shall die for honor and duty.", art: "none" },
                        B2: { s: "you", v: "receive", o: "shield", eng: "You receive our shield and crown.", art: "none" }
                    },
                    {
                        title: "10. Audience with Chief / Authority",
                        A1: { s: "I", v: "bring", o: "word", eng: "I bring word from the distant tribe.", art: "indefinite" },
                        B1: { s: "chief", v: "hear", o: "you", eng: "The leader listens to your message.", art: "definite" },
                        A2: { s: "enemy", v: "build", o: "fort", eng: "The enemy builds a strong fort.", art: "indefinite" },
                        B2: { s: "we", v: "gather", o: "lance", eng: "We must gather our warriors today.", art: "none" }
                    },
                    {
                        title: "11. Secret Pact / Agreement",
                        A1: { s: "nobody", v: "hear", o: "us", eng: "No one must hear our plan.", art: "none" },
                        B1: { s: "night", v: "keep", o: "secret", eng: "The night keeps our secret safe.", art: "definite" },
                        A2: { s: "we", v: "strike", o: "dawn", eng: "We strike the gate at dawn.", art: "definite" },
                        B2: { s: "I", v: "give", o: "hand", eng: "I give my hand upon this vow.", art: "none" }
                    },
                    {
                        title: "12. Departure before Mission",
                        A1: { s: "ship", v: "sail", o: "now", eng: "The ship sails into the void now.", art: "definite" },
                        B1: { s: "god", v: "guard", o: "you", eng: "May the spirits guard your journey.", art: "none" },
                        A2: { s: "I", v: "return", o: "peace", eng: "I shall return with peace.", art: "none" },
                        B2: { s: "we", v: "wait", o: "here", eng: "We wait for your signal here.", art: "none" }
                    }
                ]
            },
            {
                categoryTitle: "Knowledge & Health",
                topics: [
                    {
                        title: "13. Oracle / Data Archive Consultation",
                        A1: { s: "oracle", v: "see", o: "future", eng: "Does the archive reveal the future?", art: "definite" },
                        B1: { s: "shadow", v: "cover", o: "sky", eng: "A great shadow covers the sky.", art: "indefinite" },
                        A2: { s: "how", v: "stop", o: "death", eng: "How can we stop the coming death?", art: "none" },
                        B2: { s: "find", v: "seek", o: "relic", eng: "Seek the holy relic in the cave.", art: "definite" }
                    },
                    {
                        title: "14. Apprentice & Master",
                        A1: { s: "I", v: "fail", o: "lesson", eng: "Master, I failed the ritual.", art: "definite" },
                        B1: { s: "you", v: "need", o: "focus", eng: "You need patience and focus.", art: "none" },
                        A2: { s: "mind", v: "be", o: "weak", eng: "My mind feels weak today.", art: "none" },
                        B2: { s: "practice", v: "make", o: "strong", eng: "Constant practice makes you strong.", art: "none" }
                    },
                    {
                        title: "15. Healer / Physician",
                        A1: { s: "healer", v: "save", o: "child", eng: "Healer, save my sick child!", art: "none" },
                        B1: { s: "child", v: "have", o: "fever", eng: "The child has a burning fever.", art: "indefinite" },
                        A2: { s: "you", v: "have", o: "medicine", eng: "Do you have a potent medicine?", art: "indefinite" },
                        B2: { s: "drink", v: "this", o: "herb", eng: "Drink this crushed herb with water.", art: "this" }
                    },
                    {
                        title: "16. Analysis of Mysterious Object",
                        A1: { s: "what", v: "be", o: "stone", eng: "What is this glowing stone?", art: "this" },
                        B1: { s: "it", v: "burn", o: "light", eng: "It burns with unnatural light.", art: "indefinite" },
                        A2: { s: "it", v: "be", o: "magic", eng: "Is it magical or dangerous?", art: "none" },
                        B2: { s: "touch", v: "it", o: "not", eng: "Do not touch it with bare hands!", art: "none" }
                    }
                ]
            },
            {
                categoryTitle: "Tension & Action",
                topics: [
                    {
                        title: "17. Lookout Alarm (Monster / Enemy)",
                        A1: { s: "lookout", v: "see", o: "beast", eng: "The lookout sees a giant beast!", art: "indefinite" },
                        B1: { s: "it", v: "come", o: "wall", eng: "It approaches the city wall!", art: "definite" },
                        A2: { s: "sound", v: "horn", o: "now", eng: "Sound the alarm horn now!", art: "definite" },
                        B2: { s: "warrior", v: "take", o: "bow", eng: "Warriors, take your bows!", art: "none" }
                    },
                    {
                        title: "18. Provocation & Challenge",
                        A1: { s: "you", v: "insult", o: "honor", eng: "You dare insult my honor?", art: "none" },
                        B1: { s: "I", v: "fear", o: "you", eng: "I do not fear your empty words.", art: "none" },
                        A2: { s: "we", v: "fight", o: "duel", eng: "Then we fight a duel at noon!", art: "indefinite" },
                        B2: { s: "steel", v: "decide", o: "fate", eng: "Let steel decide our fate.", art: "none" }
                    },
                    {
                        title: "19. Evacuation / Escape Order",
                        A1: { s: "fire", v: "destroy", o: "house", eng: "The fire destroys our house!", art: "definite" },
                        B1: { s: "all", v: "run", o: "river", eng: "Everyone, run to the river!", art: "definite" },
                        A2: { s: "leave", v: "gold", o: "behind", eng: "Leave all gold and heavy items!", art: "none" },
                        B2: { s: "we", v: "save", o: "life", eng: "We must save our lives first.", art: "none" }
                    },
                    {
                        title: "20. Enemy Surrender",
                        A1: { s: "we", v: "break", o: "shield", eng: "We broke your last shield!", art: "none" },
                        B1: { s: "we", v: "surrender", o: "city", eng: "We surrender the city to you.", art: "definite" },
                        A2: { s: "lay", v: "sword", o: "ground", eng: "Lay your swords upon the ground.", art: "none" },
                        B2: { s: "show", v: "mercy", o: "us", eng: "Show mercy to our people.", art: "none" }
                    }
                ]
            }
        ];

        const dialogues = [];

        dialogCategories.forEach(cat => {
            cat.topics.forEach(t => {
                const lines = [
                    { speaker: "Speaker A", conlang: this.buildClause(t.A1.s, t.A1.v, t.A1.o, wordOrder, articles, caseSuffix, suffix, t.A1.art), english: t.A1.eng },
                    { speaker: "Speaker B", conlang: this.buildClause(t.B1.s, t.B1.v, t.B1.o, wordOrder, articles, caseSuffix, suffix, t.B1.art), english: t.B1.eng },
                    { speaker: "Speaker A", conlang: this.buildClause(t.A2.s, t.A2.v, t.A2.o, wordOrder, articles, caseSuffix, suffix, t.A2.art), english: t.A2.eng },
                    { speaker: "Speaker B", conlang: this.buildClause(t.B2.s, t.B2.v, t.B2.o, wordOrder, articles, caseSuffix, suffix, t.B2.art), english: t.B2.eng }
                ];

                dialogues.push({
                    category: cat.categoryTitle,
                    title: t.title,
                    lines: lines
                });
            });
        });

        return dialogues;
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

        const wordOrderPermutations = ['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV'];
        const wordOrder = wordOrderPermutations[Math.floor(Math.random() * wordOrderPermutations.length)];

        const prefix = this.generatePhonotacticWord(1, true);
        const suffix = this.generatePhonotacticWord(1, true);
        const caseSuffix = this.generatePhonotacticWord(1, true);

        const pretendPrefix = this.generatePhonotacticWord(1, true);
        const tryPrefix = this.generatePhonotacticWord(1, true);
        const causeSuffix = this.generatePhonotacticWord(1, true);

        const affixSemantics = {
            prefix: { form: prefix, meaning: "Agentive / Nominalizer (actor)" },
            suffix: { form: suffix, meaning: "Intensive / Augmentative (great / major state)" }
        };

        const aspectModifiers = {
            simulativePretend: `${pretendPrefix}- (Simulative / 'to pretend to')`,
            conativeTry: `${tryPrefix}- (Conative / 'to try to')`,
            causative: `-${causeSuffix} (Causative / 'to cause to')`
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
            const key = english.toLowerCase().trim();
            if (this.lexiconMap.has(key)) return this.lexiconMap.get(key);

            const syllables = isGrammatical ? 1 : (isCore ? 1 : config.meanLength + (this.boxMullerRandom() * config.stdDev));
            const conlangWord = this.generatePhonotacticWord(syllables, isGrammatical, isCore);
            
            const entry = { conlang: conlangWord, english: english, category: category };
            vocabulary.push(entry);
            this.lexiconMap.set(key, conlangWord);
            return conlangWord;
        };

        if (articles.definite) this.lexiconMap.set("the", articles.definite);
        if (articles.indefinite) this.lexiconMap.set("a", articles.indefinite);
        if (articles.partitive) this.lexiconMap.set("some", articles.partitive);

        ContextualLexicon.pronouns.forEach(p => registerWord(p, "Pronoun", true));
        ContextualLexicon.possessives.forEach(p => registerWord(p, "Possessive", true));
        ContextualLexicon.grammatical.forEach(g => registerWord(g, "Grammatical Word", true));

        ContextualLexicon.coreNouns.forEach(cn => registerWord(cn, "Noun", false, true));
        ContextualLexicon.coreVerbs.forEach(cv => registerWord(cv, "Verb", false, true));

        const culturalDomainTerms = ExpandedCulturalDomains[config.culture] || ExpandedCulturalDomains.medieval;
        
        const poolNouns = [...ContextualLexicon.nouns, ...culturalDomainTerms];
        const poolVerbs = ContextualLexicon.verbs;
        const poolAdjectives = ContextualLexicon.adjectives;

        poolNouns.forEach(n => registerWord(n, "Noun", false, false));
        poolVerbs.forEach(v => registerWord(v, "Verb", false, false));
        poolAdjectives.forEach(a => registerWord(a, "Adjective", false, false));

        // Generazione delle frasi usando rigorosamente il corpus italiano senza ripetizioni
        const sentences = this.generateCorpusSentences(wordOrder, articles, caseSuffix, suffix);

        const dialogues = this.generateNarrativeDialogues(config.culture, wordOrder, articles, caseSuffix, suffix);

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
                phonotacticConstraints: `Mean Syllables: ${config.meanLength}, Std Dev: ${config.stdDev}. Monosyllables strictly reserved for grammatical words. Sandhi Rules applied.`
            },
            morphology: {
                type: config.morphologyType === 'agglutinative' ? 'Agglutinative (Affix Stacking)' : 'Isolating / Fusional',
                derivationalAffixes: {
                    prefix: `${affixSemantics.prefix.form}- : ${affixSemantics.prefix.meaning}`,
                    suffix: `-${affixSemantics.suffix.form} : ${affixSemantics.suffix.meaning}`
                },
                aspectAndMoodDerivation: aspectModifiers,
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

// Controllo dell'Interfaccia Utente e Gestore Eventi Modale
document.addEventListener('DOMContentLoaded', () => {
    const engine = new ConlangEngine();

    const quickBtn = document.getElementById('quick-generate-btn');
    const customBtn = document.getElementById('custom-generate-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json-input');
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

    const globalSearchInput = document.getElementById('global-search-input');
    const searchCardContainer = document.getElementById('search-card-container');
    const dictDirectionSelect = document.getElementById('dict-direction-select');

    const openModalBtn = document.getElementById('open-new-term-modal-btn');
    const newTermModal = document.getElementById('new-term-modal');
    const closeModalX = document.getElementById('modal-close-x-btn');
    const cancelModalBtn = document.getElementById('modal-cancel-btn');
    const okModalBtn = document.getElementById('modal-ok-btn');
    const createTermBtn = document.getElementById('modal-create-term-btn');
    const modalEnglishInput = document.getElementById('modal-english-input');
    const modalPosSelect = document.getElementById('modal-pos-select');
    const modalConlangOutput = document.getElementById('modal-conlang-output');
    const modalWarningAlert = document.getElementById('modal-warning-alert');
    const modalWarningTerm = document.getElementById('modal-warning-term');

    let currentGeneratedTerm = '';

    function getRandomSelectValue(selectElement) {
        const options = selectElement.options;
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex].value;
    }

    function randomizeAllParameters() {
        descPreset.value = getRandomSelectValue(descPreset);
        cultPreset.value = getRandomSelectValue(cultPreset);
        socioPreset.value = getRandomSelectValue(socioPreset);
        articleModeSelect.value = getRandomSelectValue(articleModeSelect);
        morphologySelect.value = getRandomSelectValue(morphologySelect);
        grammarStrategySelect.value = getRandomSelectValue(grammarStrategySelect);
        vowelPreset.value = getRandomSelectValue(vowelPreset);
        consPreset.value = getRandomSelectValue(consPreset);

        meanLengthInput.value = (Math.random() * (3.5 - 1.8) + 1.8).toFixed(1);
        stdDevInput.value = (Math.random() * (1.2 - 0.4) + 0.4).toFixed(1);
    }

    function getFormConfig() {
        return {
            aesthetic: descPreset.value,
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

    function renderDictionaryTable(vocabulary, direction) {
        const tHead = document.getElementById('dict-table-head');
        const tBody = document.getElementById('dict-table-body');
        if (!tHead || !tBody) return;

        let sortedVocab = [...vocabulary];

        if (direction === 'conlang-english') {
            tHead.innerHTML = `
                <tr>
                    <th class="py-3 px-4 w-1/2">Conlang Term</th>
                    <th class="py-3 px-4 w-1/2">Italian Translation</th>
                </tr>
            `;
            sortedVocab.sort((a, b) => a.conlang.localeCompare(b.conlang));
            tBody.innerHTML = sortedVocab.map(item => `
                <tr class="hover:bg-slate-900/60 transition-colors">
                    <td class="py-2.5 px-4 font-bold text-sky-400 mono-font">${item.conlang}</td>
                    <td class="py-2.5 px-4 text-slate-300">${item.english} <span class="text-xs text-slate-500 font-mono ml-2">(${item.category})</span></td>
                </tr>
            `).join('');
        } else {
            tHead.innerHTML = `
                <tr>
                    <th class="py-3 px-4 w-1/2">Italian Word</th>
                    <th class="py-3 px-4 w-1/2">Conlang Translation</th>
                </tr>
            `;
            sortedVocab.sort((a, b) => a.english.localeCompare(b.english));
            tBody.innerHTML = sortedVocab.map(item => `
                <tr class="hover:bg-slate-900/60 transition-colors">
                    <td class="py-2.5 px-4 font-medium text-slate-200">${item.english} <span class="text-xs text-slate-500 font-mono ml-2">(${item.category})</span></td>
                    <td class="py-2.5 px-4 font-bold text-sky-400 mono-font">${item.conlang}</td>
                </tr>
            `).join('');
        }
    }

    function renderOutput(data) {
        if (!data || !data.grammar) return;

        titleBadge.textContent = `Language: ${data.grammar.languageName}`;

        const grammarContainer = document.getElementById('grammar-container');
        const g = data.grammar;
        
        let aspectHtml = '';
        if (g.morphology.aspectAndMoodDerivation) {
            aspectHtml = `<br>Aspect Affixes: <em>${JSON.stringify(g.morphology.aspectAndMoodDerivation)}</em>`;
        }

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
                        Suffix: <em>${g.morphology.derivationalAffixes.suffix}</em>${aspectHtml}
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

        const vocabTabBtn = document.querySelector('button[data-tab="tab-words"]');
        if (vocabTabBtn) {
            vocabTabBtn.textContent = `Vocabulary (${data.vocabulary.length})`;
        }

        const sentenceTabBtn = document.querySelector('button[data-tab="tab-sentences"]');
        if (sentenceTabBtn) {
            sentenceTabBtn.textContent = `Sentences (${data.sentences.length})`;
        }

        renderDictionaryTable(data.vocabulary, dictDirectionSelect.value);

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
        let dialogueHTML = '';
        let lastDialogCategory = '';

        data.dialogues.forEach((dlg, idx) => {
            if (dlg.category !== lastDialogCategory) {
                lastDialogCategory = dlg.category;
                dialogueHTML += `<div class="section-header">${lastDialogCategory}</div>`;
            }
            dialogueHTML += `
                <div class="dialogue-box">
                    <h4>Dialogue #${idx + 1}: ${dlg.title}</h4>
                    ${dlg.lines.map(line => `
                        <div class="dialogue-line">
                            <span class="speaker">${line.speaker}:</span>${line.conlang}
                            <br><small class="translation">${line.english}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        });
        dialoguesContainer.innerHTML = dialogueHTML;
    }

    function executeGeneration(config) {
        const result = engine.buildDataset(config);
        renderOutput(result);
    }

    function resetModal() {
        modalEnglishInput.value = '';
        modalPosSelect.value = 'Noun';
        modalConlangOutput.textContent = '---';
        currentGeneratedTerm = '';
        modalWarningAlert.classList.add('hidden');
        if (modalWarningTerm) modalWarningTerm.textContent = '---';
    }

    openModalBtn.addEventListener('click', () => {
        resetModal();
        newTermModal.classList.remove('hidden');
    });

    const closeModal = () => {
        newTermModal.classList.add('hidden');
        resetModal();
    };

    closeModalX.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    modalEnglishInput.addEventListener('input', () => {
        const query = modalEnglishInput.value.trim().toLowerCase();
        if (!query || !engine.lastGeneratedData) {
            modalWarningAlert.classList.add('hidden');
            return;
        }

        const existingEntry = engine.lastGeneratedData.vocabulary.find(v => v.english.toLowerCase() === query);
        if (existingEntry) {
            if (modalWarningTerm) modalWarningTerm.textContent = existingEntry.conlang;
            modalWarningAlert.classList.remove('hidden');
        } else {
            modalWarningAlert.classList.add('hidden');
        }
    });

    createTermBtn.addEventListener('click', () => {
        currentGeneratedTerm = engine.generateMarkov2ndOrderWord();
        modalConlangOutput.textContent = currentGeneratedTerm;
    });

    okModalBtn.addEventListener('click', () => {
        const englishVal = modalEnglishInput.value.trim();
        const categoryVal = modalPosSelect.value;

        if (!englishVal) {
            alert('Please enter a translation.');
            return;
        }

        if (!currentGeneratedTerm) {
            alert('Please click "Create" first to synthesize a Conlang term.');
            return;
        }

        const newEntry = {
            conlang: currentGeneratedTerm,
            english: englishVal,
            category: categoryVal
        };

        if (engine.lastGeneratedData) {
            engine.lastGeneratedData.vocabulary.push(newEntry);
            const key = englishVal.toLowerCase().trim();
            engine.lexiconMap.set(key, currentGeneratedTerm);

            renderOutput(engine.lastGeneratedData);
        }

        closeModal();
    });

    dictDirectionSelect.addEventListener('change', () => {
        if (engine.lastGeneratedData && engine.lastGeneratedData.vocabulary) {
            renderDictionaryTable(engine.lastGeneratedData.vocabulary, dictDirectionSelect.value);
        }
    });

    globalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query || !engine.lastGeneratedData || !engine.lastGeneratedData.vocabulary) {
            searchCardContainer.classList.add('hidden');
            searchCardContainer.innerHTML = '';
            return;
        }

        const match = engine.lastGeneratedData.vocabulary.find(item => 
            item.conlang.toLowerCase() === query || 
            item.english.toLowerCase() === query ||
            item.conlang.toLowerCase().includes(query) ||
            item.english.toLowerCase().includes(query)
        );

        if (match) {
            searchCardContainer.innerHTML = `
                <div class="text-xs text-sky-400 font-semibold uppercase tracking-wider mb-1">Search Result</div>
                <span class="category-tag">${match.category}</span>
                <div class="conlang-word text-lg">${match.conlang}</div>
                <div class="translation text-sm font-medium mt-1">${match.english}</div>
            `;
            searchCardContainer.classList.remove('hidden');
        } else {
            searchCardContainer.innerHTML = `<div class="text-xs text-slate-400">No matching lexeme found.</div>`;
            searchCardContainer.classList.remove('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!globalSearchInput.contains(e.target) && !searchCardContainer.contains(e.target)) {
            searchCardContainer.classList.add('hidden');
        }
    });

    quickBtn.addEventListener('click', () => {
        randomizeAllParameters();
        executeGeneration(getFormConfig());
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

    if (importJsonBtn && importJsonInput) {
        importJsonBtn.addEventListener('click', () => {
            importJsonInput.click();
        });

        importJsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (importedData && importedData.grammar && importedData.vocabulary) {
                        engine.lastGeneratedData = importedData;
                        
                        if (importedData.metadata && importedData.metadata.configuration) {
                            const cfg = importedData.metadata.configuration;
                            if (cfg.aesthetic) descPreset.value = cfg.aesthetic;
                            if (cfg.culture) cultPreset.value = cfg.culture;
                            if (cfg.articleMode) articleModeSelect.value = cfg.articleMode;
                            if (cfg.morphologyType) morphologySelect.value = cfg.morphologyType;
                            if (cfg.grammarStrategy) grammarStrategySelect.value = cfg.grammarStrategy;
                            if (cfg.vowelSet) vowelPreset.value = cfg.vowelSet;
                            if (cfg.consonantSet) consPreset.value = cfg.consonantSet;
                            if (cfg.meanLength) meanLengthInput.value = cfg.meanLength;
                            if (cfg.stdDev) stdDevInput.value = cfg.stdDev;
                        }

                        renderOutput(importedData);
                        alert(`Successfully imported "${importedData.grammar.languageName}"!`);
                    } else {
                        alert('Invalid conlang JSON structure. Please select a valid exported file.');
                    }
                } catch (err) {
                    console.error('JSON Import Error:', err);
                    alert('Error reading the JSON file. Ensure the file is not corrupted.');
                }
                importJsonInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const targetContent = document.getElementById(tab.dataset.tab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    randomizeAllParameters();
    executeGeneration(getFormConfig());
});
