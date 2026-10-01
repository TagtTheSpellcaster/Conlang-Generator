/* ConLang Generator loader v0.7.10 */
(() => {
  'use strict';
  const VERSION='0.7.10', $=id=>document.getElementById(id);
  const norm=v=>String(v??'').toLowerCase().trim().replace(/^to\s+/,'').replace(/[-\s]+/g,'_');
  const arr=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status=t=>{if($('db-status'))$('db-status').textContent=t};
  const msg=t=>{if($('message'))$('message').textContent=t};

  const grammar={be:['be'],have:['have'],i:['i'],you:['you'],we:['we'],they:['they'],me:['me'],my:['my'],this:['this'],that:['that'],who:['who'],what:['what'],where:['where'],when:['when'],why:['why'],how:['how'],many:['many'],nothing:['nothing'],all:['all'],not:['not'],can:['can'],to:['to'],from:['from'],with:['with'],in:['in'],the:['the'],here:['here'],there:['there'],today:['today'],tomorrow:['tomorrow'],yesterday:['yesterday']};
  const semantic={'consumption verb':['consumption'],'perception verb':['perception'],'violence/hunting verb':['violence','hunting'],'generic action verb':['activity','action'],'positive emotion verb':['emotion_positive','positive_emotion'],'negative emotion verb':['emotion_negative','negative_emotion'],'movement verb':['movement'],'natural movement verb':['natural_movement','movement'],'gravity movement verb':['gravity'],'air/water movement verb':['air_water_movement','air','water'],'ground movement verb':['ground_movement','ground'],'stop imperative verb':['stasis'],'movement imperative verb':['movement'],'future movement verb':['movement'],'action verb':['activity','action'],'will verb':['volition'],'limited action verb':['activity','action'],'cognition verb':['cognition'],'help action verb':['help'],'forbidden action verb':['prohibition'],'pain verb':['pain'],'rest verb':['rest'],'negative existence verb':['existence'],'present activity verb':['activity','action'],'future activity verb':['activity','action'],'past event verb':['event','change','activity'],'process verb':['process'],'name/role':['person','occupation','profession','role'],'relationship/friendship':['relationship'],'near object':['inanimate_object'],'distant object':['inanimate_object'],'near place adverb':['place','location'],'distant place adverb':['place','location'],'fundamental resource':['fundamental_resource','resource','vital_resource'],'natural element':['natural_element'],'physical adjective 1':['physical'],'physical adjective 2':['physical'],'living being 1':['living_being','animal','person'],'living being 2':['living_being','animal','person'],'food resource':['food','resource'],liquid:['liquid'],'living being':['living_being','animal','person'],threat:['threat'],'geographical place':['geographical_feature','geographical_place','place','settlement'],'cosmic element':['cosmic'],'inanimate object':['inanimate_object'],animal:['animal'],'vertical direction':['direction','vertical'],'natural zone':['natural_zone'],'organ/body part':['body_part','organ'],'path/road':['path','road'],'physical need/state':['need','bodily_function'],'large quantity':['large','quantity'],'small quantity':['small','quantity'],'readiness state':['readiness'],'vital resource':['vital_resource'],'plural entities':['entity'],entity:['entity']};

  function values(e){return ['semantic_group','category','tags','features'].flatMap(f=>arr(e?.[f]).flatMap(x=>String(x).split(/[;,]/)).map(norm).filter(Boolean))}
  function find(lex,label){
    const exact=grammar[label];
    if(exact){const e=lex.find(x=>exact.includes(norm(x.concept)));if(e)return e}
    const groups=semantic[label]||[];
    return lex.find(e=>{
      const kind=norm(e.kind||e.word_type);
      if(label.includes('verb')&&kind&&kind!=='verb')return false;
      if(label.includes('adjective')&&kind&&kind!=='adjective')return false;
      return groups.some(g=>values(e).some(v=>v===norm(g)||v.includes(norm(g))||norm(g).includes(v)));
    })||null;
  }
  function repair(item,lex,config){
    if(!item?.placeholder)return item;
    const label=String(item.text||'').replace(/^<|>$/g,'').trim().toLowerCase(), e=find(lex,label);
    if(!e?.conlang)return item;
    let word=e.conlang;
    if(label==='be'||label==='have'||label.endsWith('verb')){if(config.morphology==='suffixing')word+='-ta';else if(config.morphology==='prefixing')word='ka-'+word}
    return {word,english:e.concept||label};
  }
  const repairValue=(v,lex,c)=>Array.isArray(v)?v.map(x=>repairValue(x,lex,c)):repair(v,lex,c);

  function addVersion(){const h=document.querySelector('h1');if(!h)return;let b=h.querySelector('.version-badge');if(!b){b=document.createElement('span');b.className='version-badge';b.style.cssText='display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#18243a;border:1px solid #2a3b59;color:#a9c4e8;font-size:11px;vertical-align:middle';h.appendChild(b)}b.textContent='v'+VERSION}
  function styles(){if($('sample-runtime-style'))return;const s=document.createElement('style');s.id='sample-runtime-style';s.textContent='.sample-list{display:grid;gap:10px;margin-top:16px}.sample-sentence-pill{background:#11182a;border:1px solid #26324a;border-radius:12px;padding:10px 13px}.sample-english{color:#a9b7ca;font-size:13px}.sample-conlang{font-weight:700;margin-top:4px}.sample-number{display:inline-block;min-width:28px;color:#8fa0ba;font-weight:700}.sample-word{cursor:help}.sample-placeholder{font-style:italic;font-weight:700}';document.head.appendChild(s)}
  function sampleBox(){let c=$('sample-sentences');if(c)return c;const o=$('generation-output');if(!o)return null;c=document.createElement('div');c.id='sample-sentences';c.className='sample-list';o.insertAdjacentElement('afterend',c);return c}

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{const r=await nativeFetch(input,init),u=typeof input==='string'?input:input?.url||'';if(!u.includes('vocabulary.json'))return r;const d=await r.clone().json(),list=Array.isArray(d)?d:d?.vocabulary;if(!Array.isArray(list))throw new Error('vocabulary.json does not contain a vocabulary array.');return new Response(JSON.stringify(list),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}})};

  function renderDictionary(lex){const o=$('dictionary-output');if(!o)return;const dir=$('dictionary-direction')?.value||'conlang-en',q=($('dictionary-search')?.value||'').trim().toLowerCase();let rows=lex.map(e=>({l:dir==='conlang-en'?e.conlang:e.concept,r:dir==='conlang-en'?e.concept:e.conlang,m:e.category||e.word_type||''}));if(q)rows=rows.filter(x=>`${x.l} ${x.r} ${x.m}`.toLowerCase().includes(q));rows.sort((a,b)=>String(a.l).localeCompare(String(b.l)));o.innerHTML=`<div class="card"><h3>${dir==='conlang-en'?'Conlang → English':'English → Conlang'}</h3><div class="dictionary">${rows.map(x=>`<div class="dict-row"><strong>${esc(x.l)}</strong><span>${esc(x.r)}</span><span class="meta">${esc(x.m)}</span></div>`).join('')}</div></div>`}

  function render(detail,engine){const lex=detail?.lexicon||[],c=detail?.config;if($('lexicon-output'))$('lexicon-output').innerHTML=`<div class="card"><h3>Generated lexicon</h3><div class="lexicon">${lex.map(x=>`<div class="lex-row"><div class="word">${esc(x.conlang)}</div><div class="eng">${esc(x.concept)}</div><div class="meta">${esc(x.category||x.word_type||'')}</div></div>`).join('')}</div></div>`;renderDictionary(lex);styles();const box=sampleBox();if(!box||!c)return;const sentences=engine.samples(c,lex);box.innerHTML=sentences.map(s=>{const html=engine.sentenceHtml(s,c);return `<div class="sample-sentence-pill"><div class="sample-english"><span class="sample-number">${s.number}.</span>${esc(s.english)}</div><div class="sample-conlang"><span class="sample-number">${s.number}.</span>${html}</div></div>`}).join('');msg(`Generated ${lex.length} entries and 50 sample sentences.`)}

  function start(){const legacy=document.createElement('script');legacy.src=`conlang_engine_legacy.js?v=${VERSION}`;legacy.onload=async()=>{try{const e=window.ConLangEngine;if(!e)throw new Error('ConLangEngine did not initialize.');const oldSamples=e.samples;e.samples=(cfg,lex)=>oldSamples(cfg,lex).map(s=>({...s,S:repairValue(s.S,lex,cfg),V:repairValue(s.V,lex,cfg),O:repairValue(s.O,lex,cfg),extra:repairValue(s.extra||[],lex,cfg)}));addVersion();$('generate')?.addEventListener('click',()=>{try{e.generate()}catch(x){msg(`Generation error: ${x.message}`)}});$('regenerate')?.addEventListener('click',()=>{try{e.generate()}catch(x){msg(`Generation error: ${x.message}`)}});$('randomize')?.addEventListener('click',()=>e.randomize());window.addEventListener('conlang:generated',ev=>render(ev.detail,e));$('dictionary-direction')?.addEventListener('change',()=>renderDictionary(e.getGeneratedVocabulary()));$('dictionary-search')?.addEventListener('input',()=>renderDictionary(e.getGeneratedVocabulary()));status('Loading vocabulary…');await e.loadVocabulary();status('Vocabulary loaded.')}catch(x){console.error(x);status(`Vocabulary load error: ${x.message}`);msg(`Engine error: ${x.message}`)}};legacy.onerror=()=>{status('Engine load error.');msg('Engine failed to load.')};document.head.appendChild(legacy)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
