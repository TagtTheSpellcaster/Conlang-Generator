/* ConLang Generator — sample sentence repair layer v0.7.14 */
(() => {
  'use strict';

  const VERSION = '0.7.14';
  const norm = value => String(value ?? '').toLowerCase().replace(/^to\s+/, '').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const placeholder = value => /^<[^>]+>$/.test(String(value ?? '').trim());

  const GRAMMAR = {
    'i':'i','you':'you','we':'we','they':'they','me':'me','my':'my',
    'this':'this','that':'that','here':'here','there':'there',
    'today':'today','tomorrow':'tomorrow','yesterday':'yesterday',
    'who':'who','what':'what','where':'where','when':'when','why':'why','how':'how','many':'many',
    'all':'all','everything':'all','nothing':'nothing','not':'not','can':'can',
    'have':'have','is':'be','are':'be','am':'be','be':'be',
    'to':'to','from':'from','with':'with','in':'in','the':'the'
  };

  function candidates(lexicon, concept) {
    const wanted = norm(concept);
    const exact = lexicon.filter(e => norm(e.concept) === wanted);
    if (exact.length) return exact;

    const groups = lexicon.filter(e => {
      const groups = [e.semantic_group, e.category, ...(Array.isArray(e.tags) ? e.tags : [e.tags]), ...(Array.isArray(e.features) ? e.features : [e.features])]
        .filter(Boolean).map(norm);
      return wanted === 'have' && groups.some(g => ['possession','ownership','possessive','possession_state'].includes(g));
    });
    return groups;
  }

  function resolve(lexicon, concept, fallback) {
    const found = candidates(lexicon, concept);
    if (!found.length) return fallback;
    const entry = found[0];
    return { word: entry.conlang, english: concept, entry };
  }

  function fixedWords(english) {
    const text = english.replace(/<[^>]+>/g, ' ').replace(/[^A-Za-z' ]+/g, ' ').toLowerCase();
    return text.split(/\s+/).filter(Boolean).map(word => {
      if (word === 'cannot') return ['can','not'];
      if (GRAMMAR[word]) return [GRAMMAR[word]];
      return [];
    }).flat();
  }

  function repairTokens(sentence, lexicon) {
    const expected = fixedWords(sentence.english);
    let index = 0;
    return sentenceHtmlTokens(sentence, lexicon).map(token => {
      if (token.placeholder) return token;
      const concept = expected[index++];
      if (!concept) return token;
      const resolved = resolve(lexicon, concept, token);
      return resolved || token;
    });
  }

  function sentenceHtmlTokens(sentence, lexicon) {
    const original = window.ConLangEngine.sentenceHtml ? null : null;
    return sentence.__tokens || [];
  }

  function tokenizeFromRenderedSentence(sentence, config, lexicon) {
    // Re-run the public sample generator, then recover its ordered token stream.
    // The legacy renderer is intentionally not used for the final HTML.
    const raw = window.ConLangEngine.samples(config, lexicon).find(s => s.number === sentence.number);
    if (!raw) return [];
    const core = {S: raw.S, V: raw.V, O: raw.O};
    const ordered = config.order.split('').map(k => core[k]).filter(Boolean);
    const extras = raw.extra || [];
    if (extras.length) ordered.splice(Math.min(ordered.length, raw.extraIndex ?? ordered.length), 0, ...extras);
    return ordered;
  }

  function renderToken(token) {
    if (token.placeholder) return `<span class="sample-placeholder">${esc(token.text)}</span>`;
    return `<span class="sample-word" data-meaning="${esc(token.english)}"><span class="sample-tooltip">${esc(token.english)}</span>${esc(token.word)}</span>`;
  }

  function installStyles() {
    if (document.getElementById('sample-tooltip-styles')) return;
    const style = document.createElement('style');
    style.id = 'sample-tooltip-styles';
    style.textContent = `
      .sample-word{position:relative;cursor:help;text-decoration:underline dotted;text-decoration-thickness:1px;text-underline-offset:3px}
      .sample-tooltip{position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);z-index:1000;display:none;white-space:nowrap;padding:4px 7px;border-radius:5px;background:#080d18;color:#fff;border:1px solid #33415d;font:12px/1.2 Inter,system-ui,sans-serif;font-weight:400;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none}
      .sample-word:hover>.sample-tooltip{display:block}
    `;
    document.head.appendChild(style);
  }

  function render() {
    const detail = window.__lastConlangGeneration;
    if (!detail || !window.ConLangEngine?.samples) return;
    const container = document.getElementById('sample-sentences');
    if (!container) return;

    installStyles();
    const {config, lexicon} = detail;
    const sentences = window.ConLangEngine.samples(config, lexicon);

    container.innerHTML = sentences.map(sentence => {
      const tokens = tokenizeFromRenderedSentence(sentence, config, lexicon);
      const repaired = (() => {
        const expected = fixedWords(sentence.english);
        let i = 0;
        return tokens.map(token => {
          if (token.placeholder) return token;
          const concept = expected[i++];
          if (!concept) return token;
          return resolve(lexicon, concept, token) || token;
        });
      })();
      const conlang = repaired.map(renderToken).join(' ');
      return `<div class="sample-sentence"><div class="sample-line"><span class="sample-number">${sentence.number}.</span><span class="sample-english">${esc(sentence.english)}</span></div><div class="sample-line sample-conlang"><span class="sample-number">${sentence.number}.</span><span>${conlang}</span></div></div>`;
    }).join('');
  }

  window.addEventListener('conlang:generated', event => {
    window.__lastConlangGeneration = event.detail;
    requestAnimationFrame(render);
  });

  window.ConLangSampleFix = {VERSION, render};
})();
