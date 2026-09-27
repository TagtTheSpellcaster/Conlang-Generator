/**
 * CONLANG ENGINE CORE MODULE - v3.3.0
 * Pure JavaScript Engine for Phonotactics, Lexicon & Dynamic Translation
 */

const PHONETICS_PRESETS = {
  harsh: {
    vowels: ['a', 'u'],
    consonants: ['p', 't', 'k', 'ts', 'tr', 'gr', 'kr'],
    syllables: ['CCVC', 'CVCC'],
    maxC: 3,
    epenthetic: 'a'
  },
  musical: {
    vowels: ['a', 'e', 'i', 'o'],
    consonants: ['l', 'r', 'm', 'n', 'v', 's'],
    syllables: ['CV', 'V'],
    maxC: 1,
    epenthetic: 'i'
  },
  dark: {
    vowels: ['u', 'o', 'a'],
    consonants: ['k', 'g', 'q', 'x', 'r', 'z', 'kh'],
    syllables: ['CVC', 'CCV'],
    maxC: 3,
    epenthetic: 'u'
  },
  magic: {
    vowels: ['a', 'i', 'e', 'ae'],
    consonants: ['s', 'sh', 'h', 'f', 'l', 'm', 'th'],
    syllables: ['CV', 'CVC'],
    maxC: 2,
    epenthetic: 'e'
  },
  renaissance: {
    vowels: ['a', 'e', 'i', 'o'],
    consonants: ['t', 's', 'p', 'k', 'm', 'n', 'r', 'l', 'g'],
    syllables: ['CV', 'CVC'],
    maxC: 2,
    epenthetic: 'e'
  },
  aquatic: {
    vowels: ['a', 'i', 'u', 'o'],
    consonants: ['m', 'n', 'l', 'w', 'f', 'v', 'bh'],
    syllables: ['CV', 'CVC'],
    maxC: 2,
    epenthetic: 'u'
  },
  none: {
    vowels: ['a', 'e', 'i', 'o', 'u'],
    consonants: ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 's', 'r', 'l'],
    syllables: ['CV', 'CVC'],
    maxC: 2,
    epenthetic: 'e'
  }
};

const CONCEPT_MARKET = [
  {
    id: "landslide_earthquake",
    roots: ["earth", "fall"],
    pos: "N",
    category: "Domain_Nature",
    cultureMeanings: {
      primitive: "terremoto / terra che trema",
      medieval: "frana sulla strada",
      scholarly: "spostamento tettonico",
      renaissance: "movimento tellurico",
      alien: "instabilità sismica planetaria"
    }
  },
  {
    id: "study_learn",
    roots: ["go", "academy"],
    pos: "V",
    category: "Domain_Science",
    cultureMeanings: {
      primitive: "ascoltare gli anziani",
      medieval: "apprendistato presso la gilda",
      scholarly: "studiare all'ateneo",
      renaissance: "frequentare l'accademia",
      alien: "assorbire matrice dati"
    }
  },
  {
    id: "tear_sorrow",
    roots: ["eye", "water"],
    pos: "N",
    category: "Domain_Society",
    cultureMeanings: {
      primitive: "acqua degli occhi",
      medieval: "lacrima di pena",
      scholarly: "espressione di cordoglio",
      renaissance: "malinconia",
      alien: "sovraccarico sensoriale"
    }
  },
  {
    id: "aqueduct_fountain",
    roots: ["water", "city"],
    pos: "N",
    category: "Domain_Architecture",
    cultureMeanings: {
      primitive: "fiume dell'accampamento",
      medieval: "pozzo cittadino",
      scholarly: "acquedotto civico",
      renaissance: "fontana monumentale",
      alien: "condotto idrico"
    }
  },
  {
    id: "doctor_healer",
    roots: ["person", "medicine"],
    pos: "N",
    category: "Domain_Society",
    cultureMeanings: {
      primitive: "sciamano della tribù",
      medieval: "cerusico",
      scholarly: "dottore in medicina",
      renaissance: "medico / anatomista",
      alien: "unità di riparazione"
    }
  }
];

const DIALOGUE_TEMPLATES = [
  {
    id: 1,
    contextTags: {
      primitive: "Incontro tra cacciatori al confine",
      medieval: "Controllo d'accesso alla porta del castello",
      scholarly: "Ingresso principale dell'ateneo",
      renaissance: "Checkpoint della guardia cittadina",
      alien: "Sincronizzazione al portale di stasi"
    },
    turns: [
      { speaker: "A", text: ["you", "seek", "academy", "?"] },
      { speaker: "B", text: ["I", "seek", "physician"] },
      { speaker: "A", text: ["you", "have", "coin"] },
      { speaker: "B", text: ["I", "pay", "coin"] }
    ]
  },
  {
    id: 2,
    contextTags: {
      primitive: "Scambio di pelli presso il ruscello",
      medieval: "Trattativa con il mercante di spezie",
      scholarly: "Acquisto di un manoscritto raro",
      renaissance: "Acquisto della mappa astronomica in bottega",
      alien: "Scambio di mattonelle dati"
    },
    turns: [
      { speaker: "A", text: ["you", "have", "map", "?"] },
      { speaker: "B", text: ["I", "have", "good", "map"] },
      { speaker: "A", text: ["I", "buy", "map"] },
      { speaker: "B", text: ["you", "pay", "coin"] }
    ]
  }
];

const CORE_DICTIONARY_KEYS = [
  { key: "i", en: "I", pos: "PRON" },
  { key: "you", en: "you", pos: "PRON" },
  { key: "you_formal", en: "you (formal)", pos: "PRON" },
  { key: "he", en: "he", pos: "PRON" },
  { key: "not", en: "not", pos: "PART" },
  { key: "ques", en: "ques", pos: "PART" },
  { key: "be", en: "be", pos: "V" },
  { key: "see", en: "see", pos: "V" },
  { key: "seek", en: "seek", pos: "V" },
  { key: "buy", en: "buy", pos: "V" },
  { key: "pay", en: "pay", pos: "V" },
  { key: "have", en: "have", pos: "V" },
  { key: "go", en: "go", pos: "V" },
  { key: "show", en: "show", pos: "V" },
  { key: "person", en: "person", pos: "N" },
  { key: "physician", en: "physician", pos: "N" },
  { key: "academy", en: "academy", pos: "N" },
  { key: "city", en: "city", pos: "N" },
  { key: "map", en: "map", pos: "N" },
  { key: "coin", en: "coin", pos: "N" },
  { key: "water", en: "water", pos: "N" },
  { key: "eye", en: "eye", pos: "N" },
  { key: "earth", en: "earth", pos: "N" },
  { key: "fall", en: "fall", pos: "N" },
  { key: "medicine", en: "medicine", pos: "N" },
  { key: "good", en: "good", pos: "ADJ" }
];

function getBoxMullerLength(mean, stdDev) {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  let len = Math.round(mean + z0 * stdDev);
  return Math.max(2, Math.min(15, len));
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isVowel(ch) {
  return ['a', 'e', 'i', 'o', 'u', 'y'].includes(ch.toLowerCase());
}

function generateRootWord(style = 'none', targetLength = 5, customVowels = [], customConsonants = []) {
  const preset = PHONETICS_PRESETS[style] || PHONETICS_PRESETS.none;
  const vowels = customVowels.length ? customVowels : preset.vowels;
  const consonants = customConsonants.length ? customConsonants : preset.consonants;
  const structures = preset.syllables;

  let word = "";
  let attempts = 0;

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
    if (style === 'musical') {
      merged = rootA + preset.epenthetic + rootB;
    } else if (style === 'harsh') {
      if (lastCharA.toLowerCase() === firstCharB.toLowerCase()) {
        merged = rootA.slice(0, -1) + rootB;
      }
    }
  }

  let cCount = 0;
  for (let i = 0; i < merged.length; i++) {
    if (!isVowel(merged[i])) {
      cCount++;
      if (cCount > preset.maxC) {
        merged = merged.slice(0, i) + preset.epenthetic + merged.slice(i);
        break;
      }
    } else {
      cCount = 0;
    }
  }

  return merged.length > targetLength ? merged.slice(0, targetLength) : merged;
}

function initializeLexicon(config) {
  const lexicon = {};
  const meanLen = config.meanLength || 5;
  const stdDev = config.stdDev || 1.2;

  CORE_DICTIONARY_KEYS.forEach(item => {
    let targetLen = getBoxMullerLength(meanLen, stdDev);
    lexicon[item.key] = generateRootWord(
      config.desc, 
      targetLen, 
      config.customVowels, 
      config.customConsonants
    );
  });

  CONCEPT_MARKET.forEach(item => {
    let r1 = lexicon[item.roots[0]] || generateRootWord(config.desc, 4);
    let r2 = lexicon[item.roots[1]] || generateRootWord(config.desc, 4);
    let fused = fuseWords(r1, r2, config.desc, Math.round(meanLen * 1.5));
    lexicon[item.id] = fused;
  });

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

    if (["i", "you", "he", "we", "they", "person", "physician", "academy", "city", "map", "coin"].includes(raw)) {
      if (!subject) subject = translated; else object = translated;
    } else if (["be", "see", "seek", "buy", "pay", "have", "go", "show"].includes(raw)) {
      verb = translated;
    } else if (["good", "new", "clean"].includes(raw)) {
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

function compileDialogues(culture, style, lexicon, grammarRules) {
  return DIALOGUE_TEMPLATES.map(template => {
    let contextTitle = template.contextTags[culture] || template.contextTags["scholarly"];
    let turns = template.turns.map(turn => ({
      speaker: turn.speaker,
      englishTokens: turn.text.join(" "),
      conlangText: translatePhrase(turn.text, lexicon, grammarRules)
    }));

    return {
      id: template.id,
      context: contextTitle,
      turns: turns
    };
  });
}

function executeConlangPipeline(config) {
  const grammarRules = {
    wordOrder: (config.culture === 'ancient' || config.culture === 'primitive') ? 'SOV' : (config.culture === 'alien' ? 'OVS' : 'SVO'),
    adjPosition: (config.culture === 'primitive' || config.culture === 'ancient') ? 'BEFORE' : 'AFTER'
  };

  const lexicon = initializeLexicon(config);
  const compiledDialogues = compileDialogues(config.culture, config.desc, lexicon, grammarRules);

  return {
    metadata: config,
    grammarRules: grammarRules,
    lexicon: lexicon,
    dialogues: compiledDialogues
  };
}
