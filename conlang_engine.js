/**
 * CONLANG ENGINE CORE MODULE - v4.0.0
 * Pure Algorithmic Runtime Engine (Zero Static Translations)
 */

// ============================================================================
// 1. CONFIGURAZIONE FONOTATTICA ED ESTETICA
// ============================================================================

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

// ============================================================================
// 2. CORE LEXICON: I 60 LEMMI PRIMITIVI BASE
// ============================================================================

const PRIMITIVE_ROOT_KEYS = [
  // Pronomi e Particelle
  { key: "i", en: "I / me", pos: "PRON" },
  { key: "you", en: "you", pos: "PRON" },
  { key: "he", en: "he / she", pos: "PRON" },
  { key: "we", en: "we", pos: "PRON" },
  { key: "they", en: "they", pos: "PRON" },
  { key: "not", en: "not / negation", pos: "PART" },
  { key: "ques", en: "question marker", pos: "PART" },
  { key: "this", en: "this", pos: "DET" },
  { key: "that", en: "that", pos: "DET" },
  
  // Elementi Primordiali e Nomi Base
  { key: "person", en: "person / human", pos: "N" },
  { key: "head", en: "head / top", pos: "N" },
  { key: "eye", en: "eye / vision", pos: "N" },
  { key: "hand", en: "hand / grip", pos: "N" },
  { key: "water", en: "water / fluid", pos: "N" },
  { key: "fire", en: "fire / heat", pos: "N" },
  { key: "earth", en: "earth / ground", pos: "N" },
  { key: "sky", en: "sky / air", pos: "N" },
  { key: "stone", en: "stone / rock", pos: "N" },
  { key: "tree", en: "tree / wood", pos: "N" },
  { key: "beast", en: "beast / animal", pos: "N" },
  { key: "blood", en: "blood / life", pos: "N" },
  { key: "sun", en: "sun / light", pos: "N" },
  { key: "night", en: "night / dark", pos: "N" },
  { key: "road", en: "road / path", pos: "N" },
  { key: "house", en: "shelter / house", pos: "N" },
  { key: "city", en: "settlement / city", pos: "N" },
  { key: "food", en: "food / meat", pos: "N" },
  { key: "medicine", en: "herb / medicine", pos: "N" },
  { key: "coin", en: "metal / coin", pos: "N" },
  { key: "book", en: "mark / book", pos: "N" },
  { key: "wall", en: "wall / barrier", pos: "N" },
  { key: "gate", en: "door / gate", pos: "N" },
  { key: "peace", en: "peace / calm", pos: "N" },
  { key: "war", en: "war / fight", pos: "N" },

  // Verbi Primari
  { key: "be", en: "to be / exist", pos: "V" },
  { key: "have", en: "to have / hold", pos: "V" },
  { key: "go", en: "to go / walk", pos: "V" },
  { key: "see", en: "to see / look", pos: "V" },
  { key: "seek", en: "to seek / search", pos: "V" },
  { key: "give", en: "to give / offer", pos: "V" },
  { key: "buy", en: "to buy / trade", pos: "V" },
  { key: "pay", en: "to pay / tribute", pos: "V" },
  { key: "show", en: "to show / reveal", pos: "V" },
  { key: "know", en: "to know / understand", pos: "V" },
  { key: "fall", en: "to fall / drop", pos: "V" },
  { key: "speak", en: "to speak / talk", pos: "V" },
  { key: "make", en: "to make / build", pos: "V" },

  // Aggettivi Base
  { key: "good", en: "good / valid", pos: "ADJ" },
  { key: "bad", en: "bad / danger", pos: "ADJ" },
  { key: "big", en: "big / great", pos: "ADJ" },
  { key: "small", en: "small / little", pos: "ADJ" },
  { key: "new", en: "new / fresh", pos: "ADJ" },
  { key: "old", en: "old / ancient", pos: "ADJ" },
  { key: "near", en: "near / close", pos: "ADJ" },
  { key: "far", en: "far / distant", pos: "ADJ" },
  { key: "clean", en: "clean / pure", pos: "ADJ" },
  { key: "safe", en: "safe / calm", pos: "ADJ" }
];

// ============================================================================
// 3. CONCEPT MARKET: MAPPA DEI DERIVATI SEMANTICI (LEGO MATRIX)
// ============================================================================

const CONCEPT_MARKET = [
  { id: "landslide_earthquake", roots: ["earth", "fall"], pos: "N", meanings: { primitive: "terremoto", medieval: "frana", scholarly: "movimento tellurico", renaissance: "spostamento sismico", alien: "collasso sismico" } },
  { id: "study_learn", roots: ["go", "city"], pos: "V", meanings: { primitive: "ascoltare anziani", medieval: "apprendere arte", scholarly: "studiare all'ateneo", renaissance: "frequentare accademia", alien: "assorbire matrice" } },
  { id: "tear_sorrow", roots: ["eye", "water"], pos: "N", meanings: { primitive: "pianto", medieval: "lacrima", scholarly: "cordoglio", renaissance: "malinconia", alien: "secrezione oculare" } },
  { id: "doctor_healer", roots: ["person", "medicine"], pos: "N", meanings: { primitive: "sciamano", medieval: "cerusico", scholarly: "medico", renaissance: "anatomista", alien: "unità riparazione" } },
  { id: "aqueduct_fountain", roots: ["water", "city"], pos: "N", meanings: { primitive: "sorgente", medieval: "pozzo", scholarly: "acquedotto", renaissance: "fontana monumentale", alien: "condotto fluido" } },
  { id: "chief_leader", roots: ["head", "person"], pos: "N", meanings: { primitive: "capo tribù", medieval: "signore del castello", scholarly: "rettore", renaissance: "magistrato", alien: "nodo primario" } },
  { id: "academy_school", roots: ["house", "book"], pos: "N", meanings: { primitive: "caverna sacra", medieval: "monastero", scholarly: "ateneo", renaissance: "accademia delle arti", alien: "archivio dati" } },
  { id: "map_chart", roots: ["book", "road"], pos: "N", meanings: { primitive: "segno su pelle", medieval: "mappa della contea", scholarly: "portolano", renaissance: "carta geografica", alien: "matrice spaziale" } },
  { id: "soldier_guard", roots: ["person", "war"], pos: "N", meanings: { primitive: "guerriero", medieval: "armigero", scholarly: "guardia urbana", renaissance: "soldato di ventura", alien: "drone difensivo" } },
  { id: "astronomy_sky", roots: ["sky", "see"], pos: "N", meanings: { primitive: "presagio stelle", medieval: "astrologia", scholarly: "astronomia", renaissance: "osservazione telescopica", alien: "navigazione stellare" } }
];

// ============================================================================
// 4. GENERATORE FONETICO SILLABICO (BOX-MULLER & SANDHI)
// ============================================================================

function getGaussianLength(mean, stdDev) {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  let len = Math.round(mean + z0 * stdDev);
  return Math.max(2, Math.min(12, len));
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isVowel(ch) {
  return ['a', 'e', 'i', 'o', 'u', 'y'].includes(ch.toLowerCase());
}

function generateSyllable(style = 'none', targetLength = 5, customVowels = [], customConsonants = []) {
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

function fuseWords(rootA, rootB, style = 'none') {
  const preset = PHONETICS_PRESETS[style] || PHONETICS_PRESETS.none;

  // Degeminazione: elisione duplicati tra fine rootA e inizio rootB
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

  // Inserimento vocale epentetica se lo stile è musicale e si scontrano consonanti
  if (!isVowel(lastCharA) && !isVowel(firstCharB)) {
    if (style === 'musical') {
      merged = rootA + preset.epenthetic + rootB;
    } else if (style === 'harsh' && lastCharA.toLowerCase() === firstCharB.toLowerCase()) {
      merged = rootA.slice(0, -1) + rootB;
    }
  }

  // Verifica cluster consonantici massimi
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

  return merged;
}

// ============================================================================
// 5. PARSER DI TRADUZIONE SINTATTICA REALE (translatePhrase)
// ============================================================================

function translatePhrase(englishTokensArray, lexicon, grammarRules) {
  let subject = "", verb = "", object = "", adjective = "";
  let isNegative = false, isQuestion = false;

  englishTokensArray.forEach(token => {
    let raw = token.toLowerCase().trim();
    if (raw === "not" || raw === "no") { isNegative = true; return; }
    if (raw === "?") { isQuestion = true; return; }

    // Cerca la parola nel dizionario calcolato a runtime
    let translated = lexicon[raw] || lexicon[`${raw}_base`] || raw;

    // Assegnazione ruoli sintattici
    if (["i", "you", "he", "we", "they", "person", "chief_leader", "doctor_healer", "soldier_guard"].includes(raw)) {
      if (!subject) subject = translated; else object = translated;
    } else if (["be", "see", "seek", "buy", "pay", "have", "go", "show", "know", "give", "study_learn"].includes(raw)) {
      verb = translated;
    } else if (["good", "bad", "new", "old", "near", "safe", "clean"].includes(raw)) {
      adjective = translated;
    } else {
      object = translated;
    }
  });

  // Sintagma Nominale (Nome + Aggettivo)
  let fullObject = object;
  if (object && adjective) {
    fullObject = (grammarRules.adjPosition === "BEFORE") ? `${adjective} ${object}` : `${object} ${adjective}`;
  }

  // Negazione
  if (isNegative && verb) {
    let negPart = lexicon["not"] || "not";
    verb = `${negPart} ${verb}`;
  }

  // Ordinamento Sintattico (SVO, SOV, OVS)
  let ordered = [];
  const wordOrder = grammarRules.wordOrder || "SVO";
  if (wordOrder === "SVO") ordered = [subject, verb, fullObject];
  else if (wordOrder === "SOV") ordered = [subject, fullObject, verb];
  else if (wordOrder === "OVS") ordered = [fullObject, verb, subject];

  ordered = ordered.filter(w => w && w.trim().length > 0);

  // Inserimento Particella Interrogativa all'inizio
  if (isQuestion) {
    let quesPart = lexicon["ques"] || "ques";
    ordered.unshift(quesPart);
  }

  return ordered.join(" ").replace(/\s+/g, " ").trim();
}

// ============================================================================
// 6. SCHEMI LOGICI DEI 20 DIALOGHI (DIALOGUE TEMPLATES)
// ============================================================================

const DIALOGUE_SCHEMAS_20 = [
  { id: 1, textA1: ["you", "seek", "chief_leader", "?"], textB1: ["i", "seek", "doctor_healer"], textA2: ["you", "have", "coin"], textB2: ["i", "pay", "coin"] },
  { id: 2, textA1: ["you", "have", "map_chart", "?"], textB1: ["i", "have", "good", "map_chart"], textA2: ["i", "buy", "map_chart"], textB2: ["you", "pay", "coin"] },
  { id: 3, textA1: ["you", "go", "to", "academy_school", "?"], textB1: ["i", "go", "to", "study_learn"], textA2: ["academy_school", "be", "near"], textB2: ["i", "give", "peace"] },
  { id: 4, textA1: ["soldier_guard", "see", "you"], textB1: ["i", "be", "good", "person"], textA2: ["you", "have", "coin", "?"], textB2: ["i", "give", "coin"] },
  { id: 5, textA1: ["ques", "where", "be", "aqueduct_fountain", "?"], textB1: ["aqueduct_fountain", "be", "near", "city"], textA2: ["water", "be", "clean", "?"], textB2: ["water", "be", "good"] },
  { id: 6, textA1: ["you", "seek", "food", "?"], textB1: ["i", "seek", "clean", "water"], textA2: ["i", "have", "food"], textB2: ["i", "buy", "food"] },
  { id: 7, textA1: ["ques", "you", "know", "astronomy_sky", "?"], textB1: ["i", "see", "sky"], textA2: ["this", "book", "be", "good"], textB2: ["i", "buy", "book"] },
  { id: 8, textA1: ["doctor_healer", "be", "here", "?"], textB1: ["doctor_healer", "be", "in", "house"], textA2: ["i", "have", "bad", "blood"], textB2: ["doctor_healer", "give", "medicine"] },
  { id: 9, textA1: ["you", "pay", "tribute", "?"], textB1: ["i", "have", "not", "coin"], textA2: ["soldier_guard", "be", "near"], textB2: ["i", "pay", "coin"] },
  { id: 10, textA1: ["ques", "you", "see", "landslide_earthquake", "?"], textB1: ["earth", "fall", "near", "road"], textA2: ["road", "be", "safe", "?"], textB2: ["road", "be", "not", "safe"] },
  { id: 11, textA1: ["you", "sell", "medicine", "?"], textB1: ["i", "have", "good", "medicine"], textA2: ["i", "buy", "medicine"], textB2: ["you", "give", "coin"] },
  { id: 12, textA1: ["ques", "chief_leader", "be", "in", "city", "?"], textB1: ["chief_leader", "be", "in", "house"], textA2: ["i", "seek", "chief_leader"], textB2: ["soldier_guard", "show", "road"] },
  { id: 13, textA1: ["you", "have", "new", "book", "?"], textB1: ["i", "make", "new", "book"], textA2: ["i", "buy", "book"], textB2: ["you", "pay", "coin"] },
  { id: 14, textA1: ["ques", "where", "be", "gate", "?"], textB1: ["gate", "be", "near", "wall"], textA2: ["gate", "be", "open", "?"], textB2: ["gate", "be", "not", "open"] },
  { id: 15, textA1: ["you", "go", "in", "peace", "?"], textB1: ["i", "give", "peace"], textA2: ["you", "seek", "house", "?"], textB2: ["i", "seek", "house"] },
  { id: 16, textA1: ["ques", "you", "see", "war", "?"], textB1: ["war", "be", "far"], textA2: ["city", "be", "safe", "?"], textB2: ["city", "be", "safe"] },
  { id: 17, textA1: ["you", "have", "clean", "water", "?"], textB1: ["i", "have", "water"], textA2: ["i", "pay", "coin"], textB2: ["i", "give", "water"] },
  { id: 18, textA1: ["ques", "you", "know", "this", "person", "?"], textB1: ["i", "know", "this", "person"], textA2: ["person", "be", "good", "?"], textB2: ["person", "be", "good"] },
  { id: 19, textA1: ["you", "make", "map_chart", "?"], textB1: ["i", "show", "map_chart"], textA2: ["map_chart", "be", "good"], textB2: ["i", "buy", "map_chart"] },
  { id: 20, textA1: ["ques", "we", "go", "to", "city", "?"], textB1: ["we", "go", "now"], textA2: ["road", "be", "good", "?"], textB2: ["road", "be", "safe"] }
];

// SCHEMI DELLE 35 FRASI DI SOPRAVVIVENZA
const SURVIVAL_SCHEMAS_35 = [
  // Blocco 1: Saluti e Identità
  { block: "Saluti e Identità", text: ["i", "be", "person"] },
  { block: "Saluti e Identità", text: ["we", "go", "in", "peace"] },
  { block: "Saluti e Identità", text: ["i", "show", "good", "peace"] },
  { block: "Saluti e Identità", text: ["he", "be", "chief_leader"] },
  { block: "Saluti e Identità", text: ["we", "seek", "safe", "house"] },
  { block: "Saluti e Identità", text: ["i", "give", "new", "coin"] },
  { block: "Saluti e Identità", text: ["you", "be", "good", "person"] },
  // Blocco 2: Orientamento e Luoghi
  { block: "Orientamento e Luoghi", text: ["ques", "you", "show", "road", "?"] },
  { block: "Orientamento e Luoghi", text: ["ques", "where", "be", "city", "?"] },
  { block: "Orientamento e Luoghi", text: ["road", "be", "near"] },
  { block: "Orientamento e Luoghi", text: ["we", "go", "to", "academy_school"] },
  { block: "Orientamento e Luoghi", text: ["ques", "where", "be", "aqueduct_fountain", "?"] },
  { block: "Orientamento e Luoghi", text: ["gate", "be", "near"] },
  { block: "Orientamento e Luoghi", text: ["i", "seek", "house"] },
  // Blocco 3: Bisogni e Sopravvivenza
  { block: "Bisogni e Sopravvivenza", text: ["i", "seek", "clean", "water"] },
  { block: "Bisogni e Sopravvivenza", text: ["we", "have", "not", "food"] },
  { block: "Bisogni e Sopravvivenza", text: ["ques", "where", "be", "doctor_healer", "?"] },
  { block: "Bisogni e Sopravvivenza", text: ["i", "have", "not", "safe", "house"] },
  { block: "Bisogni e Sopravvivenza", text: ["give", "us", "fire"] },
  { block: "Bisogni e Sopravvivenza", text: ["we", "buy", "good", "medicine"] },
  { block: "Bisogni e Sopravvivenza", text: ["i", "be", "near", "bad"] },
  // Blocco 4: Commercio e Tributi
  { block: "Commercio e Tributi", text: ["ques", "you", "buy", "this", "map_chart", "?"] },
  { block: "Commercio e Tributi", text: ["i", "pay", "new", "coin"] },
  { block: "Commercio e Tributi", text: ["we", "give", "coin"] },
  { block: "Commercio e Tributi", text: ["this", "book", "be", "good"] },
  { block: "Commercio e Tributi", text: ["i", "buy", "this", "food"] },
  { block: "Commercio e Tributi", text: ["ques", "you", "have", "coin", "?"] },
  { block: "Commercio e Tributi", text: ["we", "buy", "in", "peace"] },
  // Blocco 5: Pericolo e Allarmi
  { block: "Pericolo e Allarmi", text: ["fire", "be", "near"] },
  { block: "Pericolo e Allarmi", text: ["beast", "be", "near"] },
  { block: "Pericolo e Allarmi", text: ["i", "know", "not", "word"] },
  { block: "Pericolo e Allarmi", text: ["soldier_guard", "be", "near"] },
  { block: "Pericolo e Allarmi", text: ["go", "to", "earth"] },
  { block: "Pericolo e Allarmi", text: ["not", "go", "to", "road"] },
  { block: "Pericolo e Allarmi", text: ["ques", "you", "see", "war", "?"] }
];

// ============================================================================
// 7. COMPILATORE FINALE PIPELINE
// ============================================================================

function executeConlangPipeline(config) {
  const grammarRules = {
    wordOrder: (config.culture === 'ancient' || config.culture === 'primitive') ? 'SOV' : (config.culture === 'alien' ? 'OVS' : 'SVO'),
    adjPosition: (config.culture === 'primitive' || config.culture === 'ancient') ? 'BEFORE' : 'AFTER'
  };

  const lexicon = {};
  const meanLen = config.meanLength || 5;
  const stdDev = config.stdDev || 1.2;

  // 1. Popola i 60 suoni base con Box-Muller e Fonotattica
  PRIMITIVE_ROOT_KEYS.forEach(item => {
    let targetLen = getGaussianLength(meanLen, stdDev);
    lexicon[item.key] = generateSyllable(config.desc, targetLen, config.customVowels, config.customConsonants);
  });

  // 2. Deriva i composti semantici tramite CONCEPT_MARKET e Sandhi
  CONCEPT_MARKET.forEach(item => {
    let r1 = lexicon[item.roots[0]] || generateSyllable(config.desc, 4);
    let r2 = lexicon[item.roots[1]] || generateSyllable(config.desc, 4);
    lexicon[item.id] = fuseWords(r1, r2, config.desc);
  });

  // 3. Traduce le 35 Frasi di Sopravvivenza a runtime
  const sectionA35 = SURVIVAL_SCHEMAS_35.map((item, idx) => ({
    id: idx + 1,
    block: item.block,
    enTokens: item.text.join(" "),
    conlang: translatePhrase(item.text, lexicon, grammarRules)
  }));

  // 4. Traduce i 20 Dialoghi (80 battute uniche) a runtime
  const sectionB20 = DIALOGUE_SCHEMAS_20.map(schema => {
    let ctxMap = {
      primitive: "Accampamento della Tribù",
      ancient: "Piazza del Tempio",
      medieval: "Portone del Castello",
      renaissance: "Bottega e Studio",
      alien: "Modulo Stasi Dati"
    };
    return {
      id: schema.id,
      context: `${ctxMap[config.culture] || "Interazione"} #${schema.id}`,
      turns: [
        { speaker: "A", en: schema.textA1.join(" "), conlang: translatePhrase(schema.textA1, lexicon, grammarRules) },
        { speaker: "B", en: schema.textB1.join(" "), conlang: translatePhrase(schema.textB1, lexicon, grammarRules) },
        { speaker: "A", en: schema.textA2.join(" "), conlang: translatePhrase(schema.textA2, lexicon, grammarRules) },
        { speaker: "B", en: schema.textB2.join(" "), conlang: translatePhrase(schema.textB2, lexicon, grammarRules) }
      ]
    };
  });

  return {
    metadata: config,
    grammarRules: grammarRules,
    lexicon: lexicon,
    sectionA35: sectionA35,
    sectionB20: sectionB20
  };
}
