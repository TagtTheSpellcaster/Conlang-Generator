/* Conlang Generator — vocabulary-driven engine v0.6.0 */
(() => {
  'use strict';

  const VERSION = '0.6.0';
  const $ = id => document.getElementById(id);
  const arr = value => Array.isArray(value) ? value.filter(Boolean).map(String) : (value == null || value === '' ? [] : [String(value)]);
  const unique = values => [...new Set(values)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const choice = (values, rng) => values[Math.floor(rng() * values.length)];

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
  let generated = null;

  function hashSeed(seed) {
    let h = 2166136261;
    for (let i=0;i<seed.length;i++) { h ^= seed.charCodeAt(i); h = Math.imul(h,16777619); }
    return h >>> 0;
  }
  function rngFactory(seed) {
    let x = hashSeed(seed) || 1;
    return () => { x += 0x6D2B79F5; let t=x; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
  }

  function selected(id) {
    const el=$(id); return el ? [...el.selectedOptions].map(o=>o.value).filter(Boolean) : [];
  }
  function valuesForField(field) { return unique(vocabulary.flatMap(e=>arr(e[field]))).sort((a,b)=>a.localeCompare(b)); }
  function populateFilters() {
    ['region','culture','biome','temporal_setting','tags'].forEach(field=>{
      const el=$(field); if(!el)return;
      el.innerHTML='<option value="">Any</option>'+valuesForField(field).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    });
  }

  function randomChoice(values) { return values[Math.floor(Math.random()*values.length)]; }
  function randomizeGenerationParameters() {
    ['region','culture','biome','temporal_setting','tags'].forEach(id=>{ const el=$(id); if(el&&el.options.length>1)el.value=randomChoice([...el.options].slice(1).map(o=>o.value)); });
    ['vowels','consonants','word-order','morphology','adj-position','articles','plural','relations'].forEach(id=>{ const el=$(id); if(el)el.value=randomChoice([...el.options].map(o=>o.value)); });
    $('mean').value=(1+Math.random()*2.5).toFixed(1);
    $('seed').value=`${Date.now()}-${Math.floor(Math.random()*1000000)}`;
  }
  function config() {
    return {
      region:selected('region'),culture:selected('culture'),biome:selected('biome'),temporal_setting:selected('temporal_setting'),tags:selected('tags'),
      vowels:$('vowels').value,consonants:$('consonants').value,mean:Math.max(1,Math.min(5,Number($('mean').value)||2.2)),seed:$('seed').value.trim()||String(Date.now()),
      order:$('word-order').value,morphology:$('morphology').value,adjectivePosition:$('adj-position').value,articles:$('articles').value,plural:$('plural').value,relations:$('relations').value
    };
  }
  function overlap(entry,field,wanted) { return wanted.length && arr(entry[field]).some(v=>wanted.includes(v)) ? 1 : 0; }
  function semanticScore(entry,c) {
    let score=entry.scope==='universal'?1:0;
    for(const field of ['region','culture','biome','temporal_setting','tags']) { if(!c[field].length)continue; score += overlap(entry,field,c[field]) ? (field==='tags'?1.25:2) : -0.15; }
    return score;
  }
  function classify(entry) {
    const type=String(entry.word_type||'').toLowerCase(), category=String(entry.category||'').toLowerCase(), concept=String(entry.concept||'');
    if(type==='verb'||/^to\s+/i.test(concept))return'verb';
    if(type==='adjective'||category.includes('adjective'))return'adjective';
    if(type==='pronoun'||category.includes('pronoun'))return'pronoun';
    if(type==='preposition'||category.includes('preposition'))return'function';
    if(category.includes('number')||category.includes('quantity'))return'number';
    return'noun';
  }
  function englishForm(entry){return String(entry.concept||'').replace(/^to\s+/i,'').trim();}

  function makeWordFactory(c,salt='') {
    const vowels=PHONETICS.vowels[c.vowels]||PHONETICS.vowels.standard, consonants=PHONETICS.consonants[c.consonants]||PHONETICS.consonants.balanced;
    const style=c.consonants==='guttural'?'guttural':c.consonants==='soft'?'soft':c.vowels==='extended'?'musical':'standard', structures=STRUCTURES[style], rng=rngFactory(`${c.seed}|${salt}`), used=new Set();
    const build=p=>p.replace(/[CV]/g,t=>t==='C'?choice(consonants,rng):choice(vowels,rng));
    return()=>{for(let tries=0;tries<200;tries++){const syllables=Math.max(1,Math.min(5,Math.round(c.mean+(rng()-.5)*1.6)));let word='';for(let i=0;i<syllables;i++)word+=build(choice(structures,rng));word=word.toLowerCase();if(word.length>1&&!used.has(word)){used.add(word);return word;}}return build('CVC')+Math.floor(rng()*10);};
  }
  function weightedSample(c,ranked,target) {
    const rng=rngFactory(`${c.seed}|semantic-sampling`), pool=ranked.map(x=>({...x})), out=[];
    while(pool.length&&out.length<target){const weights=pool.map(x=>Math.exp(Math.max(-2,Math.min(7,x.score))*.72)),total=weights.reduce((a,b)=>a+b,0);let n=rng()*total,i=pool.length-1;for(let j=0;j<weights.length;j++){n-=weights[j];if(n<=0){i=j;break;}}out.push(pool[i]);pool.splice(i,1);}return out;
  }
  function generateLexicon(c) {
    const make=makeWordFactory(c,'lexicon'), ranked=vocabulary.map(entry=>({entry,score:semanticScore(entry,c)})).filter(x=>String(x.entry.concept||'').trim()).sort((a,b)=>b.score-a.score||String(a.entry.concept).localeCompare(String(b.entry.concept))), sampled=weightedSample(c,ranked,Math.min(600,ranked.length));
    const lexicon=[],used=new Set();
    for(const {entry,score} of sampled){const concept=String(entry.concept||'').trim(),kind=classify(entry),key=`${concept.toLowerCase()}|${kind}|${entry.id||''}`;if(used.has(key))continue;used.add(key);lexicon.push({...entry,english:englishForm(entry),kind,word:make(),score});}
    return lexicon;
  }

  function findByKind(lexicon,kind){return lexicon.filter(x=>x.kind===kind);}
  function cleanVerb(v){return String(v||'').replace(/^to\s+/i,'').trim();}
  function englishSubject(x){return /^(you|i|we|they|he|she|it)$/i.test(x.english)?x.english:`the ${x.english}`;}
  function englishObject(x){return /^(you|me|us|them|him|her|it)$/i.test(x.english)?x.english:`the ${x.english}`;}
  function englishThirdPerson(v){const w=cleanVerb(v);if(/(s|x|z|ch|sh)$/.test(w))return `${w}es`;if(/[^aeiou]y$/.test(w))return `${w.slice(0,-1)}ies`;return `${w}s`;}
  function affix(base,kind,c){if(c.morphology==='isolating')return base;if(c.morphology==='fusional')return kind==='verb'?`${base}a`:`${base}i`;return kind==='verb'?`${base}-ta`:base;}
  function sentence(subject,verb,object,c){const forms={S:subject.word,V:affix(verb.word,'verb',c),O:object?.word||''};return c.order.split('').map(x=>forms[x]).filter(Boolean).join(' ');}

  /* Sample sentences are generated entirely from the current generated lexicon.
     There are no required English concepts or fixed vocabulary items. The engine
     selects available grammatical categories and semantic entries, then builds
     sentence frames from whatever the current lexicon actually contains. */
  function buildSamples(c,lexicon) {
    const rng=rngFactory(`${c.seed}|samples`), nouns=findByKind(lexicon,'noun').filter(x=>x.english), verbs=findByKind(lexicon,'verb').filter(x=>x.english), adjs=findByKind(lexicon,'adjective').filter(x=>x.english);
    const samples=[], used=new Set();
    const shuffled=a=>a.map(x=>({x,k:rng()})).sort((a,b)=>a.k-b.k).map(y=>y.x);
    const ns=shuffled(nouns), vs=shuffled(verbs), as=shuffled(adjs);
    const push=(key,con,eng)=>{if(!used.has(key)){used.add(key);samples.push({conlang:con,english:eng});}};
    if(ns.length>=2&&vs.length>=1){for(let i=0;i<Math.min(4,vs.length,ns.length-1);i++){const s=ns[i%ns.length],o=ns[(i+1)%ns.length],v=vs[i];push(`svo${i}`,sentence(s,v,o,c),`${englishSubject(s)} ${englishThirdPerson(v)} ${englishObject(o)}.`);}}
    if(ns.length>=1&&vs.length>=1){for(let i=0;i<Math.min(2,vs.length);i++){const s=ns[(i+4)%ns.length],v=vs[(i+4)%vs.length];push(`sv${i}`,sentence(s,v,null,c),`${englishSubject(s)} ${englishThirdPerson(v)}.`);}}
    if(ns.length>=1&&as.length>=1){const s=ns[0],a=as[0],con=c.adjectivePosition==='before'?`${a.word} ${s.word}`:`${s.word} ${a.word}`;push('adj',con,`${englishSubject(s)} is ${a.english}.`);}
    if(ns.length>=2&&vs.length>=2){const s=ns[ns.length-1],v=vs[vs.length-1],o=ns[ns.length-2];push('extra',sentence(s,v,o,c),`${englishSubject(s)} ${englishThirdPerson(v)} ${englishObject(o)}.`);}
    return samples.slice(0,8);
  }

  function grammar(c){return {'Word order':c.order,'Morphology':c.morphology,'Adjectives':c.adjectivePosition==='before'?'Before noun':'After noun','Articles':c.articles,'Plural':c.plural==='none'?'No productive plural':c.plural==='prefix'?'Prefix':'Suffix','Relations':c.relations==='cases'?'Case endings':'Prepositions / word order'};}
  function languageName(c){const make=makeWordFactory({...c,mean:2},'language-name');return`${make().replace(/^./,ch=>ch.toUpperCase())}ic`;}
  function semanticChips(c){return['region','culture','biome','temporal_setting','tags'].flatMap(f=>c[f].map(v=>`${f}: ${v}`));}

  function renderGeneration(c,lexicon,samples){
    const chips=semanticChips(c),g=grammar(c),name=languageName(c);$('db-status').textContent=`Vocabulary: ${vocabulary.length} entries · Generated lexicon: ${lexicon.length}`;$('generation-output').className='result';
    $('generation-output').innerHTML=`<div class="hero"><div><div class="lang-name">${esc(name)}</div><div class="sub">Generated from the current semantic profile and phonological / grammatical parameters.</div><div class="chips">${chips.length?chips.map(v=>`<span class="chip">${esc(v)}</span>`).join(''):'<span class="chip">No semantic restrictions</span>'}</div></div><div class="kv">${Object.entries(g).map(([k,v])=>`<b>${esc(k)}</b><span>${esc(v)}</span>`).join('')}</div></div><div class="grid"><div class="card"><h3>Phonology</h3><div class="kv"><b>Vowels</b><span>${esc(PHONETICS.vowels[c.vowels].join(' '))}</span><b>Consonants</b><span>${esc(PHONETICS.consonants[c.consonants].join(' '))}</span><b>Mean syllables</b><span>${esc(c.mean)}</span></div></div><div class="card"><h3>Generation</h3><div class="kv"><b>Lexicon size</b><span>${lexicon.length}</span><b>Seed</b><span>${esc(c.seed)}</span></div></div></div><div class="card" style="margin-top:14px"><h3>Sample sentences</h3>${samples.length?samples.map(s=>`<div class="sentence"><div class="con">${esc(s.conlang)}</div><div class="eng">${esc(s.english)}</div></div>`).join(''):'<div class="empty">The generated lexicon does not contain enough grammatical categories to build sample sentences.</div>'}</div>`;
  }
  function renderLexicon(lexicon){const rows=[...lexicon].sort((a,b)=>a.english.localeCompare(b.english));$('lexicon-output').innerHTML=`<div class="card"><h3>Generated lexicon</h3><div class="sub" style="margin-bottom:10px">${rows.length} generated entries</div><div class="lexicon">${rows.map(x=>`<div class="lex-row"><div class="word">${esc(x.word)}</div><div class="eng">${esc(x.english)}</div><div class="meta">${esc(x.category||'')} · ${esc(x.kind||'')}</div></div>`).join('')}</div></div>`;}
  function renderDictionary(lexicon){
    const dir=$('dictionary-direction').value,q=($('dictionary-search').value||'').trim().toLowerCase();let rows=lexicon.map(x=>({a:dir==='conlang-en'?x.word:x.english,b:dir==='conlang-en'?x.english:x.word,meta:`${x.category||''}${x.kind?` · ${x.kind}`:''}`}));if(q)rows=rows.filter(x=>`${x.a} ${x.b} ${x.meta}`.toLowerCase().includes(q));rows.sort((a,b)=>a.a.localeCompare(b.a));
    $('dictionary-output').innerHTML=rows.length?`<div class="card"><div class="dictionary">${rows.map(x=>`<div class="dict-row"><strong>${esc(x.a)}</strong><span>${esc(x.b)}</span><span class="meta">${esc(x.meta)}</span></div>`).join('')}</div></div>`:'<div class="empty">No dictionary entries match the search.</div>';
  }
  function renderAll(c,lexicon,samples){generated={config:c,lexicon,samples};renderGeneration(c,lexicon,samples);renderLexicon(lexicon);renderDictionary(lexicon);}

  function generate(randomize=true){
    if(!vocabulary.length){$('message').textContent='Vocabulary is not loaded.';return;}
    if(randomize)randomizeGenerationParameters();
    const c=config(),lexicon=generateLexicon(c),samples=buildSamples(c,lexicon);renderAll(c,lexicon,samples);$('message').textContent=`Generated ${lexicon.length} lemmas.`;
  }
  function regenerateLexicon(){
    if(!vocabulary.length){$('message').textContent='Vocabulary is not loaded.';return;}
    if(!generated){generate(true);return;}
    $('seed').value=`${Date.now()}-${Math.floor(Math.random()*1000000)}`;const c=config(),lexicon=generateLexicon(c),samples=buildSamples(c,lexicon);renderAll(c,lexicon,samples);$('message').textContent=`Regenerated ${lexicon.length} lemmas with the current semantic profile.`;
  }

  function setPreset(name){
    const maps={historical:{temporal_setting:'ancient'},fantasy:{tags:'fantasy'},modern:{temporal_setting:'modern'},scifi:{region:'space'}};const m=maps[name];if(!m)return;Object.entries(m).forEach(([id,v])=>{const el=$(id);if(el&&[...el.options].some(o=>o.value===v))el.value=v;});
  }
  function clearFilters(){['region','culture','biome','temporal_setting','tags'].forEach(id=>$(id).value='');}

  async function loadVocabulary(){
    try{
      const response=await fetch(`vocabulary.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();
      vocabulary=Array.isArray(data)?data:(Array.isArray(data.vocabulary)?data.vocabulary:[]);if(!vocabulary.length)throw new Error('No vocabulary entries found.');populateFilters();$('db-status').textContent=`Vocabulary: ${vocabulary.length} entries · v${VERSION}`;
    }catch(err){$('db-status').textContent='Vocabulary load failed';$('generation-output').innerHTML=`<div class="error">Unable to load vocabulary.json: ${esc(err.message)}</div>`;}
  }

  const title=document.querySelector('h1');if(title&&!title.querySelector('.version')){const badge=document.createElement('span');badge.className='version';badge.textContent=VERSION;title.appendChild(badge);}
  $('generate').addEventListener('click',()=>generate(true));
  $('regenerate').addEventListener('click',regenerateLexicon);
  $('clear-filters').addEventListener('click',clearFilters);
  [['preset-historical','historical'],['preset-fantasy','fantasy'],['preset-modern','modern'],['preset-scifi','scifi']].forEach(([id,n])=>$(id)?.addEventListener('click',()=>setPreset(n)));
  $('dictionary-direction').addEventListener('change',()=>generated&&renderDictionary(generated.lexicon));
  $('dictionary-search').addEventListener('input',()=>generated&&renderDictionary(generated.lexicon));

  window.ConlangGenerator={version:VERSION,getVocabulary:()=>vocabulary,getGenerated:()=>generated,generate:()=>generate(true)};
  loadVocabulary();
})();