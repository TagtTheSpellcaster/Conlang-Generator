/* ConLang Generator — concrete sample corpus v0.7.15 */
(() => {
  'use strict';

  const VERSION = '0.7.15';
  const norm = value => String(value ?? '').toLowerCase().replace(/^to\s+/, '').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const BASE = {
    am:'be', are:'be', is:'be', was:'be', were:'be',
    eats:'eat', drinks:'drink', sees:'see', hears:'hear', knows:'know',
    hunts:'hunt', follows:'follow', builds:'build', makes:'make', uses:'use',
    loves:'love', trusts:'trust', helps:'help', fears:'fear', hates:'hate',
    avoids:'avoid', goes:'go', travels:'travel', walks:'walk', comes:'come',
    returns:'return', rises:'rise', moves:'move', shines:'shine',
    falls:'fall', rolls:'roll', flies:'fly', swims:'swim',
    enters:'enter', leaves:'leave', works:'work', rests:'rest',
    wants:'want', needs:'need', likes:'like', understands:'understand',
    remembers:'remember', protects:'protect', touches:'touch', takes:'take',
    breaks:'break', exists:'exist', remains:'remain', came:'come',
    fought:'fight', worked:'work',
    cannot:'cannot'
  };

  const GRAMMAR = {
    i:'i', you:'you', we:'we', they:'they', me:'me', my:'my', your:'your',
    this:'this', that:'that', here:'here', there:'there',
    today:'today', tomorrow:'tomorrow', yesterday:'yesterday',
    who:'who', what:'what', where:'where', when:'when', why:'why',
    how:'how', many:'many', all:'all', everything:'all', nothing:'nothing',
    not:'not', can:'can', cannot:'cannot', have:'have', be:'be',
    to:'to', from:'from', with:'with', in:'in', the:'the',
    do:'do', does:'do', of:'of'
  };

  function candidates(lexicon, concept) {
    const wanted = norm(concept);
    const exact = lexicon.filter(e => norm(e.concept) === wanted);
    if (exact.length) return exact;
    const aliases = Object.entries(BASE).filter(([, base]) => base === wanted).map(([word]) => word);
    if (aliases.length) return lexicon.filter(e => aliases.includes(norm(e.concept)));
    return [];
  }

  function resolve(lexicon, concept) {
    const found = candidates(lexicon, concept);
    if (!found.length) return null;
    const entry = found[0];
    return { word: entry.conlang, english: norm(concept), entry };
  }

  function resolveAlternative(lexicon, alt) {
    const raw = norm(alt);
    if (!raw) return null;
    const words = raw.split(/\s+/);
    if (words.length > 1) {
      return { compound: words.map(word => resolveAlternative(lexicon, word)), english: raw };
    }
    const concept = GRAMMAR[raw] || BASE[raw] || raw;
    return resolve(lexicon, concept);
  }

  function tokenize(text) {
    const out = [];
    const re = /\[([^\]]+)\]|([A-Za-z][A-Za-z'-]*)/g;
    let match;
    while ((match = re.exec(text))) {
      if (match[1]) out.push({ alternatives: match[1].split('|').map(s => s.trim()) });
      else out.push({ alternatives: [match[2]] });
    }
    return out;
  }

  function renderWord(entry) {
    return `<span class="sample-word" data-meaning="${esc(entry.english)}">${esc(entry.word)}<span class="sample-tooltip">${esc(entry.english)}</span></span>`;
  }

  function renderMissing(alt) {
    return `<span class="sample-missing" title="${esc(alt)}">?</span>`;
  }

  function renderText(text, lexicon) {
    return tokenize(text).map(group => {
      const rendered = group.alternatives.map(alt => {
        const value = resolveAlternative(lexicon, alt);
        if (value?.compound) {
          return value.compound.map(item => item ? renderWord(item) : renderMissing(alt)).join(' ');
        }
        return value ? renderWord(value) : renderMissing(alt);
      });
      return rendered.length > 1
        ? `<span class="sample-alternatives">[${rendered.join('<span class="sample-alt-sep"> | </span>')}]</span>`
        : rendered[0];
    }).join(' ');
  }

  const S = text => ({ role:'S', text });
  const V = text => ({ role:'V', text });
  const O = text => ({ role:'O', text });
  const X = text => ({ role:'X', text });

  const CORPUS = [
    { english:'I am your [friend|sister|father].', parts:[S('I'),V('am'),O('your [friend|sister|father]')] },
    { english:'You are my [friend|brother|mother].', parts:[S('You'),V('are'),O('my [friend|brother|mother]')] },
    { english:'This is a [house|village|camp].', parts:[S('This'),V('is'),O('[house|village|camp]')] },
    { english:'That is a [mountain|river|forest].', parts:[S('That'),V('is'),O('[mountain|river|forest]')] },
    { english:'We are [here|there].', parts:[S('We'),V('are'),O('[here|there]')] },
    { english:'They are [here|there].', parts:[S('They'),V('are'),O('[here|there]')] },
    { english:'I have [water|food|bread].', parts:[S('I'),V('have'),O('[water|food|bread]')] },
    { english:'You have [water|food|bread].', parts:[S('You'),V('have'),O('[water|food|bread]')] },
    { english:'The [sun|moon|sky] is [bright|dark|cold].', parts:[S('The [sun|moon|sky]'),V('is'),O('[bright|dark|cold]')] },
    { english:'The [stone|ice|fire] is [hard|cold|hot].', parts:[S('The [stone|ice|fire]'),V('is'),O('[hard|cold|hot]')] },
    { english:'The [wolf|dog|horse] eats [meat|bread|food].', parts:[S('The [wolf|dog|horse]'),V('eats'),O('[meat|bread|food]')] },
    { english:'The [wolf|dog|horse] drinks [water|milk].', parts:[S('The [wolf|dog|horse]'),V('drinks'),O('[water|milk]')] },
    { english:'I [see|hear|know] you.', parts:[S('I'),V('[see|hear|know]'),O('you')] },
    { english:'You [see|hear] me.', parts:[S('You'),V('[see|hear]'),O('me')] },
    { english:'The [wolf|hunter|soldier] [hunts|sees|follows] the [deer|wolf|horse].', parts:[S('The [wolf|hunter|soldier]'),V('[hunts|sees|follows]'),O('the [deer|wolf|horse]')] },
    { english:'We [build|make|use] this.', parts:[S('We'),V('[build|make|use]'),O('this')] },
    { english:'I [love|trust|help] [you|the friend|the hunter].', parts:[S('I'),V('[love|trust|help]'),O('[you|the friend|the hunter]')] },
    { english:'I [fear|hate|avoid] the [wolf|sword|fire].', parts:[S('I'),V('[fear|hate|avoid]'),O('the [wolf|sword|fire]')] },
    { english:'I [go|travel|walk] to the [village|city|forest].', parts:[S('I'),V('[go|travel|walk]'),O('to the [village|city|forest]')] },
    { english:'You [come|return|travel] from the [village|city|mountain].', parts:[S('You'),V('[come|return|travel]'),O('from the [village|city|mountain]')] },
    { english:'The [sun|moon|cloud] [rises|moves|shines].', parts:[S('The [sun|moon|cloud]'),V('[rises|moves|shines]')] },
    { english:'The [stone|ball|leaf] [falls|rolls|moves].', parts:[S('The [stone|ball|leaf]'),V('[falls|rolls|moves]')] },
    { english:'The [bird|fish|ship] [flies|swims|moves] in the [sky|water].', parts:[S('The [bird|fish|ship]'),V('[flies|swims|moves]'),O('in the [sky|water]')] },
    { english:'The [wolf|horse|person] walks in the [forest|field|village].', parts:[S('The [wolf|horse|person]'),V('walks'),O('in the [forest|field|village]')] },
    { english:'[Stop|Stay] here.', parts:[V('[Stop|Stay]'),O('here')] },
    { english:'[Come|Go] with me.', parts:[V('[Come|Go]'),O('with me')] },
    { english:'Who are you?', parts:[S('Who'),V('are'),O('you')] },
    { english:'What is this?', parts:[S('What'),V('is'),O('this')] },
    { english:'Where are we?', parts:[S('Where'),V('are'),O('we')] },
    { english:'When do you [go|leave|travel]?', parts:[X('When'),S('you'),V('do [go|leave|travel]')] },
    { english:'Why do you [do|make|build] this?', parts:[X('Why'),S('you'),V('do [do|make|build]'),O('this')] },
    { english:'How many [people|animals|things] are there?', parts:[X('How many'),V('are'),O('[people|animals|things]'),X('there')] },
    { english:'How does this [work|change|move]?', parts:[X('How'),V('does [work|change|move]'),O('this')] },
    { english:'Where is the [water|food|fire]?', parts:[S('Where'),V('is'),O('the [water|food|fire]')] },
    { english:'I do not [want|need|like] this.', parts:[S('I'),V('do not [want|need|like]'),O('this')] },
    { english:'You cannot [enter|leave|move].', parts:[S('You'),V('cannot [enter|leave|move]')] },
    { english:'I do not [know|understand|remember].', parts:[S('I'),V('do not [know|understand|remember]')] },
    { english:'I [know|remember] the [way|road|path].', parts:[S('I'),V('[know|remember]'),O('the [way|road|path]')] },
    { english:'I can [help|protect|follow] you.', parts:[S('I'),V('can [help|protect|follow]'),O('you')] },
    { english:'Do not [touch|take|break] this.', parts:[V('do not [touch|take|break]'),O('this')] },
    { english:'I am [hungry|thirsty|tired].', parts:[S('I'),V('am'),O('[hungry|thirsty|tired]')] },
    { english:'My [hand|head|leg] [hurts|aches].', parts:[S('My [hand|head|leg]'),V('[hurts|aches]')] },
    { english:'I [want|need] to [sleep|rest].', parts:[S('I'),V('[want|need] to [sleep|rest]')] },
    { english:'This is [much|little] [water|food].', parts:[S('This'),V('is'),O('[much|little] [water|food]')] },
    { english:'Everything is [ready|safe|good].', parts:[S('Everything'),V('is'),O('[ready|safe|good]')] },
    { english:'Nothing [moves|exists|remains].', parts:[S('Nothing'),V('[moves|exists|remains]')] },
    { english:'Today we [work|eat|travel].', parts:[X('Today'),S('we'),V('[work|eat|travel]')] },
    { english:'Tomorrow we [work|eat|travel].', parts:[X('Tomorrow'),S('we'),V('[work|eat|travel]')] },
    { english:'Yesterday the [hunter|traveler|soldier] [came|worked|fought].', parts:[X('Yesterday'),S('the [hunter|traveler|soldier]'),V('[came|worked|fought]')] }
  ];

  function orderParts(parts, config) {
    const groups = { S:[], V:[], O:[], X:[] };
    parts.forEach(part => groups[part.role].push(part));
    const result = [];
    String(config.order || 'SVO').split('').forEach(role => result.push(...groups[role]));
    result.push(...groups.X);
    return result;
  }

  function ensureContainer() {
    let container = document.getElementById('sample-sentences');
    if (container) return container;
    const output = document.getElementById('generation-output');
    if (!output) return null;
    container = document.createElement('div');
    container.id = 'sample-sentences';
    container.className = 'sample-sentences-panel';
    output.appendChild(container);
    return container;
  }

  function ensureStyles() {
    if (document.getElementById('sample-corpus-styles')) return;
    const style = document.createElement('style');
    style.id = 'sample-corpus-styles';
    style.textContent = `
      .sample-sentences-panel{margin-top:16px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:15px}
      .sample-sentences-panel:before{content:"Sample Sentences";display:block;font-size:14px;font-weight:700;margin-bottom:12px;color:var(--accent)}
      .sample-sentence{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin-bottom:8px}
      .sample-sentence:last-child{margin-bottom:0}
      .sample-line{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
      .sample-number{font-weight:700;min-width:24px}
      .sample-english{font-weight:400;color:var(--text)}
      .sample-conlang{font-weight:700;margin-top:4px}
      .sample-word{position:relative;cursor:help;text-decoration:underline dotted;text-underline-offset:3px}
      .sample-tooltip{position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);z-index:1000;display:none;white-space:nowrap;padding:4px 7px;border-radius:5px;background:#080d18;color:#fff;border:1px solid #33415d;font:12px/1.2 Inter,system-ui,sans-serif;font-weight:400;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none}
      .sample-word:hover>.sample-tooltip{display:block}
      .sample-alternatives{white-space:nowrap}
      .sample-alt-sep{font-weight:400;color:var(--muted);padding:0 2px}
      .sample-missing{color:#d98b8b;font-weight:700;cursor:help}
    `;
    document.head.appendChild(style);
  }

  function render() {
    const detail = window.__lastConlangGeneration;
    if (!detail?.lexicon) return;
    const container = ensureContainer();
    if (!container) return;
    ensureStyles();
    const config = detail.config || { order:'SVO' };
    container.innerHTML = CORPUS.map((sentence, index) => {
      const ordered = orderParts(sentence.parts, config);
      const conlang = ordered.map(part => renderText(part.text, detail.lexicon)).join(' ');
      return `<div class="sample-sentence">
        <div class="sample-line"><span class="sample-number">${index + 1}.</span><span class="sample-english">${esc(sentence.english)}</span></div>
        <div class="sample-line sample-conlang"><span class="sample-number">${index + 1}.</span><span>${conlang}</span></div>
      </div>`;
    }).join('');
  }

  window.addEventListener('conlang:generated', event => {
    window.__lastConlangGeneration = event.detail;
    requestAnimationFrame(render);
  });

  window.ConLangSampleFix = { VERSION, render };
})();
