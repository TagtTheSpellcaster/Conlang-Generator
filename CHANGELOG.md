# Changelog

Versioning: `MAJOR.MINOR.PATCH`. MINOR increases for every new feature that does not overhaul the dictionary (patch resets to 0); PATCH increases for every bug fix. MAJOR changes only for a complete redesign. The number lives in `src/version.js` (shown in the page header and written in vocabulary exports); `package.json` must match, and a test checks both and the first entry below.

History before 1.6.0 is reconstructed from the development sessions; it was not tracked release by release.

## 1.30.0
- **Voice and valency** (`src/syntax/valency.js`): every language draws, from its seed, which of four operations it has and how it marks them. Passive (patient becomes subject, agent in a "by" phrase or dropped), antipassive (ergative languages only: patient demoted, agent in the intransitive subject case), causative (new subject; the old subject becomes the object of an intransitive verb, or a dative phrase if the verb has an object) and applicative (an oblique becomes the object, the old object becomes a dative phrase). Each is absent, a verb suffix right after the stem (agglutinative languages, 80% of their operations) or a particle before the verb (all other languages). Chances: passive 85%, antipassive 70% (ergative only), causative 90%, applicative 50%; at least one operation is always present. The suffix chain is now stem – voice – ability – negation – aspect – tense – agreement. The choices are shown in the Samples tab and the language sheet.
- **Case and agreement follow the new valency**: the patient of a passive and the agent of an antipassive take the intransitive subject case (absolutive or nominative); the causer of a clause with an object is ergative in ergative languages; the causee of an intransitive verb is a core object.
- **Frames**: `voice` (`active`, `passive`, `antipassive`, `causative`, `applicative`) and the new role `causer` (`toTemplate`). Templates carry `V.voice`; the sentence source accepts the flags `/passive`, `/antipassive`, `/causative`, `/applicative`. The realiser reports a sentence as unavailable when the language lacks the voice.
- **Dictionary**: four particles (`passive marker`, `antipassive marker`, `causative marker`, `applicative marker`). 7227 entries.
- **Sample sentences**: ten sentences on voice and valency (89 universal sentences).
- **Texts**: *The woman and the bread* (applicative, passive, causative); a line has an `alt` version in the active voice that a language without the construction uses, so the text stays complete.
- **Fix**: fourteen universal sentences (coordination, possession, relative clauses, embedded question, reflexive, negative indefinite) existed only in `data/sentence-templates.json`, so rebuilding the file from `tools/sentences` removed them; they are now kept in `tools/sentences/extra-universal.json` and the build reproduces the earlier file exactly. The voice sentences are in `tools/sentences/00b-universal-voice.txt`.
- Tests: `tests/valency.test.mjs`.

## 1.29.0
- **Name**: the program is now called **Tutlayin** (Constructed Language Workshop). The header shows the name in Tifinagh (ⵜⵓⵜⵍⴰⵢⵉⵏ) as a graphic only; the Noto Sans Tifinagh font is requested from Google Fonts, with system fallbacks. The file formats are labelled "Tutlayin language" and "Tutlayin vocabulary".
- **Direction of writing**: the direction is now chosen from the age of the language and the kind of script, with a Direction selector in the Writing tab (automatic, left to right, right to left, boustrophedon). Only the horizontal directions are counted. Right-to-left probability: 8.5% for modern or future languages (13 of about 153 living scripts), 21% with no information (37 of 175 scripts in Unicode, dead ones included), 40% for ancient ones (an estimate); abjads have higher odds, syllabaries and abugidas lower. Boustrophedon (alternate lines, mirrored letters): 0.5% to 3% growing with age. Previously only abjads could be right to left (60%).
- **Saving the script**: the HTML export now contains the whole Writing tab (signs, ligatures, numerals, reading rules, examples and sample sentences in the script), the Markdown export says where to find it, and the JSON export has the SVG of every sign, of the numerals and of eight sample sentences, with direction, boustrophedon and the odds used. The exports follow the writing system, direction and numerals chosen in the Writing tab.
- **Write a text**: a box in the Writing tab that writes what the user types in the script: words in the transcription of the language, numbers as digits (with the numerals of the language), English words found in the dictionary (a word of the language takes precedence over an English word); a report lists what cannot be written.
- **Cistercian numerals**: the standard system (lines only) and the early system (dots for 5 and 6, a triangle for 9, 3 and 4 swapped with 7 and 8; the early shapes are a reconstruction from a description), vertical or horizontal stave, groups of four digits for numbers of 10000 and more. They are used automatically by a few decimal languages (about 5%, more often sacred, arcane and old ones) and are always available from the Numerals selector of the Writing tab.
- **Light and dark theme**: selector at the top right (dark by default, light, or follow the system); the choice is kept in the browser.
- Tests: `tests/writing-direction.test.mjs`, `tests/cistercian.test.mjs`.

## 1.28.0
- **Reference and information structure** (`src/discourse/info.js`): every language now draws, from its seed, how it points at things and what it does with topic and focus. Demonstratives: one or two distance terms, before or after the noun, replacing the article. Reflexive: one word per person and number, or one word for all persons. Topic: unmarked, fronted, or fronted with a marker. Focus: unmarked, fronted, or followed by a marker. Particles are more likely in head-final languages. The choices are listed in the language sheet and in the Samples tab (`syntax.information`).
- **Realiser**: new template keys `dem` (`proximal`/`distal`), `refl` (reflexive object that copies the subject's person, number and pronoun class) and `info: { topic, focus }` (part names S, O, A, B). New dictionary words `topic marker` and `focus marker` (particles).
- **Texts**: a character that comes back after a gap takes a demonstrative ("that dog"); a character in the foreground is the possessor of "his dog" (possessive pronoun, or a genitive phrase if the character is not in the foreground); a reflexive line ("he washed himself"); a topic line and a dialogue with contrastive focus. Two new texts: *The man and his dog*, *Who saw whom*.
- **Derivations**: nine missing relations between participial adjectives and their verbs (broken < break, hidden < hide, woven < weave, lost < lose, bound < bind, dead < die, shot < shoot, fallen < fall, wounded < wound), so the pairs share a root in every language and in the history of the language. 1321 rules.
- Tests: `tests/information.test.mjs`.

## 1.27.0
- **Frames** (`src/syntax/frame.js`): sentences can now be described by roles (agent, experiencer, theme, patient, attribute, recipient, oblique, adjunct) instead of subject/object slots. `toTemplate` maps them to the template the realiser already understands (subject = agent ?? experiencer ?? theme; object = patient ?? attribute ?? theme when there is an agent; recipient = a "to" phrase), so case, agreement and word order still come from `clauseTokens`. `templateToFrame` is the reverse, for migrating hand-written templates. Voice other than active is refused until it is implemented.
- **Discourse state** (`src/discourse/state.js`): the tracking of characters (first mention, foreground, rivals of the same kind, topic) moved out of the texts into a reusable object.
- The five texts are now written as frames and compile to exactly the same templates as before (regression fixture `tests/fixtures/stories-templates.json`).
- Tests: `tests/frame.test.mjs` (all 489 templates survive template → frame → template; frames realise like their templates in accusative, ergative and case languages; discourse state).
- No change visible in the generated languages.

## 1.26.0
- **Semantic structure** (`src/semantics/colex.js`). Meanings are no longer one root each: about 6–10 pairs per language share a word (hand/arm, foot/leg, tree/wood, moon/month, man/husband, …) from a catalogue with the mechanism of the extension (part and whole, metonymy, metaphor, generalisation, role shift). The extended sense takes the root of the original one before derivation, so derived words follow. Colour terms follow Berlin–Kay stages (3 to 9 basic terms, optional "grue"); kinship is descriptive, sibling-like or classificatory. Forms of such entries are no longer unique: `entry.colex` / `entry.colexHeads` mark them, the Lexicon tab has a "Semantic structure" card.
- **Figurative expressions** (`src/semantics/idioms.js`): about a dozen idioms and kennings per language ("a long hand" = thief, "to hold one's tongue", "the road of the ships" = sea), realised with the language's own grammar.
- **Connected texts** (`src/discourse/texts.js`): three short texts per language (always one dialogue), with referring expressions decided by the discourse (a hunter → the hunter → he; pro-drop languages drop the pronoun), shown below the sample sentences.
- **History of the language** (`src/history/story.js`): a dated narrative of sound changes, contacts with donor languages and the words they left, the split from the sister, and the present state.
- **Sister language:** a new table of loanwords this language took and its sister did not (the sister keeps the inherited word).
- **Numeral glyphs:** in tally systems the five is now a large closed sign (cross, box, triangle, T) and the units are separate strokes, so 1, 5 and 6 are clearly different.
- Tests: `tests/semantics.test.mjs`, `tests/discourse.test.mjs`; uniqueness tests now exclude polysemous entries.

## 1.25.0
- **New graphics engine for scripts and numerals** (`src/graphics/`), replacing the random-walk glyph generator. Linguistic layers (spelling, inventories, cells, reading, ligature selection) are unchanged.
- **Tradition.** Each script has a writing technology (stone, clay, brush, broad pen, uniform line, chosen by genre), straight/curvilinear/geometric forms, proportions, slant, stroke width, terminals and a ductus (stroke order and direction). Strokes are drawn as outlines with width profiles that depend on the technology.
- **Glyph families.** Alphabet and abjad letters are built from a small radical library: one radical per class of consonant (labial, coronal, sibilant, dorsal, nasal, liquid, glide), members told apart by modifiers (bar, tick, dot…), ascender/descender stems by family, vowels with their own radicals, accented letters = base letter + diacritic.
- **Abugida:** vowels as signs placed by quality (above, below, after) or as strokes grown out of the consonant; optional headline; virama; conjunct = reduced first consonant; independent vowels on a carrier.
- **Abjad:** non-joining hand or cursive hand with a baseline, isolated/initial/medial/final forms, entry/exit strokes, letter classes that never join; vowel points. The Writing tab shows the joining forms.
- **Syllabary:** either the vowel is the orientation of the consonant shape, or syllables are blocks (consonant part + vowel part).
- **Words are drawn as one SVG** (right to left for abjads) instead of one box per cell.
- **Numeral glyphs** are separate from the numeral system (bases, words, math unchanged): derived from the script, autonomous, tally-based (strokes grouped by fives, zero a separate sign) or imported-and-adapted; no dot-and-bar notation. Digits are checked for distinctness and weight and redrawn if needed.
- Checks: signs must be distinguishable (several attempts per script), tests in `tests/graphics.test.mjs`.
- Limits: outlines are generated SVG, not a font; scripts do not derive from one another historically; alphabets are not cursive; visual quality is not guaranteed for every seed.

## 1.24.0
- **Inflection classes.** Fusional languages have 2-4 noun/adjective classes and 2-3 verb classes; agglutinative ones 1-2 (a second class overrides some endings). A word's class follows the last sound of its stem in the mother language, as with Latin theme vowels, with about 8% of words in a class their form does not predict. Class overlays are generated after the base tables, so the base endings of a seed are unchanged.
- **Stem alternations from the sound changes.** Mother stem and mother ending are joined and the sound changes run over the whole word (umlaut, lenition, syncope across the boundary…). Only a changed stem counts (the ending stays as the table says) and only for 45% of the affected words (the rest are levelled by analogy). The Morphology tab lists examples with the rules that caused them.
- **Suppletion.** Frequent verbs (be, go, come, have, give) may have another stem for the past or future, and good/bad for the comparative.
- **Sentence frames beyond the simple clause (15 new, 79 in all):** coordination of nouns and clauses (and, but), genitive (case ending or "of", before the head in head-final languages), relative clauses (gap on subject or object, before the noun in head-final languages and closed by the relativiser, after it otherwise), embedded questions, reflexive and reciprocal pronouns, negative indefinites. Negation, questions, imperative, optative, complement and adverbial clauses and comparatives already existed.
- Limits: no passive or other voice, no relative clauses on obliques, no verb forms specific to subordinate clauses; classes and alternations are not shown for isolating languages.

## 1.23.1
- **IPA stress corrected.** Stress was always on the first syllable, which natural languages rarely do. Each language now has a fixed stress system, drawn from its seed with weights favouring the right edge of the word: last-but-one syllable (34%), Latin rule (penult if heavy, else antepenult; 26%), Spanish-like (penult, or last in words ending in a consonant other than n/s; 18%), last syllable (15%), first syllable (7%). Words of five or more syllables (four or more when stress is not initial) also get secondary stress ˌ every second syllable before the main one. The system is shown in the Phonology card. Stress remains a fixed convention per language: it is not derived from the sound changes or from lexical exceptions.

## 1.23.0
- **Writing tab: ligatures.** Alphabets may fuse their commonest pairs of adjacent letters (consonant+consonant or vowel+vowel, up to six, only if frequent enough; about a quarter of alphabets have none); abugidas write the commonest consonant clusters as conjuncts (up to fourteen; the vowel sign goes on the whole sign). Abjads and syllabaries have none (a syllabary sign already is a syllable). Curvy and mixed alphabets and abjads may be written joined along a baseline (cursive). Round-trip checks still pass for every word.
- **Writing tab: numerals.** Positional digits following the language's counting base: generated glyphs with a zero for decimal and octal; dots and bars with a shell for zero for quinary, duodecimal and vigesimal; tally strokes and a "many" sign for restricted systems. Always written left to right. A digit table and examples (script, value, spoken form, IPA) are shown.
- **IPA** (`src/ipa.js`): header toggle "Show IPA" adds a transcription (syllabified, stress by the language's stress system (see 1.23.1)) to the lexicon, dictionary, sample sentences and Writing examples; the Phonology card has an IPA chart; CSV exports have an `ipa` column and the sheet export an IPA row. The stress placement is a fixed convention, not derived from the language.
## 1.22.0
- **Writing tab** (`src/writing/`): a native script for the language, in four kinds, chosen by culture or by the user: alphabet, abjad (consonants and two vowel letters, pointed text with vowel marks, right to left in some languages), abugida (inherent vowel, vowel signs, virama, independent vowels) and syllabary (consonant component + vowel component, consonant-over-bar for a consonant without vowel). No logographic systems. Glyphs are generated procedurally in four styles (angular, curvy, mixed, geometric) and drawn as SVG; all other tabs keep the Latin transcription. The tab shows signs, reading rules, examples and sample sentences in the script.
- Spelling keeps older sounds: up to two rules of the language's own history become spelling conventions (k before i/e read as ʃ, p t k read b d g between vowels, n read m before p/b…); a rule is kept only if it concerns at least 3% of the words and at most 4% are exceptions. Exceptions carry a mark meaning "read as written". Every word is checked to read back as it was written (an abjad's ordinary text is ambiguous by nature: the share of homographs is reported).
- **Loanwords** (`src/history/loans.js`): after the split from the mother, the daughter takes words from one to three other languages (each with a sound system of its own and a role: ruling neighbour, trading partner, liturgical language, neighbouring people). How much a language borrows depends on its genre (2% for hive, 3% orcish, 18% merchant, before a random factor of 0.6–1.5) and each donor favours some fields of vocabulary, with random weights. Loans are adapted to the daughter's sounds and undergo only the sound changes that come after their date; derived words keep their native root (as *bellico* beside *guerra*). History tab: donors, loan table and the native word each loan replaces; the lexicon shows "loan from …".
- **Sister language**: the same mother with other changes (at most two shared with the daughter). History tab: family tree and, for about fourteen words, a graph of the derivation of the daughter's form and of the sister's, with every intermediate form and the change that produced it. The sister is not generated in full.
- Expanded-letter options are no longer exposed. Genres that use marked letters keep doing so internally; the Phonology card lists only the letters that occur in the words.

## 1.21.0
- The language the generator returns is now the **daughter**. The language built from the settings (the mother) goes through up to 12 ordered, dated sound changes (usually 6-11, fewer for very small inventories), applied to the dictionary, the derivational and inflectional affixes, the numeral system and the classifiers; the lexicon, the numerals, names, calendar and sample sentences are then built from the daughter's forms. Every entry keeps its mother form (`protoForm`).
- Validation of the daughter: no rule makes a word identical to another word (the word keeps its older shape); every word keeps a vowel, at most three consonants and two vowels in a row; numerals are recomposed from the daughter's roots; a word that would coincide with a numeral, a root or an affix is repaired; the daughter keeps the character of the mother (the share of words ending in a vowel falls by at most 10 points, the mean length by at most 13%); languages with single consonants only (no clusters) get no rule that creates clusters (syncope, simplification).
- The History tab is now the mother's: rule table (date, change, words affected, example), sounds gained and lost, examples daughter against mother, related words whose roots have diverged (alternations), affixes and the full word list with etymologies. The language sheet and the JSON carry the same account.
- Structures shown for derived words are in the mother's forms. Inflected forms are made of changed stems and affixes; no rule is applied to them afterwards.
- A daughter may use sounds the mother lacked (v, s, ʃ, ŋ…); the History tab lists them. Genre sound statistics (open syllables for sea-folk, etc.) describe the mother.

## 1.20.1
- Fix: a browser that still held a full dictionary copy written by a version before 1.9.0 migrated it as an overlay in which every entry missing from that old copy counted as a deliberate deletion (here 4,062 of 7,222). The generator then worked with a 3,160-entry dictionary, and a war tongue got 3 specialised sentences instead of 39 (words such as *soldier* and *charge* were missing). The migration now keeps only entries the user added; an overlay that removes more than 20% of the file is ignored and discarded at load, with a warning under the Generate button.

## 1.20.0
- Joining of morphemes (`derivationPhonology`): each language decides what happens when two vowels meet at a derivational or compound boundary (kept, first vowel dropped, or a glide inserted) and whether compounds take a linking vowel (about a third of languages). Shown in the *Word formation* card. Own random stream: no other form changes.
- History tab (prototype): the generated language is the proto-language, and one daughter language is derived by 8-12 ordered, dated sound changes chosen from a library of 16 (i-umlaut, palatalization, intervocalic voicing or spirantization, rhotacism, h-loss, w → v, nasal assimilation, syncope, vowel merger, apocope, final raising, final devoicing, final s-loss, cluster simplification, depalatalization). Rules apply only if they fit the inventory, change between 1.5% and 85% of the words and do not break the syllable structure of a word (otherwise that word keeps its form); rule sets that merge more than 3% of the words into homophones are discarded. The tab shows the rule table (date, change, words affected, example), the derivational affixes and a cognate table (daughter, proto, English, rules applied, etymology of derived words). Included in the language sheet and in the JSON.

## 1.19.0
- Word families (`tools/derivation/families.txt`): about 500 regular relations written by hand, from which `tools/derivation/families.mjs` creates 375 new dictionary entries (7,222 in all) and `tools/derivation/build.mjs` writes the pairs: relational adjectives and shelters of animals (*dog → canine, kennel, puppy*; *horse → equine, stable, foal*), trades (*bake → baker, bakery*), states and offices (*king → kingship, kingdom*), qualities and their verbs (*wide → width, widen*), privatives, reversals, and about 120 new compounds (*river + bank*, *fire + place*, *black + smith*). New entries inherit domain, era, culture and biome from their base. Derivation pairs: 812 → 1,312. `tools/lexicon/12b-family-parts.txt` adds the plain words that compounds need (hill, bank, bed, side, top…).
- Selection: the words added for derivation may now be up to 40% of the limit (before 25%), so about 25-29% of a lexicon is derived or compound (before about 12%). The lexicon grows to about 840 entries (genres about 1,200).
- Isolating languages write the two words of a compound apart, as they do their numerals; the others make one word.
- The Generated Lexicon tab is arranged by topic (human body, family, qualities, actions, animals, nature… 27 topics, collapsible, Open all / Close all); alphabetical lookup stays in the Dictionary tab.

## 1.18.1
- Fix: the *Word formation* card and the calendar tables used about half of the width of their panel; their tables now fill the card like the lexicon.

## 1.18.0
- Lexical derivation. About 810 pairs found in the English dictionary (`data/derivations.json`, made by `tools/derivation/build.mjs`): 290 derivations by suffix or prefix (*bake → baker*, *dark → darkness*, *fear → fearless*, *loyal → disloyal*, *turn → return*) and 520 compounds of two dictionary nouns (*night watch*, *fire giant*, *holy water*). Spelling coincidences (*flow → flower*, *count → counter*) are removed in `tools/derivation/exceptions.txt`, which can be edited.
- Each language has its own derivational morphemes (15 types: agent, action, result, quality, abstract, place, diminutive, feminine, adjective, privative, adverb, causative, negative, repetitive, excess). Some types share one affix (action/result, quality/abstract), about 15% of languages are prefixing, and negative, repetitive and excess prefixes are common in the others. Derivation has its own random stream: the roots of all other words, and the inflectional affixes, keep their forms for a given seed.
- A derived word or compound is built from the final forms of its bases (compounds follow the language's modifier/head order); when a form would equal another word it keeps an independent root. The lexicon selection adds the bases of a derived word and the derivatives of a word it already has, up to a quarter more entries than before (600 → at most 750; genre lexicons 900 → at most 1,125), only where the filters allow them.
- The Generated Lexicon tab opens with a *Word formation* card (affix table with examples, compounds) and shows the structure of each derived word; the Dictionary, the language sheet, the CSV (new `structure` column) and the JSON include it.

## 1.17.1
- Fix: in the Numerals tab the *Meaning* column no longer wraps; the numbers table widens to fit it and scrolls sideways inside its card if a number is very long.

## 1.17.0
- Numerals tab: *Numeral system* and *Variant* selectors (same options as in Generation, kept in step). Changing them regenerates the same language (same seed) with the new counting system.
- Each genre now has a default counting system, used when the choice is *Automatic* (dwarves and fey vigesimal; giants, orcs and nomads quinary; machines octal; merchants, sacred, arcane and infernal duodecimal; the others decimal). Without a genre the system is still drawn from the seed. Eras do not set a system.
- New *Meaning* column after *Ordinal* in the numbers table, in the converter, in the language sheet and in the JSON: the arithmetic behind the number with the multiplication sign, e.g. `(4 × 20) + 10`, `2.5 × 20`, `(2 × 10) − 1`.

## 1.16.2
- Fix: the *Expanded letters* box was a cell of the parameter grid (half width). It now sits inside the cluster grid and has exactly the width of the Onset and Coda boxes at every window size.

## 1.16.1
- Fix: the *Expanded letters* box now has the same border colour, legend style and width as the cluster boxes, and its labels wrap instead of overflowing.

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
