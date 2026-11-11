# Conlang Generator

A browser tool that generates artificial languages — phonology, morphology, syntax, a lexicon and sample sentences — with a focus on fantasy and science-fiction languages. Generation is deterministic: the same options and seed always give the same language.

## Running it
- The JSON data files are loaded with `fetch`, so the pages need an HTTP server (opening them from `file://` does not work): run `python3 -m http.server` in this folder, then open `index.html` (generator) or `vocabulary.html` (vocabulary manager).
- Tests: `npm test` (node:test, no dependencies).
- Data validation: `node tools/validate.mjs`. JSON schema regeneration: `node tools/build-schema.mjs`.

## Project layout
- `src/lexicon/schema.js`: single source of truth for parts of speech, domains, tiers, features, relations and validation.
- `src/core`, `src/phonology`, `src/morphology`, `src/lexicon/select.js`, `src/syntax`, `src/engine.js`: the pure engine (no DOM), also runnable in Node.
- `src/genres.js`: the language genres (data only).
- `src/ui`: page controllers. `css/`, `index.html`, `vocabulary.html`: interface.
- `data/vocabulary.json`: the dictionary (schema 2). `data/sentence-templates.json`: the sample sentences (generated, see below).
- `tools/lexicon/*.txt` + `tools/lexicon/build.mjs`: sources of the specialised vocabulary.
- `tools/sentences/*.txt` + `tools/sentences/build.mjs`: sources of the sample sentences.
- `src/names.js`: proper-name generator.
- `src/export.js`: exports of a generated language (sheet as HTML or Markdown, lexicon as CSV, full language as JSON).
- `src/lexicon/store.js` + `src/ui/vocabulary-store.js`: storage of the vocabulary manager's edits (see below).

## Names
The *Names* tab generates proper names for the current language: personal names, family and clan names, place names and epithets (*New names* gives another set; the number is adjustable). `src/names.js` is pure and deterministic and does not change the language.
- Sounds come from the language's phonology, including the genre's sound bias; names are one to three syllables.
- Meanings come from the language's own lexicon: a common stock (animals, elements, colours, qualities) plus flavour words of the genre (a war tongue gets *spear*, *banner*, *fort*; the dwarves *anvil*, *forge*, *hall*; sea-folk *tide*, *reef*, *harbour*). Where the language lacks those words the pool widens to everyday words of the genre's domains.
- Place names and clan names are compounds written as one word, in the language's modifier/head order, with a linking vowel where the junction would be unpronounceable. Epithets are phrases with the adjective before or after the noun as in the language.
- The genre decides the custom of personal names: single name (giants, machines, hive), given + clan (orcs, dwarves, nomads, merchants), given + epithet (war, sea-folk, fey, women, artisans, thieves, undead) or title + given (draconic, infernal, arcane, sacred). Meanings are glossed in English, modifier first.
- The language sheet and the JSON export include a sample of each kind.

## Vocabulary edits
The vocabulary manager does not copy the dictionary: it stores only the *differences* from `data/vocabulary.json` (added, modified and removed entries) in localStorage (`conlang_vocabulary_overlay_v1`). The generator reads the same overlay, so edits made in the manager are used at once, and a changed `data/vocabulary.json` is picked up while the local edits are kept. A full copy saved by older versions (`conlang_vocabulary_v2`) is converted to differences on first load.
- *Save to data/vocabulary.json* writes the merged dictionary back to the file (File System Access API, Chromium-based browsers; the file handle is remembered). Where that API is unavailable it downloads `vocabulary.json` for you to place in `data/`. The write-back is not covered by the automated tests (it needs a browser permission dialog).
- *Reload* and *Reset* discard the local edits.

## Export
After generating a language, the result panel offers: **Language sheet (HTML)** (standalone, printable), **Markdown**, **Lexicon (CSV)** (UTF-8 with BOM, opens in spreadsheets) and **Language (JSON)** (spec, phonology, morphology, lexicon, sentences). The sheet holds overview, phonology, noun/adjective/verb paradigms, clause structure, universal and specialised sentences and the full lexicon.

## Phonology and morphology
- Consonant clusters: separate sets for onsets and codas, plus a maximum cluster length (2 or 3). Nothing selected keeps the default of the consonant model.
- Agglutinative and fusional languages have verbal morphology: tense (present / past / future), person and number agreement with the subject, imperative. Agglutinative verbs chain suffixes in the order stem – ability – negation – tense – agreement; negation and ability ("can") are suffixes there. Fusional verbs have one portmanteau ending per tense × person × number; negation and ability stay separate words and the imperative is the bare stem.
- Possessors are suffixes on the noun (agglutinative languages only): stem – number – possessor – case.
- A personal-pronoun subject is dropped when the verb carries person and number (pro-drop). Isolating languages keep it.
- Junction: if joining stem and affix creates a forbidden consonant cluster, the last vowel of the stem is inserted as a linking vowel.

## Language genres
`src/genres.js` defines 18 genres: war, orcish, giant, marine, fey, draconic, dwarven, infernal, arcane, machine, hive, women (secret women's tongue in the manner of Nüshu), artisan (craftsmen's cant), thieves, nomad, sacred, undead and merchant (trade pidgin).

A genre has four parts:
1. **Structure**: default values for the grammatical options (morphology, articles, word order, relations, plural, gender, adjective position). Only options you leave unset are filled; anything you choose yourself wins.
2. **Sound**: default phonology options plus a bias — multipliers for classes of sounds (stops, nasals, liquids, back vowels…) or single symbols (0 removes a symbol), and a multiplier for closed syllables. The bias applies to roots and affixes.
3. **Profile**: the culture, biome and era the interface selects with the genre (only where the genre has a clear identity). They are soft preferences you can change.
4. **Semantics**: weights for dictionary domains, groups, tags, cultures, biomes and eras, and exclusions (a fey tongue has no war vocabulary). With a genre the lexicon grows from 600 to up to 900 entries.

The dictionary (6,690 entries) is rebuilt from the sources in `tools/lexicon/*.txt` with `node tools/lexicon/build.mjs` (idempotent; it validates the result), then `node tools/validate.mjs`.

## Sample sentences
The *Sample Sentences* tab has two columns:
- **Universal Sentences** (61 frames; each `[a|b|c]` frame shows several words, so the list covers many more sentences): greetings and courtesy, wishes, needs and the body, danger, affection and kinship, identity, place and resources, knowledge, quality and quantity, time and events, basic sentence patterns (transitive, ditransitive, negation, ability, plural, dual, adjective order) and, since 1.11.0, yes/no questions, optative wishes, subordinate clauses, comparatives and aspect. They follow the semantic-primes tradition (Wierzbicka) and the survival, social and orientation needs described in comparative studies. They double as a short phrasebook and as a test of the grammar. Some of them need a number the language may not have (plural, dual) and are skipped then.
- **Specialised Sentences**: 20 to 39 sentences per genre, grouped by topic (a war tongue gets commands, reports from the front, strategy and tactics, camp and supply, outcomes; the artisans get workshop and guild, tools and materials, making and quality; and so on). Without a genre the column explains that a genre is needed.

Every sentence is realised with the language's own word order, case or adposition system, articles, adjective position, agreement and morphology. A language always contains the dictionary senses its sentences need, even if its genre would otherwise exclude them.

### Grammar of the sentences
- **Yes/no questions** (`q=yn`): a question particle, sentence-final in head-final languages (verb after object) and sentence-initial otherwise.
- **Optative** (`mood=optative`): a verb suffix in agglutinative languages (it replaces the tense, agreement is kept); the word *may* in the others.
- **Subordinate clauses** (`comp=` and `adv=`): the subordinator follows its clause in head-final languages and precedes it otherwise. A complement clause takes the place of the object; an adverbial clause comes first in head-final languages and last in the others.
- **Comparatives** (`cmp` on an adjective): a suffix in agglutinative languages (stem – comparative – gender – number – case), otherwise the word *more*; the standard of comparison takes the ablative where the language has it, otherwise the word *than*.
- **Aspect** (`/prog`, `/perf` on a verb): a suffix between negation and tense in agglutinative languages, otherwise a marker word before the verb. Fusional verbs use marker words for aspect and the optative.

### Editing the sentences
The sentences are written in a compact text format in `tools/sentences/*.txt` and compiled with

    node tools/sentences/build.mjs

which checks every lemma against `data/vocabulary.json` (an unknown reference aborts the build) and writes `data/sentence-templates.json`. Format:

    @universal            or    @genre war
    ## Topic name
    English text | S=... | V=... | O=... | A=... | B=... | init=... | mood=imperative | tense=future | seq=init,V,S | req=plural

- Noun phrase (`S`, `O`, `A`, `B`, `init`): tokens separated by spaces — `the`/`a`, a possessor (`my`, `your`…), `+adjective`, `pl`/`du`, and the head `lemma:pos` (`n` noun, `v` verb, `a` adjective, `adv`, `p` particle, `c`, `d`, `pr`; `_` stands for a space; `|` separates alternatives shown as `[a|b]`). Pronoun aliases: `I YOU WE THEY HE SHE IT ME YOU_O THIS THAT WHO WHAT WHERE HOW WHY`.
- Prepositional phrase: `adp>noun phrase`, e.g. `to>the village:n`, `with>ME`. It becomes a case ending or an adposition depending on the language.
- Verb (`V`): `lemma:v`, with flags after `/`: `neg`, `can` (`enter:v/neg,can`).
- `init` is placed first by default (interjections, question words); several phrases are separated by `;`. `A` and `B` are adjuncts placed after the verb arguments. `seq` overrides the order of the parts. `req=plural|dual` skips the sentence in languages without that number.
- Words missing from the dictionary go into `tools/lexicon/10-sentence-words.txt` (then run the lexicon build first).

## Versioning
See `CHANGELOG.md`. `MAJOR.MINOR.PATCH`: a new feature raises MINOR (patch back to 0), a bug fix raises PATCH. Update `src/version.js`, `package.json` and the top of the changelog together; `npm test` fails if they disagree.

## Tests
`npm test` covers the schema, the vocabulary store (differences, migration), the export, the sentence grammar, the names, the engine, phonology (including clusters and genre sound bias), agglutination and fusion, syntax, the genres (each generates a complete language, signature vocabulary, exclusions, determinism, a sweep over genre × morphology × word order) and the sample sentences (reference integrity, sentence counts, every sentence realised).
