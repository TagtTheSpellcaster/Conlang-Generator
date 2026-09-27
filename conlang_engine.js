/**
 * CONLANG ENGINE CORE MODULE - v3.4.0
 * Mass Volume Dynamic Parser & Context-Aware Lexicon Engine
 */

const PHONETICS_PRESETS = {
  harsh: { vowels: ['a', 'u'], consonants: ['p', 't', 'k', 'ts', 'tr', 'gr', 'kr'], syllables: ['CCVC', 'CVCC'], maxC: 3, epenthetic: 'a' },
  musical: { vowels: ['a', 'e', 'i', 'o'], consonants: ['l', 'r', 'm', 'n', 'v', 's'], syllables: ['CV', 'V'], maxC: 1, epenthetic: 'i' },
  dark: { vowels: ['u', 'o', 'a'], consonants: ['k', 'g', 'q', 'x', 'r', 'z', 'kh'], syllables: ['CVC', 'CCV'], maxC: 3, epenthetic: 'u' },
  magic: { vowels: ['a', 'i', 'e', 'ae'], consonants: ['s', 'sh', 'h', 'f', 'l', 'm', 'th'], syllables: ['CV', 'CVC'], maxC: 2, epenthetic: 'e' },
  renaissance: { vowels: ['a', 'e', 'i', 'o'], consonants: ['t', 's', 'p', 'k', 'm', 'n', 'r', 'l', 'g'], syllables: ['CV', 'CVC'], maxC: 2, epenthetic: 'e' },
  aquatic: { vowels: ['a', 'i', 'u', 'o'], consonants: ['m', 'n', 'l', 'w', 'f', 'v', 'bh'], syllables: ['CV', 'CVC'], maxC: 2, epenthetic: 'u' },
  none: { vowels: ['a', 'e', 'i', 'o', 'u'], consonants: ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 's', 'r', 'l'], syllables: ['CV', 'CVC'], maxC: 2, epenthetic: 'e' }
};

// --- BASE CORE VOCABULARY KEYS ---
const CORE_DICTIONARY_KEYS = [
  { key: "i", en: "I", pos: "PRON" }, { key: "you", en: "you", pos: "PRON" }, { key: "he", en: "he/she", pos: "PRON" },
  { key: "we", en: "we", pos: "PRON" }, { key: "they", en: "they", pos: "PRON" }, { key: "not", en: "not", pos: "PART" },
  { key: "ques", en: "ques", pos: "PART" }, { key: "be", en: "be", pos: "V" }, { key: "see", en: "see", pos: "V" },
  { key: "seek", en: "seek", pos: "V" }, { key: "buy", en: "buy", pos: "V" }, { key: "pay", en: "pay", pos: "V" },
  { key: "have", en: "have", pos: "V" }, { key: "go", en: "go", pos: "V" }, { key: "show", en: "show", pos: "V" },
  { key: "know", en: "know", pos: "V" }, { key: "give", en: "give", pos: "V" }, { key: "person", en: "person", pos: "N" },
  { key: "water", en: "water", pos: "N" }, { key: "fire", en: "fire", pos: "N" }, { key: "earth", en: "earth", pos: "N" },
  { key: "sky", en: "sky", pos: "N" }, { key: "good", en: "good", pos: "ADJ" }, { key: "new", en: "new", pos: "ADJ" },
  { key: "near", en: "near", pos: "ADJ" }, { key: "clean", en: "clean", pos: "ADJ" }, { key: "safe", en: "safe", pos: "ADJ" }
];

// --- CULTURAL VOCABULARY EXPANSION MATRIX (TARGET: 600+ WORDS) ---
const CULTURAL_EXPANSION_DOMAINS = {
  primitive: [
    "hunt", "prey", "tribe", "chief", "spear", "cave", "blood", "beast", "spirit", "bone",
    "track", "skin", "fang", "smoke", "thunder", "river", "sun", "moon", "star", "fruit"
  ],
  ancient: [
    "temple", "king", "priest", "bronze", "tribute", "decree", "wall", "chariot", "altar", "oracle",
    "phalanx", "god", "crown", "monument", "papyrus", "harvest", "empire", "shield", "statue", "slave"
  ],
  medieval: [
    "castle", "knight", "sword", "lord", "vassal", "banner", "inn", "horse", "armor", "shield",
    "feud", "oath", "siege", "keep", "forge", "anvil", "tide", "merchant", "guild", "coin"
  ],
  renaissance: [
    "academy", "physician", "scholar", "map", "book", "printing", "perspective", "telescope", "alchemy", "formula",
    "aqueduct", "fountain", "canvas", "sculpture", "compass", "astronomy", "charter", "university", "anatomy", "monument"
  ],
  alien: [
    "stasis", "portal", "plasma", "frequency", "matrix", "neural", "vector", "core", "radiation", "flux",
    "orbit", "telepathy", "beacon", "energy", "node", "synthetic", "module", "bio-shell", "resonance", "void"
  ]
};

// --- SECTION A: 35 CULTURAL SURVIVAL PHRASES (5 BLOCKS x 7 PHRASES) ---
const PHRASEBOOK_TEMPLATES = [
  // Block 1: Greetings & Identity
  { block: "Greetings & Identity", text: ["i", "be", "person"] },
  { block: "Greetings & Identity", text: ["we", "go", "in", "peace"] },
  { block: "Greetings & Identity", text: ["i", "show", "good", "intent"] },
  { block: "Greetings & Identity", text: ["he", "be", "chief"] },
  { block: "Greetings & Identity", text: ["we", "seek", "safe", "house"] },
  { block: "Greetings & Identity", text: ["i", "give", "new", "tribute"] },
  { block: "Greetings & Identity", text: ["you", "be", "good", "person"] },

  // Block 2: Orientation & Places
  { block: "Orientation & Places", text: ["ques", "you", "show", "road", "?"] },
  { block: "Orientation & Places", text: ["ques", "where", "be", "city", "?"] },
  { block: "Orientation & Places", text: ["the", "road", "be", "near"] },
  { block: "Orientation & Places", text: ["we", "go", "to", "academy"] },
  { block: "Orientation & Places", text: ["ques", "where", "be", "clean", "water", "?"] },
  { block: "Orientation & Places", text: ["the", "gate", "be", "near"] },
  { block: "Orientation & Places", text: ["i", "seek", "the", "inn"] },

  // Block 3: Needs & Survival
  { block: "Needs & Survival", text: ["i", "seek", "clean", "water"] },
  { block: "Needs & Survival", text: ["we", "have", "not", "food"] },
  { block: "Needs & Survival", text: ["ques", "where", "be", "physician", "?"] },
  { block: "Needs & Survival", text: ["i", "have", "not", "safe", "house"] },
  { block: "Needs & Survival", text: ["give", "us", "fire"] },
  { block: "Needs & Survival", text: ["we", "buy", "good", "medicine"] },
  { block: "Needs & Survival", text: ["i", "be", "near", "death"] },

  // Block 4: Trade & Tributes
  { block: "Trade & Tributes", text: ["ques", "you", "buy", "this", "map", "?"] },
  { block: "Trade & Tributes", text: ["i", "pay", "new", "coin"] },
  { block: "Trade & Tributes", text: ["we", "give", "tribute"] },
  { block: "Trade & Tributes", text: ["this", "book", "be", "good"] },
  { block: "Trade & Tributes", text: ["i", "buy", "this", "horse"] },
  { block: "Trade & Tributes", text: ["ques", "you", "have", "coin", "?"] },
  { block: "Trade & Tributes", text: ["we", "trade", "in", "peace"] },

  // Block 5: Danger & Alarms
  { block: "Danger & Alarms", text: ["fire", "be", "near"] },
  { block: "Danger & Alarms", text: ["the", "beast", "be", "near"] },
  { block: "Danger & Alarms", text: ["i", "know", "not", "your", "words"] },
  { block: "Danger & Alarms", text: ["the", "enemy", "be", "near"] },
  { block: "Danger & Alarms", text: ["go", "to", "the", "mountain"] },
  { block: "Danger & Alarms", text: ["not", "go", "to", "the", "road"] },
  { block: "Danger & Alarms", text: ["ques", "you", "see", "danger", "?"] }
];

// --- SECTION B: 20 MINI-DIALOGUES (4 TURNS EACH) ---
const DIALOGUE_TEMPLATES_20 = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  contextTags: {
    primitive: `Incontro di Caccia #${i + 1}`,
    medieval: `Guardia e Viandante #${i + 1}`,
    scholarly: `Dibattito Accademico #${i + 1}`,
    renaissance: `Bottega Rinascimentale #${i + 1}`,
    alien: `Scambio Dati Matrice #${i + 1}`
  },
  turns: [
    { speaker: "A", text: ["you", "seek", "academy", "?"] },
    { speaker: "B", text: ["I", "seek", "physician"] },
    { speaker: "A", text: ["you", "have", "coin"] },
    { speaker: "B", text: ["I", "pay", "coin"] }
  ]
}));

function getBoxMullerLength(mean, stdDev) {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  let len = Math.round(mean + z0 * stdDev);
  return Math.max(2, Math.min(15, len));
}

function getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function isVowel(ch) { return ['a', 'e', 'i', 'o', 'u', 'y'].includes(ch.toLowerCase()); }

function generateRootWord(style = 'none', targetLength = 5, customVowels = [], customConsonants = []) {
  const preset = PHONETICS_PRESETS[style] || PHONETICS_PRESETS.none;
  const vowels = customVowels.length ? customVowels : preset.vowels;
  const consonants = customConsonants.length ? customConsonants : preset.consonants;
  const structures = preset.syllables;

  let word = "", attempts = 0;
  while (word.length < targetLength && attempts < 100) {
    attempts++;
    let pattern = getRandomItem(structures);
    for (let char of pattern) {
      if (char === 'C') word += getRandomItem(consonants);
      if (char === 'V') word += getRandomItem(vowels);
      if (word.length >= targetLength) break;
    }
  }
  return word.slice(0, targetLength);
}

function fuseWords(rootA, rootB, style = 'none', targetLength = 8) {
  const preset = PHONETICS_PRESETS[style] || PHONETICS_PRESETS.none;
  let overlapLen = Math.min(rootA.length, rootB.length);
  for (let len = overlapLen; len >= 1; len--) {
    let suffixA = rootA.slice(-len);
    let prefixB = rootB.slice(0, len);
    if (suffixA.toLowerCase() === prefixB.toLowerCase()) {
      rootA = rootA.slice(0, -len);
      break;
    }
  }

  let merged = rootA + rootB;
  let lastCharA = rootA.slice(-1);
  let firstCharB = rootB.charAt(0);

  if (!isVowel(lastCharA) && !isVowel(firstCharB)) {
    if (style === 'musical') merged = rootA + preset.epenthetic + rootB;
    else if (style === 'harsh' && lastCharA.toLowerCase() === firstCharB.toLowerCase()) merged = rootA.slice(0, -1) + rootB;
  }

  let cCount = 0;
  for (let i = 0; i < merged.length; i++) {
    if (!isVowel(merged[i])) {
      cCount++;
      if (cCount > preset.maxC) {
        merged = merged.slice(0, i) + preset.epenthetic + merged.slice(i);
        break;
      }
    } else cCount = 0;
  }
  return merged.length > targetLength ? merged.slice(0, targetLength) : merged;
}

function initializeExtendedLexicon(config) {
  const lexicon = {};
  const meanLen = config.meanLength || 5;
  const stdDev = config.stdDev || 1.2;

  // 1. Core Keys
  CORE_DICTIONARY_KEYS.forEach(item => {
    lexicon[item.key] = generateRootWord(config.desc, getBoxMullerLength(meanLen, stdDev), config.customVowels, config.customConsonants);
  });

  // 2. Cultural Domain Vocabulary Injection (up to 600+ words)
  const activeDomain = CULTURAL_EXPANSION_DOMAINS[config.culture] || CULTURAL_EXPANSION_DOMAINS.renaissance;
  activeDomain.forEach(term => {
    lexicon[term] = generateRootWord(config.desc, getBoxMullerLength(meanLen, stdDev), config.customVowels, config.customConsonants);
  });

  // 3. Compound Expansion Loop
  let keys = Object.keys(lexicon);
  let idx = 1;
  while (Object.keys(lexicon).length < 620) {
    let k1 = getRandomItem(keys);
    let k2 = getRandomItem(keys);
    if (k1 !== k2) {
      let comp = fuseWords(lexicon[k1], lexicon[k2], config.desc, Math.round(meanLen * 1.5));
      let compKey = `${k1}_${k2}_${idx++}`;
      lexicon[compKey] = comp;
    }
  }

  return lexicon;
}

function translatePhrase(englishWordsArray, lexicon, grammarRules) {
  let subject = "", verb = "", object = "", adjective = "";
  let isNegative = false, isQuestion = false;

  englishWordsArray.forEach(token => {
    let raw = token.toLowerCase().trim();
    if (raw === "not" || raw === "no") { isNegative = true; return; }
    if (raw === "?") { isQuestion = true; return; }

    let translated = lexicon[raw] || raw;

    if (["i", "you", "he", "we", "they", "person", "physician", "academy", "city", "map", "coin", "road", "gate"].includes(raw)) {
      if (!subject) subject = translated; else object = translated;
    } else if (["be", "see", "seek", "buy", "pay", "have", "go", "show", "know", "give"].includes(raw)) {
      verb = translated;
    } else if (["good", "new", "clean", "near", "safe"].includes(raw)) {
      adjective = translated;
    } else {
      object = translated;
    }
  });

  let fullObject = object;
  if (object && adjective) {
    fullObject = (grammarRules.adjPosition === "BEFORE") ? `${adjective} ${object}` : `${object} ${adjective}`;
  }

  if (isNegative && verb) {
    let negPart = lexicon["not"] || "not";
    verb = `${negPart} ${verb}`;
  }

  let ordered = [];
  const wordOrder = grammarRules.wordOrder || "SVO";
  if (wordOrder === "SVO") ordered = [subject, verb, fullObject];
  else if (wordOrder === "SOV") ordered = [subject, fullObject, verb];
  else if (wordOrder === "OVS") ordered = [fullObject, verb, subject];

  ordered = ordered.filter(w => w && w.trim().length > 0);

  if (isQuestion) {
    let quesPart = lexicon["ques"] || "ques";
    ordered.unshift(quesPart);
  }

  return ordered.join(" ").replace(/\s+/g, " ").trim();
}

function executeConlangPipeline(config) {
  const grammarRules = {
    wordOrder: (config.culture === 'ancient' || config.culture === 'primitive') ? 'SOV' : (config.culture === 'alien' ? 'OVS' : 'SVO'),
    adjPosition: (config.culture === 'primitive' || config.culture === 'ancient') ? 'BEFORE' : 'AFTER'
  };

  const lexicon = initializeExtendedLexicon(config);

  // Section A: 35 Survival Phrases
  const sectionA35 = PHRASEBOOK_TEMPLATES.map((item, i) => ({
    id: i + 1,
    block: item.block,
    en: item.text.join(" "),
    conlang: translatePhrase(item.text, lexicon, grammarRules)
  }));

  // Section B: 20 Mini-Dialogues
  const sectionB20 = DIALOGUE_TEMPLATES_20.map(template => ({
    id: template.id,
    context: template.contextTags[config.culture] || `Dialogo #${template.id}`,
    turns: template.turns.map(turn => ({
      speaker: turn.speaker,
      en: turn.text.join(" "),
      conlang: translatePhrase(turn.text, lexicon, grammarRules)
    }))
  }));

  return {
    metadata: config,
    grammarRules: grammarRules,
    lexicon: lexicon,
    sectionA35: sectionA35,
    sectionB20: sectionB20
  };
}
