/* ConLang Generator loader v0.7.13 */
(() => {
  'use strict';

  const VERSION = '0.7.13';
  const $ = id => document.getElementById(id);
  const arr = v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
  const norm = v => String(v ?? '').toLowerCase().trim().replace(/^to\s+/, '').replace(/[-\s]+/g, '_');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const GRAMMAR = new Set([
    'i','you','we','they','me','my','this','that','here','there','today','tomorrow','yesterday',
    'who','what','where','when','why','how','many','all','nothing','not','can','have','be',
    'to','from','with','in','the'
  ]);

  const SEMANTIC_HINTS = {
    'name_role':['name','role','person','social_role'],
    'relationship_friendship':['relationship','friend','friendship','kinship'],
    'near_object':['near','object','inanimate'],
    'distant_object':['distant','object','inanimate'],
    'near_place_adverb':['near','place','here'],
    'distant_place_adverb':['distant','place','there'],
    'fundamental_resource':['fundamental','resource'],
    'natural_element':['natural','element'],
    'physical_adjective_1':['physical','adjective'],
    'physical_adjective_2':['physical','adjective'],
    'living_being_1':['living','being'],
    'living_being_2':['living','being'],
    'consumption_verb':['consumption','consume','eat','drink'],
    'food_resource':['food','resource'],
    'liquid':['liquid'],
    'perception_verb':['perception','perceive','see','hear','sense'],
    'violence_hunting_verb':['violence','hunting','hunt','attack'],
    'generic_action_verb':['action','activity','generic'],
    'positive_emotion_verb':['emotion_positive','positive','affection','love'],
    'negative_emotion_verb':['emotion_negative','negative','fear','hate'],
    'movement_verb':['movement','move'],
    'geographical_place':['place','geographical'],
    'natural_movement_verb':['movement','natural'],
    'gravity_movement_verb':['gravity','movement'],
    'air_water_movement_verb':['air_water_movement','movement'],
    'ground_movement_verb':['ground_movement','movement'],
    'natural_zone':['natural_zone','zone'],
    'stasis_imperative_verb':['stasis','stop'],
    'movement_imperative_verb':['movement','move'],
    'future_movement_verb':['movement','future'],
    'action_verb':['action','activity'],
    'process_verb':['process'],
    'vital_resource':['vital_resource','resource'],
    'will_verb':['volition','will'],
    'limited_action_verb':['action','ability','permission'],
    'cognition_verb':['cognition','know'],
    'help_action_verb':['help','action'],
    'forbidden_action_verb':['prohibition','forbidden','action'],
    'physical_need_state':['need','bodily','physical'],
    'body_part':['body_part','organ'],
    'pain_verb':['pain'],
    'rest_verb':['rest'],
    'large_quantity':['large','quantity'],
    'small_quantity':['small','quantity'],
    'readiness_state':['readiness','ready'],
    'present_activity_verb':['activity','present'],
    'future_activity_verb':['activity','future'],
    'past_event_verb':['event','past'],
    'entity':['entity']
  };

  function status(t){ if($('db-status')) $('db-status').textContent=t; }
  function message(t){ if($('message')) $('message').textContent=t; }

  function addVersion(){
    const h=document.querySelector('h1'); if(!h) return;
    let b=h.querySelector('.version-badge');
    if(!b){ b=document.createElement('span'); b.className='version-badge'; b.style.cssText='display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#18243a;border:1px solid #2a3b59;color:#a9c4e8;font-size:11px;vertical-align:middle'; h.appendChild(b); }
    b.textContent=`v${VERSION}`;
  }

  function installStyles(){
    if($('conlang-loader-style')) return;
    const s=document.createElement('style'); s.id='conlang-loader-style'; s.textContent=`
      #sample-sentences{display:grid;gap:10px;margin-top:16px}
      .sample-sentence-pill{background:#11182a;border:1px solid #26324a;border-radius:10px;padding:11px 14px;box-shadow:0 2px 8px rgba(0,0,0,.16)}
      .sample-english{color:#d9e2ef;margin-bottom:5px}
      .sample-conlang{font-weight:700;color:#fff;line-height:1.7}
      .sample-number{display:inline-block;min-width:28px;color:#8fa0ba;font-weight:400}
      .sample-word{display:inline-block;cursor:help;border-bottom:1px dotted #8fa0ba}
      #conlang-tooltip{position:fixed;z-index:99999;display:none;pointer-events:none;padding:5px 8px;border-radius:6px;background:#050914;color:#fff;border:1px solid #42506a;box-shadow:0 4px 14px rgba(0,0,0,.35);font-size:12px;font-weight:400;white-space:nowrap}
    `; document.head.appendChild(s);
    const tip=document.createElement('div'); tip.id='conlang-tooltip'; document.body.appendChild(tip);
    document.addEventListener('mouseover',e=>{ const w=e.target.closest('.sample-word'); if(!w)return; tip.textContent=w.dataset.meaning||'?'; tip.style.display='block'; const r=w.getBoundingClientRect(); tip.style.left=`${Math.max(6,Math.min(innerWidth-tip.offsetWidth-6,r.left))}px`; tip.style.top=`${Math.max(6,r.top-tip.offsetHeight-6)}px`; });
    document.addEventListener('mouseout',e=>{ if(e.target.closest('.sample-word')) tip.style.display='none'; });
  }

  function installFetchShim(){
    if(window.__conlangFetchShim) return; window.__conlangFetchShim=true;
    const native=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const response=await native(input,init); const url=typeof input==='string'?input:(input?.url||'');
      if(!url.includes('vocabulary.json')) return response;
      const data=await response.clone().json(); const list=Array.isArray(data)?data:data?.vocabulary;
      if(!Array.isArray(list)) throw new Error('Invalid vocabulary.json structure.');
      return new Response(JSON.stringify(list),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'application/json'}});
    };
  }

  function maps(lexicon){
    const byConcept=new Map(), byWord=new Map();
    for(const e of lexicon||[]){
      const concept=String(e.concept??'').trim(), word=String(e.conlang??'').trim(); if(!concept||!word)continue;
      const hit={word,concept,entry:e}; byConcept.set(norm(concept),hit); byConcept.set(norm(`to ${concept}`),hit); byWord.set(word.toLowerCase(),concept);
    }
    return {byConcept,byWord};
  }

  function entryText(e){ return [e.concept,e.semantic_group,e.category,e.word_type,e.scope,...arr(e.tags),...arr(e.features),...arr(e.region),...arr(e.culture),...arr(e.biome),...arr(e.temporal_setting)].map(norm).join(' '); }
  function kind(e){ return norm(e.word_type||e.kind||e.category); }

  function resolveSemantic(placeholder,lexicon,used){
    const key=norm(placeholder); const hints=SEMANTIC_HINTS[key]||key.split('_');
    let wanted='noun';
    if(/verb/.test(key)||/imperative/.test(key)||/movement_verb/.test(key)) wanted='verb';
    else if(/adjective/.test(key)||/state$/.test(key)) wanted='adjective';
    const scored=[];
    for(const e of lexicon||[]){
      const k=kind(e); const text=entryText(e); let score=0;
      if(wanted==='verb' && k!=='verb') continue;
      if(wanted==='noun' && !['noun',''].includes(k) && !/noun/.test(k)) continue;
      if(wanted==='adjective' && !/adjective/.test(k)) continue;
      for(const h of hints){ if(text.includes(norm(h))) score += 3; }
      if(text.includes(key)) score+=8;
      if(used.has(e.id)) score-=1;
      if(score>0) scored.push({e,score});
    }
    scored.sort((a,b)=>b.score-a.score); return scored[0]?.e||null;
  }

  function replacePlaceholders(root,lexicon,mp){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[]; while(walker.nextNode())nodes.push(walker.currentNode);
    const used=new Set();
    for(const node of nodes){
      const original=node.nodeValue; if(!original.includes('<'))continue;
      const replaced=original.replace(/<([^<>]+)>/g,(whole,raw)=>{
        const label=raw.trim(), key=norm(label);
        if(GRAMMAR.has(key)){ const hit=mp.byConcept.get(key); return hit?hit.word:whole; }
        const candidate=resolveSemantic(label,lexicon,used);
        if(!candidate) return whole;
        used.add(candidate.id);
        return candidate.conlang;
      });
      if(replaced!==original) node.nodeValue=replaced;
    }
  }

  function addTooltips(root,mp){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[]; while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest('.sample-word'))continue;
      const text=node.nodeValue; const re=/[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*/g; let last=0,m,changed=false; const frag=document.createDocumentFragment();
      while((m=re.exec(text))){ const word=m[0], meaning=mp.byWord.get(word.toLowerCase()); if(!meaning)continue; changed=true; frag.append(document.createTextNode(text.slice(last,m.index))); const span=document.createElement('span'); span.className='sample-word'; span.dataset.meaning=meaning; span.textContent=word; frag.append(span); last=m.index+word.length; }
      if(changed){frag.append(document.createTextNode(text.slice(last))); node.parentNode.replaceChild(frag,node);}
    }
  }

  function renderSamples(engine,config,lexicon){
    let box=$('sample-sentences');
    if(!box){ box=document.createElement('div'); box.id='sample-sentences'; const out=$('generation-output'); if(out)out.appendChild(box); else document.querySelector('#generator main')?.appendChild(box); }
    const mp=maps(lexicon); let samples=[];
    try{samples=engine.samples(config,lexicon)||[];}catch(e){message(`Sample sentence error: ${e.message}`);return;}
    box.innerHTML='';
    for(const sample of samples){
      const pill=document.createElement('div'); pill.className='sample-sentence-pill';
      const en=document.createElement('div'); en.className='sample-english'; en.innerHTML=`<span class="sample-number">${esc(sample.number)}.</span>${esc(sample.english)}`;
      const con=document.createElement('div'); con.className='sample-conlang';
      con.innerHTML=`<span class="sample-number">${esc(sample.number)}.</span>${engine.sentenceHtml(sample,config)}`;
      replacePlaceholders(con,lexicon,mp); addTooltips(con,mp); pill.append(en,con); box.appendChild(pill);
    }
  }

  function renderLexicon(lexicon){ const out=$('lexicon-output'); if(!out)return; out.innerHTML=`<div class="card"><h3>Generated lexicon</h3><div class="lexicon">${lexicon.map(e=>`<div class="lex-row"><div class="word">${esc(e.conlang)}</div><div class="eng">${esc(e.concept)}</div><div class="meta">${esc(e.category||e.word_type||'')}</div></div>`).join('')}</div></div>`; }
  function renderDictionary(lexicon){ const out=$('dictionary-output'); if(!out)return; const direction=$('dictionary-direction')?.value||'conlang-en',q=($('dictionary-search')?.value||'').toLowerCase().trim(); let rows=lexicon.map(e=>({a:direction==='conlang-en'?e.conlang:e.concept,b:direction==='conlang-en'?e.concept:e.conlang,m:e.category||e.word_type||''})); if(q)rows=rows.filter(r=>`${r.a} ${r.b} ${r.m}`.toLowerCase().includes(q)); rows.sort((a,b)=>a.a.localeCompare(b.a)); out.innerHTML=`<div class="card"><h3>${direction==='conlang-en'?'Conlang → English':'English → Conlang'}</h3><div class="dictionary">${rows.map(r=>`<div class="dict-row"><strong>${esc(r.a)}</strong><span>${esc(r.b)}</span><span class="meta">${esc(r.m)}</span></div>`).join('')}</div></div>`; }

  async function start(){
    addVersion(); installStyles(); installFetchShim();
    const script=document.createElement('script'); script.src=`conlang_engine_legacy.js?v=${VERSION}`;
    script.onload=async()=>{
      try{
        const engine=window.ConLangEngine; if(!engine)throw new Error('ConLangEngine did not initialize.');
        window.addEventListener('conlang:generated',e=>{ const d=e.detail||{},lex=d.lexicon||engine.getGeneratedVocabulary?.()||[]; renderLexicon(lex); renderDictionary(lex); if(d.config)renderSamples(engine,d.config,lex); message(`Generated ${lex.length} entries and 50 sample sentences.`); });
        $('generate')?.addEventListener('click',()=>{try{engine.generate();}catch(e){message(`Generation error: ${e.message}`);console.error(e);}});
        $('regenerate')?.addEventListener('click',()=>{try{engine.generate();}catch(e){message(`Generation error: ${e.message}`);console.error(e);}});
        $('dictionary-direction')?.addEventListener('change',()=>renderDictionary(engine.getGeneratedVocabulary?.()||[]));
        $('dictionary-search')?.addEventListener('input',()=>renderDictionary(engine.getGeneratedVocabulary?.()||[]));
        await engine.loadVocabulary(); status(`Vocabulary loaded: ${engine.getGeneratedVocabulary?.().length||0} entries`);
      }catch(e){console.error(e);status(`Vocabulary load error: ${e.message}`);message(`Engine error: ${e.message}`);}
    };
    script.onerror=()=>{status('Engine load error.');message('Engine failed to load.');}; document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();