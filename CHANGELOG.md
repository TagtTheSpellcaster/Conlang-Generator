# Changelog

Versioning: `MAJOR.MINOR.PATCH`. MINOR increases for every new feature that does not overhaul the dictionary (patch resets to 0); PATCH increases for every bug fix. MAJOR changes only for a complete redesign. The number lives in `src/version.js` (shown in the page header and written in vocabulary exports); `package.json` must match, and a test checks both and the first entry below.

History before 1.6.0 is reconstructed from the development sessions; it was not tracked release by release.

## 1.16.0
- Calendar and time-measurement system (`src/calendar/`), with a new *Calendar* tab: logic table (each choice with the rule behind it), seasons, months, week, division of the day, short durations and time-keeping instruments, all named with the language's own words and numerals, plus a table of every time word of the dictionary by category.
- Rigidity grows with technology: nature-bound (no writing or clocks) → observed cycles and simple devices → fixed rules, canonical hours or bells → equal units and clocks. The era chosen by the user (else the genre's) sets it; no fixed 30-day months, epagomenal days, numbered hours or clocks before writing and calculation, while modern and later eras get numbered months, equal hours and decimal or 24 x 60 time.
- Further rules: intensive farming never uses a pure lunar year; herders get two pastures and moon phases; markets between villages give a short week named after them; the biome sets 2-3 (tropical), 4 (temperate) or 6-8 (polar) seasons; lunar calendars start the day at sunset; a restricted numeral system describes months and hours instead of numbering them.
- Day divisions: descriptive phases, unequal temporal hours (12 + 12), twelve animal double hours, night watches, ship watches with bells, canonical hours, five prayer times, equal hours, decimal time. Short durations: body actions, instruments or fractions of the hour.
- About 55 new time words in the dictionary (`tools/lexicon/12-time.txt`), filtered by the era like all other entries. The calendar is in the language sheet and the JSON export.

## 1.15.0
- Names: every word of every name now starts with a capital letter (epithet words, compound parts, markers). Letters with no capital form of their own are left as they are; esh, ezh, eng and similar symbols use their Unicode capitals (Ʃ, Ʒ, Ŋ).
- 30 selectable naming customs for personal names (Names tab, *Naming custom*), besides the genre default: single name, given + clan, given + epithet, title + given, Roman tria nomina, Greek (genitive + deme), Slavic patronymic, Icelandic, Gaelic Mac-/O-, Fitz-, Welsh "ap" chains, Scandinavian, Arabic nasab with nisba, Spanish double surname, East Asian family-first, North and South Indian, Sikh, Balinese birth order, Akan day names, Yoruba/Igbo circumstance names, teknonymy, Amazonian public and secret names, Native American nature name + clan, Ethiopian three-name chain, Mongolian clan and apotropaic names, Burmese day letters, Minangkabau matrilineal clan, necronymy, Inuit atiq.
- Markers ("son", "clan", day names, clan lists) are words of the language: taken from its lexicon when it has the word, otherwise made up once and kept fixed whatever the salt.

## 1.14.0
- Numeral system: each language gets a counting system drawn from the genre and the seed: decimal (about 70%), vigesimal, mixed decimal-vigesimal (French cut or Danish-type halves), quinary, restricted (1-2, 1-3 or 1-5, then "many"), and rare duodecimal and octal. Optional subtractive forms (19 = 20 − 1), units-before-tens order, and obligatory numeral classifiers (plural marking is then switched off).
- Gap-free (Greenberg) composition up to 999,999,999: every number has a form built from the roots; numeral entries of the lexicon follow the system and a restricted system drops what it cannot count. The numeral usually stands on the same side of the noun as the adjective (about 80%).
- New *Numerals* tab: system description, number converter with the parts of each number, table of cardinals and ordinals, classifier table. Four new controls in the Generation tab (system, variant, classifiers, position). Numerals are included in the export sheet and JSON.
- Four counting sentences in the universal set; restricted languages skip only those they cannot count (`notApplicableSamples`).

## 1.13.0
- Expanded letters: 11 groups of marked vowels and consonants (æ œ å ů ı ø; umlaut, acute, grave and circumflex vowels; þ ð ß ł; dot below, cedilla and tilde consonants). A language draws two or three letters of each chosen group (at most 4 extra vowels and 4 extra consonants), only those whose base letter it has. The letters are separate phonemes in roots, affixes and names.
- Ten genres use them by default (dwarven, sacred, orcish, giants, fey, draconic, infernal, arcane, undead, nomads); a new *Expanded letters* control in the Generation tab lets the user pick groups for any language.
- Word validity checks no longer assume a fixed list of vowels.

## 1.12.1
- Fix: the era and biome chosen by the user (or set by a genre) are now respected instead of only preferred. An entry is excluded when all its eras are later than the latest era chosen (no *plasma rifle* in a medieval war tongue; earlier and timeless words stay), and specialised words tied to biomes that were not chosen are left out. Sentences that need an excluded word are skipped instead of forcing it into the lexicon. Culture stays a preference.

## 1.12.0
- Proper-name generator (`src/names.js`) and a new *Names* tab: personal names, family/clan names, place names and epithets, built from the language's phonology (with the genre's sound bias) and, for meanings, from its own lexicon. Each of the 18 genres has its own naming custom and flavour words. The language sheet and the JSON export include a sample.

## 1.11.0
- Sentence grammar: yes/no questions with a question particle (final in head-final languages, initial otherwise), optative wishes (`May you live.`), subordinate clauses (complement and adverbial: `that`, `because`, `if`, `when`), comparatives (`longer than`) and verbal aspect (progressive, perfect).
- Agglutinative verbs gain optative, progressive and perfect suffixes; adjectives gain a comparative suffix. They are generated after the older affixes, so affixes of existing seeds do not change. Isolating and fusional languages use marker words (*may*, *more*, *than* and new progressive/perfect/question markers).
- 14 new universal frames (61 in total) and five new dictionary entries (question particle, progressive marker, perfect marker, *more*, *that* as complementizer; 6,695 entries). The sentence format gains `q=yn`, `mood=optative`, `cmp`, `/prog`, `/perf`, `comp=` and `adv=`.

## 1.10.0
- Language export: language sheet (standalone HTML, printable), Markdown, lexicon CSV and full-language JSON, from a button bar in the result panel (`src/export.js`).

## 1.9.0
- The vocabulary manager keeps only its differences from `data/vocabulary.json` (localStorage overlay) instead of a full copy; the generator uses the same edits; the old copy is migrated on first load.
- "Save to data/vocabulary.json" writes the merged dictionary back to the file (File System Access API, with a download fallback); "Download vocabulary.json" stays available.

## 1.8.0
- Choosing a genre also selects culture, biome and era in the Semantic profile, but only where the genre has a clear identity (marine: maritime + ocean; giant: alpine + prehistoric; machine: technocratic + futuristic; draconic: none). Selectors changed by hand are kept unless the genre names that dimension. Randomisation leaves the profile to the genre.

## 1.7.0
- Generation tab reorganised: three columns of equal height (genre + semantic profile + actions | phonology | morphosyntax); results in two balanced columns; tables no longer overflow their panels; the tab bar scrolls on narrow screens.
- Region selector removed (real-world regions made little sense for invented languages, only 51 entries used them, and "arctic" duplicated the biomes). The field stays in the dictionary data and in the vocabulary manager.
- Tags selector removed from the generator window (the engine still uses tags, for the genres). The Fantasy and Science fiction presets now fill culture and era instead of a tag.

## 1.6.0
- Universal sentences consolidated into 47 frames with alternatives (`My [hand|foot|head] hurts`, `I [hear|see|smell] you`, `Where is the [water|food|road]?`…): more example words and combinations per sentence without a longer list.
- New universal frames: question words (`[Where|When|Why] do you go?`), `[Look|Listen|Wait]!`, `Give me [water|food].`
- Sample sentences accept alternatives in every slot, including verbs and question words.

## 1.5.0
- Sample Sentences tab in two columns: Universal Sentences (by topic) and Specialised Sentences (by topic, per genre).
- Sentence sets rebuilt: universal sentences based on semantic primes and basic human needs, 20–39 specialised sentences for each of the 18 genres.
- Sentence sources in `tools/sentences/*.txt`, compiled and checked against the dictionary by `node tools/sentences/build.mjs`.
- A language always contains the dictionary senses its sentences need. README rewritten in English.

## 1.4.0
- 18 language genres (war, orcish, giant, marine, fey, draconic, dwarven, infernal, arcane, machine, hive, women's secret tongue, artisan, thieves, nomad, sacred, undead, merchant): structure defaults, sound bias and semantic weights.
- Dictionary expanded from 2,634 to about 6,600 entries (war, maritime, craft, magic, faith and more), built from `tools/lexicon/*.txt`.

## 1.3.0
- Consonant-cluster menus: separate onset and coda sets and a maximum cluster length.

## 1.2.0
- Agglutinative languages now really agglutinate: suffix chains on verbs (ability, negation, tense, agreement) and nouns (number, possessor, case), linking vowels, fusional verb endings, pro-drop. This fixed the defect that agglutinative languages only looked agglutinative.

## 1.1.0
- Project restructured into ES modules with a single schema (vocabulary schema 2), vocabulary audit and consolidation, vocabulary manager, automated tests.

## 1.0.0
- First version: single-page generator with phonology, basic morphology, lexicon, 50 fixed sample sentences.
