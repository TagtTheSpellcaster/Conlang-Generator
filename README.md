# Generatore di lingue artificiali (v2)

## Uso
- Serve un server HTTP (i JSON sono caricati con fetch): `python3 -m http.server` nella cartella, poi `index.html` (generatore) e `vocabulary.html` (gestore del vocabolario).
- Test: `npm test` (node:test, nessuna dipendenza). Validazione dati: `node tools/validate.mjs`. Rigenerazione dello schema JSON: `node tools/build-schema.mjs`.

## Struttura
- `src/lexicon/schema.js`: unica fonte di verità per pos, domini, tier, feature, relazioni e validazione.
- `src/core`, `src/phonology`, `src/morphology`, `src/lexicon/select.js`, `src/syntax`, `src/engine.js`: motore puro (senza DOM), eseguibile anche in Node.
- `src/ui`: controller delle pagine. `data/`: vocabolario (schema 2) e template di frasi.
- Il gestore salva in localStorage (`conlang_vocabulary_v2`); per renderlo effettivo va esportato e sostituito `data/vocabulary.json`.

## Morfologia e fonologia (novità)
- Lingue agglutinanti e fusive hanno morfologia verbale: tempo (presente/passato/futuro), accordo di persona e numero con il soggetto, imperativo. Nelle agglutinanti negazione e potenziale ("can") sono suffissi; ordine: radice – potenziale – negazione – tempo – accordo. Nelle fusive c'è un'unica desinenza per tempo×persona×numero.
- Possessivi come suffissi sul nome (solo agglutinanti): radice – numero – possessore – caso.
- Il pronome soggetto personale cade quando il verbo porta persona e numero (pro-drop). Nelle lingue isolanti resta.
- Giunzione: se l'unione radice+affisso crea un nesso consonantico non ammesso, si inserisce l'ultima vocale della radice come vocale di legame.
- Nessi consonantici: insiemi selezionabili separatamente per attacco e coda, più lunghezza massima (2 o 3). Nulla selezionato = comportamento predefinito del modello consonantico.
