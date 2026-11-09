# Generatore di lingue artificiali (v2)

## Uso
- Serve un server HTTP (i JSON sono caricati con fetch): `python3 -m http.server` nella cartella, poi `index.html` (generatore) e `vocabulary.html` (gestore del vocabolario).
- Test: `npm test` (node:test, nessuna dipendenza). Validazione dati: `node tools/validate.mjs`. Rigenerazione dello schema JSON: `node tools/build-schema.mjs`.

## Struttura
- `src/lexicon/schema.js`: unica fonte di verità per pos, domini, tier, feature, relazioni e validazione.
- `src/core`, `src/phonology`, `src/morphology`, `src/lexicon/select.js`, `src/syntax`, `src/engine.js`: motore puro (senza DOM), eseguibile anche in Node.
- `src/ui`: controller delle pagine. `data/`: vocabolario (schema 2) e template di frasi.
- Il gestore salva in localStorage (`conlang_vocabulary_v2`); per renderlo effettivo va esportato e sostituito `data/vocabulary.json`.
