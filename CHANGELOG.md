# Changelog

Versioning: `MAJOR.MINOR.PATCH`. MINOR increases for every new feature that does not overhaul the dictionary (patch resets to 0); PATCH increases for every bug fix. MAJOR changes only for a complete redesign. The number lives in `src/version.js` (shown in the page header and written in vocabulary exports); `package.json` must match, and a test checks both and the first entry below.

History before 1.6.0 is reconstructed from the development sessions; it was not tracked release by release.

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
