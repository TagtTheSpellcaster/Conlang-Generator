/*
 * Conlang Generator Studio — vocabulary-driven engine
 * The generator treats region, culture, biome and temporal_setting as
 * independent semantic dimensions. Vocabulary arrays are intentionally
 * interpreted as multi-valued attributes: a term may belong to several
 * regions, cultures, biomes or historical periods.
 */
(() => {
  'use strict';

  const PHONETICS = {
    vowels: { standard:['a','e','i','o','u'], minimal:['a','i','u'], extended:['a','e','i','o','u','y','ø','æ'] },
    consonants: {
      balanced:['p','t','k','b','d','g','m','n','s','r','l','f','v'],
      guttural:['k','q','x','g','r','kh','gh','t','d'],
      sibilant:['s','z','sh','zh','f','v','r','l','th'],
      soft:['m','n','l','r','w','j','v','dh']
    }
  };
  const STRUCTURES = {
    standard:['CV','CVC','CVV','VC'], musical:['CV','V','CVV','CVC'],
    guttural:['CVC','CCVC','CVCC'], soft:['CV','CVV','CVC','V']
  };

  let vocabulary = [];
  let state = null;

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const arr = v => Array.isArray(v) ? v.filter(Boolean).map(String) : (v == null || v === '' ? [] : [String(v)]);
  const flat = key => [...new Set(vocabulary.flatMap(e => arr(e[key])))].sort((a,b)=>a.localeCompare(b));
  const choice = (a,rng) => a[Math.floor(rng()*a.length)];

  function hashSeed(s) {
    let h = 2166136261;
    for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
    return h >>> 0;
  }
  function rngFactory(seed) {
    let x = hashSeed(seed) || 1;
    return () => { x += 0x6D2B79F5; let t=x; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
  }

  function selected(id) { return [...$(id).selectedOptions].map(o=>o.value); }
  function setSelected(id, values) {
    const set=new Set(values); [...$(id).options].forEach(o=>o.selected=set.has(o.value));
  }
  function populateFilters() {
    ['region','culture','biome','temporal_setting','tags'].forEach(id=>{
      const vals=flat(id), el=$(id); el.innerHTML='';
      vals.forEach(v=>{ const o=document.createElement('option'); o.value=v;o.textContent=v;el.appendChild(o); });
    });
  }

  function config() {
    return {
      region:selected('region'), culture:selected('culture'), biome:selected('biome'), temporal_setting:selected('temporal_setting'), tags:selected('tags'),
      vowels:$('vowels').value, consonants:$('consonants').value, mean:+$('mean').value || 2.2,
      seed:$('seed').value || String(Date.now()), order:$('word-order').value, morphology:$('morphology').value,
      adj:$('adj-position').value, articles:$('articles').value, plural:$('plural').value, relations:$('relations').value
    };
  }

  function overlap(entry, key, wanted) {
    if (!wanted.length) return 0;
    const values=arr(entry[key]);
    return values.some(v=>wanted.includes(v)) ? 1 : 0;
  }
  function semanticScore(entry,c) {
    let score = entry.scope === 'universal' ? 1 : 0;
    for (const key of ['region','culture','biome','temporal_setting','tags']) {
      const w=c[key]; if (!w.length) continue;
      score += overlap(entry,key,w) ? (key==='tags'?1.25:2) : -0.15;
    }
    return score;
  }

  function makeWordFactory(c) {
    const vs=PHONETICS.vowels[c.vowels] || PHONETICS.vowels.standard;
    const cs=PHONETICS.consonants[c.consonants] || PHONETICS.consonants.balanced;
    const style=c.consonants==='guttural'?'guttural':c.consonants==='soft'?'soft':c.vowels==='extended'?'musical':'standard';
    const structures=STRUCTURES[style] || STRUCTURES.standard;
    const rng=rngFactory(c.seed+'|phonology');
    const used=new Set();
    const C=()=>choice(cs,rng), V=()=>choice(vs,rng);
    function build(pattern) { return pattern.replace(/C|V/g,m=>m==='C'?C():V()); }
    return function make() {
      for(let tries=0;tries<100;tries++) {
        const target=Math.max(1,Math.min(5,Math.round(c.mean + (rng()-.5)*1.6)));
        let word=''; for(let i=0;i<target;i++) word+=build(choice(structures,rng));
        word=word.toLowerCase();
        if(!used.has(word) && word.length>1) { used.add(word); return word; }
      }
      return build('CVC')+Math.floor(rng()*9);
    };
  }

  function classify(entry) {
    const c=String(entry.category||'').toLowerCase(), w=String(entry.word_type||'').toLowerCase(), concept=String(entry.concept||'');
    if(w==='verb' || concept.startsWith('to ')) return 'verb';
    if(w==='adjective' || c.includes('adjective')) return 'adjective';
    if(w==='pronoun') return 'pronoun';
    if(w==='preposition') return 'function';
    if(c.includes('number') || c.includes('quantity')) return 'number';
    return 'noun';
  }

  function lexicalForm(concept, kind) {
    let x=String(concept);
    if(kind==='verb') x=x.replace(/^to\s+/i,'');
    return {concept:x, kind};
  }

  function generateLexicon(c) {
    const make=makeWordFactory(c), byEntry=new Map();
    const candidates=vocabulary.slice().sort((a,b)=>semanticScore(b,c)-semanticScore(a,c));
    const limit=Math.min(260,candidates.length);
    for(let i=0;i<limit;i++) {
      const e=candidates[i], conceptKey=String(e.concept||'').toLowerCase(), key=`${e.id||conceptKey}|${conceptKey}`;
      if(!conceptKey || byEntry.has(key)) continue;
      const kind=classify(e), lf=lexicalForm(e.concept,kind), word=make();
      byEntry.set(key,{...e,kind,english:lf.concept,word,score:semanticScore(e,c)});
    }
    ['man','person','water','food','house','sun','moon','fire','name','place','help','love','to be','to have','to need','to go','and','or','from','to'].forEach(target=>{
      const e=vocabulary.find(x=>String(x.concept).toLowerCase()===target || String(x.concept).toLowerCase()===target.replace(/^to /,''));
      if(e) {
        const kind=classify(e), key=`${e.id||target}|${String(e.concept).toLowerCase()}`;
        if(!byEntry.has(key)) byEntry.set(key,{...e,kind,english:String(e.concept).replace(/^to\s+/i,''),word:make(),score:semanticScore(e,c)});
      }
    });
    return [...byEntry.values()];
  }

  function findWord(term, kind, lex) {
    const norm=String(term).toLowerCase().replace(/^to\s+/,'');
    let matches=lex.filter(x=>x.english.toLowerCase()===norm);
    if(kind) matches=matches.filter(x=>x.kind===kind);
    return matches.sort((a,b)=>b.score-a.score)[0] || null;
  }
  function affix(base, type, c) {
    if(c.morphology==='isolating') return base;
    if(c.morphology==='fusional') return type==='verb' ? base+'a' : base+'i';
    return type==='verb' ? base+'-ta' : base;
  }
  function noun(e,c,def=false,plural=false) {
    if(!e) return '—'; let w=e.word;
    if(plural && c.plural!=='none') w=c.plural==='prefix'?'na-'+w:w+'-in';
    if(c.articles!=='none' && def && (c.articles==='both'||c.articles==='definite'||c.articles==='partitive')) w='da '+w;
    if(c.articles!=='none' && !def && (c.articles==='both'||c.articles==='indefinite'||c.articles==='partitive')) w='un '+w;
    return w;
  }
  function verb(e,c) { return e ? affix(e.word,'verb',c) : '—'; }
  function sentence(s,v,o,c) {
    const map={S:noun(s,c,false),V:verb(v,c),O:noun(o,c,false)};
    return c.order.split('').map(k=>map[k]).join(' ');
  }

  function buildSentences(c,lex) {
    const pairs=[
      ['I','to need','help','I need help.'],['you','to have','water','You have water.'],
      ['person','to see','sun','The person sees the sun.'],['hunter','to find','prey','The hunter finds prey.'],
      ['musician','to sing','song','The musician sings a song.'],['teacher','to teach','student','The teacher teaches the student.'],
      ['farmer','to grow','crop','The farmer grows a crop.'],['fisherman','to catch','fish','The fisherman catches fish.'],
      ['child','to eat','food','The child eats food.'],['you','to love','music','You love music.'],
      ['I','to know','truth','I know the truth.'],['person','to live','house','The person lives in the house.']
    ];
    const out=[];
    for(const [s,v,o,eng] of pairs){ const se=findWord(s,null,lex),ve=findWord(v,'verb',lex),oe=findWord(o,null,lex); if(se&&ve&&oe) out.push({con:sentence(se,ve,oe,c),eng}); }
    return out;
  }

  function grammar(c) {
    return {
      'Basic order':c.order,
      'Morphology':c.morphology==='agglutinative'?'transparent affix stacking':c.morphology==='fusional'?'stem-changing / fused endings':'largely uninflected',
      'Adjectives':c.adj==='before'?'before the noun':'after the noun',
      'Articles':c.articles,
      'Plural':c.plural==='none'?'No productive plural':c.plural==='prefix'?'Plural prefix na-':'Plural suffix -in',
      'Relations':c.relations==='cases'?'case endings':'word order and adpositions'
    };
  }
  function nameLanguage(c) { const make=makeWordFactory({...c,seed:c.seed+'|name',mean:2}); return make().replace(/^./,x=>x.toUpperCase())+'ic'; }
  function render(c,lex,sentences) {
    const semantic=['region','culture','biome','temporal_setting','tags'].flatMap(k=>c[k].map(v=>`${k}: ${v}`));
    const g=grammar(c),lang=nameLanguage(c);
    $('db-status').textContent=`Vocabulary: ${vocabulary.length} entries · generated lexicon: ${lex.length}`;
    $('output').innerHTML=`<div class="hero"><div><div class="lang-name">${esc(lang)}</div><div class="sub">A language generated from the current vocabulary and semantic profile.</div><div class="chips">${semantic.length?semantic.map(x=>`<span class="chip">${esc(x)}</span>`).join(''):'<span class="chip">no semantic restrictions</span>'}</div></div><div class="kv">${Object.entries(g).map(([k,v])=>`<b>${esc(k)}</b><span>${esc(v)}</span>`).join('')}</div></div>
      <div class="grid"><div class="card"><h3>Semantic selection</h3><div class="sub">The engine scores every vocabulary entry against region, culture, biome, temporal setting and tags. Array values are treated as alternatives, not as a single label.</div><div class="notice">A term can therefore be both ancient and modern, or belong to several biomes or cultures, without losing those associations.</div></div><div class="card"><h3>Phonology</h3><div class="kv"><b>Vowels</b><span>${esc(PHONETICS.vowels[c.vowels].join(' '))}</span><b>Consonants</b><span>${esc(PHONETICS.consonants[c.consonants].join(' '))}</span><b>Mean syllables</b><span>${c.mean}</span></div></div></div>
      <div class="card" style="margin-top:14px"><h3>Generated lexicon</h3><div class="lexicon">${lex.sort((a,b)=>a.english.localeCompare(b.english)).map(e=>`<div class="lex-row"><div class="word">${esc(e.word)}</div><div class="eng">${esc(e.english)}</div><div class="meta">${esc(e.category||'')} · ${esc(e.kind)}</div></div>`).join('')}</div></div>
      <div class="card" style="margin-top:14px"><h3>Sample sentences</h3>${sentences.length?sentences.map(s=>`<div class="sentence"><div class="con">${esc(s.con)}</div><div class="eng">${esc(s.eng)}</div></div>`).join(''):'<div class="empty">Not enough matching vocabulary to build the sample sentences.</div>'}</div>`;
  }

  async function loadVocabulary() {
    try {
      const res=await fetch('vocabulary.json',{cache:'no-store'}); if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json(); vocabulary=Array.isArray(data)?data:(Array.isArray(data.vocabulary)?data.vocabulary:[]);
      if(!vocabulary.length) throw new Error('No vocabulary entries found.');
      populateFilters(); $('db-status').textContent=`Vocabulary: ${vocabulary.length} entries`;
    } catch(err) { $('db-status').textContent='Vocabulary load failed'; $('message').textContent=`Unable to load vocabulary.json: ${err.message}`; }
  }

  function generate() { if(!vocabulary.length) return; state=config(); const lex=generateLexicon(state); render(state,lex,buildSentences(state,lex)); }
  function setPresetValue(id,candidates){ const available=new Set([...$(id).options].map(o=>o.value)); setSelected(id,candidates.filter(v=>available.has(v))); }
  function preset(kind) {
    ['region','culture','biome','temporal_setting','tags'].forEach(id=>setSelected(id,[]));
    if(kind==='historical') setPresetValue('temporal_setting',['ancient','medieval','renaissance']);
    if(kind==='modern') setPresetValue('temporal_setting',['modern']);
    if(kind==='scifi'){setPresetValue('region',['space','alien']);setPresetValue('temporal_setting',['modern','futuristic']);setPresetValue('tags',['sci-fi','science_fiction','space']);}
    if(kind==='fantasy'){setPresetValue('temporal_setting',['medieval','renaissance']);setPresetValue('tags',['fantasy']);}
    generate();
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    $('generate').onclick=generate; $('regenerate').onclick=()=>{$('seed').value=String(Date.now());generate();};
    $('clear-filters').onclick=()=>{['region','culture','biome','temporal_setting','tags'].forEach(id=>setSelected(id,[]));generate();};
    $('preset-historical').onclick=()=>preset('historical');$('preset-modern').onclick=()=>preset('modern');$('preset-scifi').onclick=()=>preset('scifi');$('preset-fantasy').onclick=()=>preset('fantasy');
    await loadVocabulary();
  });
})();
