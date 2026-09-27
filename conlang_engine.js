/**
 * Conlang Engine Studio
 * Version: 3.1.0
 * Features: 100 English Pocket Survival Card Sentences, Dynamic Placeholder Support, Strict Lexicon Sync, Sandhi Rules
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
    coreNouns: ["man", "person", "sun", "name", "place", "water", "food", "help", "price", "doctor"],
    coreVerbs: ["be", "have", "need", "seek", "go", "speak", "know", "see", "buy", "pay"],

    nouns: [
        "moon", "fire", "earth", "sky", "woman", "child", "king", "leader", "god", "spirit", 
        "sword", "shield", "trade", "gold", "house", "city", "star", "river", "tree", "animal", 
        "beast", "life", "death", "blood", "war", "peace", "bread", "night", "day", 
        "shadow", "light", "stone", "iron", "wind", "sea", "mountain", "valley", "forest", 
        "rain", "storm", "ice", "road", "gate", "bridge", "tower", "ocean", "cloud", "field",
        "desert", "swamp", "island", "shore", "wave", "ash", "dust", "smoke", "flame", "spark",
        "leaf", "root", "seed", "flower", "fruit", "wood", "grass", "bird", "fish", "snake",
        "wolf", "bear", "deer", "eagle", "dragon", "body", "head", "eye", "hand", "foot",
        "heart", "bone", "flesh", "mind", "soul", "voice", "word", "truth", "lie",
        "law", "rule", "order", "chaos", "time", "year", "month", "season", "winter", "summer",
        "springtime", "autumn", "morning", "evening", "dawn", "dusk", "silence", "sound", "song",
        "story", "dream", "hope", "fear", "pain", "joy", "grief", "love", "hatred", "courage",
        "wisdom", "strength", "power", "glory", "shame", "freedom", "bondage", "gift", "work",
        "rest", "sleep", "path", "border", "wall", "door", "window", "roof", "bed", "table",
        "cup", "blade", "bow", "arrow", "spear", "armor", "helm", "ring", "crown", "throne",
        "jewel", "silver", "copper", "bronze", "glass", "cloth", "rope", "wheel", "cart", "boat",
        "bathroom", "station", "market", "exit", "entrance", "hospital", "police", "embassy", "ticket", "hotel"
    ],
    verbs: [
        "run", "walk", "see", "hear", "fight", "build", "love", "hate", "eat",
        "drink", "sleep", "die", "live", "give", "take", "think", "know", "lead", "rule",
        "find", "call", "stop", "strike", "guard", "carry", "break", "bind", "fly",
        "stand", "sit", "lie down", "rise", "fall", "climb", "swim", "jump", "touch", "hold",
        "push", "pull", "throw", "catch", "cut", "burn", "freeze", "wash", "clean", "open",
        "close", "hide", "show", "seek out", "lose", "win", "learn", "teach", "forget", "remember",
        "ask", "answer", "say", "tell", "sing", "shout", "whisper", "listen", "watch", "read",
        "write", "draw", "make", "destroy", "heal", "harm", "hinder", "sell",
        "steal", "protect", "attack", "surrender", "escape", "wait", "begin", "end", "continue"
    ],
    adjectives: [
        "great", "small", "bright", "dark", "strong", "weak", "old", "young", "good", "evil",
        "hot", "cold", "fast", "slow", "hard", "soft", "wise", "wild", "holy", "mortal",
        "clean", "safe", "cheap", "rich", "bound", "silent", "sharp", "heavy", "lightweight", "pure",
        "new", "ancient", "high", "low", "long", "short", "wide", "narrow", "deep", "shallow",
        "thick", "thin", "heavy-set", "full", "empty", "dry", "wet", "sweet", "bitter", "sour",
        "salty", "smooth", "rough", "clean-cut", "dirty", "true", "false", "calm", "fierce", "kind",
        "cruel", "brave", "cowardly", "proud", "humble", "noble", "common", "free", "captive", "alive",
        "dead", "sick", "healthy", "blind", "deaf", "mute", "sharp-eyed", "swift", "firm", "loose",
        "expensive", "far", "near", "lost", "injured", "dangerous", "urgent"
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

// Corpus di 100 Frasi di Sopravvivenza tascabili (Pocket Survival Card)
const PocketSurvivalCorpus = [
    // 1. Basic Courtesy & Essentials (1-15)
    { section: "1. Basic Courtesy & Essentials", s: "peace", v: "be", o: "you", eng: "Hello / Peace be with you.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "sun", v: "be", o: "good", eng: "Good morning.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "night", v: "be", o: "good", eng: "Good evening.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "I", v: "walk", o: "away", eng: "Goodbye.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "I", v: "ask", o: "favor", eng: "Please.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "I", v: "give", o: "thanks", eng: "Thank you.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "I", v: "give", o: "great thanks", eng: "Thank you very much.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "you", v: "be", o: "welcome", eng: "You are welcome.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "I", v: "ask", o: "pardon", eng: "Excuse me / Sorry.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "this", v: "be", o: "true", eng: "Yes.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "this", v: "be", o: "false", eng: "No.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "all", v: "be", o: "good", eng: "Okay.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "problem", v: "be", o: "not", eng: "No problem.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "I", v: "need", o: "help", eng: "I need help.", art: "none" },
    { section: "1. Basic Courtesy & Essentials", s: "you", v: "help", o: "me", eng: "Can you help me?", art: "none" },

    // 2. Communication & Understanding (16-30)
    { section: "2. Communication & Understanding", s: "I", v: "know", o: "not", eng: "I do not understand.", art: "none" },
    { section: "2. Communication & Understanding", s: "I", v: "know", o: "truth", eng: "I understand.", art: "none" },
    { section: "2. Communication & Understanding", s: "I", v: "speak", o: "not", eng: "I do not speak <language> well.", art: "none", placeholder: "<language>" },
    { section: "2. Communication & Understanding", s: "you", v: "speak", o: "word", eng: "Do you speak <language>?", art: "none", placeholder: "<language>" },
    { section: "2. Communication & Understanding", s: "you", v: "speak", o: "slow", eng: "Please speak more slowly.", art: "none" },
    { section: "2. Communication & Understanding", s: "you", v: "say", o: "again", eng: "Can you repeat that?", art: "none" },
    { section: "2. Communication & Understanding", s: "what", v: "be", o: "meaning", eng: "What does <placeholder> mean?", art: "none", placeholder: "<placeholder>" },
    { section: "2. Communication & Understanding", s: "how", v: "say", o: "word", eng: "How do you say <placeholder>?", art: "none", placeholder: "<placeholder>" },
    { section: "2. Communication & Understanding", s: "how", v: "sound", o: "word", eng: "How do you pronounce this?", art: "none" },
    { section: "2. Communication & Understanding", s: "you", v: "write", o: "it", eng: "Can you write it down?", art: "none" },
    { section: "2. Communication & Understanding", s: "I", v: "know", o: "nothing", eng: "I do not know.", art: "none" },
    { section: "2. Communication & Understanding", s: "I", v: "be", o: "not sure", eng: "I am not sure.", art: "none" },
    { section: "2. Communication & Understanding", s: "you", v: "show", o: "me", eng: "Can you point to it?", art: "none" },
    { section: "2. Communication & Understanding", s: "I", v: "have", o: "card", eng: "I have this survival card.", art: "this" },
    { section: "2. Communication & Understanding", s: "you", v: "read", o: "this", eng: "Please read this card.", art: "this" },

    // 3. Identity & Essential Info (31-40)
    { section: "3. Identity & Essential Info", s: "my", v: "be", o: "name", eng: "My name is <name>.", art: "none", placeholder: "<name>" },
    { section: "3. Identity & Essential Info", s: "what", v: "be", o: "name", eng: "What is your name?", art: "none" },
    { section: "3. Identity & Essential Info", s: "I", v: "come", o: "far", eng: "I am from <country>.", art: "none", placeholder: "<country>" },
    { section: "3. Identity & Essential Info", s: "where", v: "come", o: "you", eng: "Where are you from?", art: "none" },
    { section: "3. Identity & Essential Info", s: "I", v: "be", o: "traveler", eng: "I am a traveler.", art: "indefinite" },
    { section: "3. Identity & Essential Info", s: "I", v: "stay", o: "here", eng: "I am staying at <place>.", art: "none", placeholder: "<place>" },
    { section: "3. Identity & Essential Info", s: "I", v: "stay", o: "day", eng: "I am here for a few days.", art: "none" },
    { section: "3. Identity & Essential Info", s: "I", v: "have", o: "family", eng: "I am with my family.", art: "none" },
    { section: "3. Identity & Essential Info", s: "I", v: "be", o: "alone", eng: "I am traveling alone.", art: "none" },
    { section: "3. Identity & Essential Info", s: "this", v: "be", o: "paper", eng: "Here are my documents.", art: "none" },

    // 4. Orientation & Directions (41-55)
    { section: "4. Orientation & Directions", s: "where", v: "be", o: "place", eng: "Where can I find <place>?", art: "none", placeholder: "<place>" },
    { section: "4. Orientation & Directions", s: "where", v: "be", o: "bathroom", eng: "Where is the bathroom?", art: "definite" },
    { section: "4. Orientation & Directions", s: "where", v: "be", o: "station", eng: "Where is the station?", art: "definite" },
    { section: "4. Orientation & Directions", s: "where", v: "be", o: "market", eng: "Where is the market?", art: "definite" },
    { section: "4. Orientation & Directions", s: "where", v: "be", o: "hotel", eng: "Where is the hotel?", art: "definite" },
    { section: "4. Orientation & Directions", s: "where", v: "be", o: "exit", eng: "Where is the exit?", art: "definite" },
    { section: "4. Orientation & Directions", s: "where", v: "be", o: "entrance", eng: "Where is the entrance?", art: "definite" },
    { section: "4. Orientation & Directions", s: "it", v: "be", o: "far", eng: "Is it far from here?", art: "none" },
    { section: "4. Orientation & Directions", s: "it", v: "be", o: "near", eng: "Is it near?", art: "none" },
    { section: "4. Orientation & Directions", s: "road", v: "be", o: "where", eng: "Should I go left or right?", art: "none" },
    { section: "4. Orientation & Directions", s: "I", v: "walk", o: "this road", eng: "Am I going the right way?", art: "none" },
    { section: "4. Orientation & Directions", s: "time", v: "be", o: "how much", eng: "How long does it take to get to <place>?", art: "none", placeholder: "<place>" },
    { section: "4. Orientation & Directions", s: "you", v: "show", o: "map", eng: "Can you show me on the map?", art: "none" },
    { section: "4. Orientation & Directions", s: "you", v: "walk", o: "me", eng: "Please take me to <place>.", art: "none", placeholder: "<place>" },
    { section: "4. Orientation & Directions", s: "I", v: "be", o: "lost", eng: "I am lost.", art: "none" },

    // 5. Food, Water & Sustenance (56-70)
    { section: "5. Food, Water & Sustenance", s: "I", v: "have", o: "hunger", eng: "I am hungry.", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "I", v: "have", o: "thirst", eng: "I am thirsty.", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "I", v: "eat", o: "food", eng: "I would like to eat.", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "I", v: "drink", o: "water", eng: "I would like to drink.", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "I", v: "need", o: "water", eng: "Can I have some water?", art: "partitive" },
    { section: "5. Food, Water & Sustenance", s: "you", v: "have", o: "food", eng: "Do you have food available?", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "food", v: "be", o: "safe", eng: "Is this food safe to eat?", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "I", v: "eat", o: "not", eng: "I do not eat <food_type>.", art: "none", placeholder: "<food_type>" },
    { section: "5. Food, Water & Sustenance", s: "food", v: "make", o: "sick", eng: "I am allergic to <allergen>.", art: "none", placeholder: "<allergen>" },
    { section: "5. Food, Water & Sustenance", s: "what", v: "be", o: "cost", eng: "How much does this meal cost?", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "I", v: "pay", o: "now", eng: "The bill, please.", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "this", v: "be", o: "all", eng: "Is that everything?", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "I", v: "take", o: "more", eng: "Can I have more of <item>?", art: "none", placeholder: "<item>" },
    { section: "5. Food, Water & Sustenance", s: "food", v: "be", o: "good", eng: "This food is very good.", art: "none" },
    { section: "5. Food, Water & Sustenance", s: "where", v: "be", o: "water", eng: "Where is drinking water?", art: "none" },

    // 6. Accommodation & Travel (71-80)
    { section: "6. Accommodation & Travel", s: "I", v: "need", o: "house", eng: "I need a room for the night.", art: "indefinite" },
    { section: "6. Accommodation & Travel", s: "you", v: "have", o: "room", eng: "Do you have a free room?", art: "indefinite" },
    { section: "6. Accommodation & Travel", s: "what", v: "cost", o: "night", eng: "How much is one night?", art: "none" },
    { section: "6. Accommodation & Travel", s: "I", v: "have", o: "word", eng: "I have a reservation.", art: "indefinite" },
    { section: "6. Accommodation & Travel", s: "where", v: "be", o: "room", eng: "Where is my room?", art: "none" },
    { section: "6. Accommodation & Travel", s: "when", v: "leave", o: "ship", eng: "What time does the transport leave?", art: "definite" },
    { section: "6. Accommodation & Travel", s: "when", v: "come", o: "ship", eng: "What time does it arrive?", art: "definite" },
    { section: "6. Accommodation & Travel", s: "I", v: "buy", o: "ticket", eng: "One ticket to <destination>, please.", art: "indefinite", placeholder: "<destination>" },
    { section: "6. Accommodation & Travel", s: "I", v: "stop", o: "here", eng: "Do I get off here?", art: "none" },
    { section: "6. Accommodation & Travel", s: "ship", v: "go", o: "there", eng: "Does this go to <destination>?", art: "none", placeholder: "<destination>" },

    // 7. Shopping & Money (81-90)
    { section: "7. Shopping & Money", s: "what", v: "be", o: "price", eng: "How much is this?", art: "none" },
    { section: "7. Shopping & Money", s: "price", v: "be", o: "high", eng: "It is too expensive.", art: "none" },
    { section: "7. Shopping & Money", s: "you", v: "have", o: "cheap", eng: "Do you have something cheaper?", art: "none" },
    { section: "7. Shopping & Money", s: "I", v: "buy", o: "this", eng: "I would like to buy this.", art: "none" },
    { section: "7. Shopping & Money", s: "I", v: "buy", o: "not", eng: "I do not want to buy this.", art: "none" },
    { section: "7. Shopping & Money", s: "I", v: "pay", o: "coin", eng: "Can I pay with card / coin?", art: "none" },
    { section: "7. Shopping & Money", s: "where", v: "be", o: "trade", eng: "Where is an exchange / bank?", art: "indefinite" },
    { section: "7. Shopping & Money", s: "you", v: "have", o: "coin", eng: "Do you have change?", art: "none" },
    { section: "7. Shopping & Money", s: "coin", v: "be", o: "wrong", eng: "The change is incorrect.", art: "none" },
    { section: "7. Shopping & Money", s: "I", v: "take", o: "this", eng: "I will take this one.", art: "none" },

    // 8. Emergencies & Health (91-100)
    { section: "8. Emergencies & Health", s: "help", v: "come", o: "now", eng: "Help!", art: "none" },
    { section: "8. Emergencies & Health", s: "call", v: "see", o: "person", eng: "Call someone, please!", art: "none" },
    { section: "8. Emergencies & Health", s: "call", v: "see", o: "police", eng: "Call the police!", art: "definite" },
    { section: "8. Emergencies & Health", s: "call", v: "see", o: "doctor", eng: "Call a doctor!", art: "indefinite" },
    { section: "8. Emergencies & Health", s: "call", v: "see", o: "hospital", eng: "Take me to a hospital!", art: "indefinite" },
    { section: "8. Emergencies & Health", s: "I", v: "be", o: "injured", eng: "I am injured.", art: "none" },
    { section: "8. Emergencies & Health", s: "body", v: "be", o: "bad", eng: "I feel very sick.", art: "none" },
    { section: "8. Emergencies & Health", s: "thief", v: "take", o: "gold", eng: "I have been robbed.", art: "none" },
    { section: "8. Emergencies & Health", s: "I", v: "lose", o: "this", eng: "I lost my <item>.", art: "none", placeholder: "<item>" },
    { section: "8. Emergencies & Health", s: "I", v: "be", o: "dangerous", eng: "I am in danger!", art: "none" }
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

    buildClause(sKey, vKey, oKey, wordOrder, articles, caseSuffix, suffix, forceArticle = null, placeholder = null) {
        const registerAndGet = (key) => {
            const normalized = key.toLowerCase().trim();
            if (this.lexiconMap.has(normalized)) {
                return this.lexiconMap.get(normalized);
            }
            // Se la parola chiave usata nella frase non esiste nel vocabolario, viene sintetizzata e registrata
            const newConlangWord = this.generatePhonotacticWord(2, false, false);
            this.lexiconMap.set(normalized, newConlangWord);
            return newConlangWord;
        };

        let sTerm = registerAndGet(sKey);
        let vTerm = registerAndGet(vKey);
        let oTerm = registerAndGet(oKey);

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
            if (char === 'O') {
                cWords.push(placeholder ? `${oTerm} ${placeholder}` : oTerm);
            }
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

        PocketSurvivalCorpus.forEach(item => {
            const conlangStr = this.buildClause(
                item.s, item.v, item.o, wordOrder, articles, caseSuffix, suffix, item.art, item.placeholder
            );
            sentences.push({
                conlang: conlangStr,
                english: item.eng,
                sectionTitle: item.section
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

        // Generazione delle 100 frasi tascabili e sincronizzazione automatica dei lessemi mancanti nel vocabolario
        const sentences = this.generateCorpusSentences(wordOrder, articles, caseSuffix, suffix);

        // Controllo e aggiunta retroattiva nel vocabolario dei termini registrati durante la costruzione delle frasi
        this.lexiconMap.forEach((conlangTerm, engKey) => {
            const existsInVocab = vocabulary.some(v => v.english.toLowerCase() === engKey);
            if (!existsInVocab) {
                vocabulary.push({
                    conlang: conlangTerm,
                    english: engKey,
                    category: "Essential Concept"
                });
            }
        });

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
                    <th class="py-3 px-4 w-1/2">English Translation</th>
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
                    <th class="py-3 px-4 w-1/2">English Word</th>
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
            sentenceTabBtn.textContent = `Survival Phrases (${data.sentences.length})`;
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
