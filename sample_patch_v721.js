/* ConLang Generator sample integrity patch — v0.7.21 */
(() => {
  'use strict';
  const VERSION='0.7.21';
  const norm=v=>String(v??'').toLowerCase().trim().replace(/^to\s+/,'');
  const arr=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CONCRETE=['i','you','we','they','me','my','your','this','that','here','there','today','tomorrow','yesterday','who','what','where','when','why','how','many','all','nothing','not','can','have','be','to','from','with','in','the','friend','sister','father','water','food','bread','sword','house','tree','sun','moon','stone','hot','cold','bright','eat','drink','wolf','dog','horse','hunter','kill','hunt','love','trust','help','enemy','village','city','forest','bird','fish','up','down','way','road','hungry','hand','much','little','ready','farmer','boat','small','large'];
  const TAGS=['consumption','perception','emotion_negative','movement','natural_movement','gravity','air_water_movement','ground_movement','stasis','activity','process','volition','cognition','help','prohibition','pain','rest','existence','construction'];
  const V={standard:['a','e','i','o','u'],minimal:['a','i','u'],extended:['a','e','i','o','u','y','ø','æ']};
  const C={balanced:['p','t','k','b','d','g','m','n','s','r','l','f','v'],guttural:['k','q','x','g','r','kh','gh','t','d'],sibilant:['s','z','sh','zh','f','v','r','l','th'],soft:['m','n','l','r','w','j','v','dh']};
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let x=hash(seed)||1;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  function factory(config,used){const vs=V[config.vowels]||V.standard,cs=C[config.consonants]||C.balanced,pats=config.consonants==='guttural'?['CVC','CCVC','CVCC']:config.consonants==='soft'?['CV','CVV','CVC','V']:['CV','CVC','CVV','VC'],r=rng((config.seed||'auto')+'|v721'),pick=a=>a[Math.floor(r()*a.length)];return()=>{for(let n=0;n<500;n++){let w='',count=Math.max(1,Math.min(5,Math.round((Number(config.mean)||2.2)+(r()-.5)*1.6)));for(let i=0;i<count;i++)for(const ch of pick(pats))w+=ch==='C'?pick(cs):pick(vs);w=w.toLowerCase();if(w.length>1&&!used.has(w)){used.add(w);return w}}return'lex'+Math.floor(r()*1e9)}}
  function mapByConcept(list){const m=new Map();for(const e of list){const k=norm(e.concept||e.english);if(k&&!m.has(k))m.set(k,e)}return m}
  function tagVerb(list,tag){return list.find(e=>norm(e.word_type)==='verb'&&arr(e.tags).some(t=>norm(t)===norm(tag))&&e.conlang)||null}
  function T(e){if(!e||!e.conlang)return'';const meaning=e.concept||e.english||'';return `<span class="sample-word" data-meaning="${esc(meaning)}" title="${esc(meaning)}">${esc(e.conlang)}</span>`}
  function F(m,c){return T(m.get(norm(c)))}
  function A(m,cs){return '['+cs.map(c=>T(m.get(norm(c)))).join('|')+']'}
  function samples(list){const m=mapByConcept(list),tag=t=>T(tagVerb(list,t));const rows=[
    ['I am your [friend|sister|father].',`${F(m,'i')} ${F(m,'be')} ${F(m,'your')} ${A(m,['friend','sister','father'])}`],
    ['You are my [friend|sister|father].',`${F(m,'you')} ${F(m,'be')} ${F(m,'my')} ${A(m,['friend','sister','father'])}`],
    ['This is [water|food|bread].',`${F(m,'this')} ${F(m,'be')} ${A(m,['water','food','bread'])}`],
    ['That is [a sword|a house|a tree].',`${F(m,'that')} ${F(m,'be')} ${A(m,['sword','house','tree'])}`],
    ['We are here.',`${F(m,'we')} ${F(m,'be')} ${F(m,'here')}`],
    ['They are there.',`${F(m,'they')} ${F(m,'be')} ${F(m,'there')}`],
    ['I have [water|food|bread].',`${F(m,'i')} ${F(m,'have')} ${A(m,['water','food','bread'])}`],
    ['You have [water|food|bread].',`${F(m,'you')} ${F(m,'have')} ${A(m,['water','food','bread'])}`],
    ['The [sun|moon|stone] is [hot|cold|bright].',`${F(m,'the')} ${A(m,['sun','moon','stone'])} ${F(m,'be')} ${A(m,['hot','cold','bright'])}`],
    ['I eat [food|bread].',`${F(m,'i')} ${tag('consumption')} ${A(m,['food','bread'])}`],
    ['[The wolf|the dog] drinks [water|milk].',`${F(m,'the')} ${A(m,['wolf','dog'])} ${tag('consumption')} ${A(m,['water','milk'])}`],
    ['I see you.',`${F(m,'i')} ${tag('perception')} ${F(m,'you')}`],
    ['You see me.',`${F(m,'you')} ${tag('perception')} ${F(m,'me')}`],
    ['The hunter [kills|hunts] the wolf.',`${F(m,'the')} ${F(m,'hunter')} ${A(m,['kill','hunt'])} ${F(m,'the')} ${F(m,'wolf')}`],
    ['I [love|trust|help] you.',`${F(m,'i')} ${A(m,['love','trust','help'])} ${F(m,'you')}`],
    ['I fear [the sword|the enemy].',`${F(m,'i')} ${tag('emotion_negative')} ${F(m,'the')} ${A(m,['sword','enemy'])}`],
    ['I go to the [village|city|forest].',`${F(m,'i')} ${tag('movement')} ${F(m,'to')} ${F(m,'the')} ${A(m,['village','city','forest'])}`],
    ['You come from the [village|city].',`${F(m,'you')} ${tag('movement')} ${F(m,'from')} ${F(m,'the')} ${A(m,['village','city'])}`],
    ['The sun rises.',`${F(m,'the')} ${F(m,'sun')} ${tag('natural_movement')}`],
    ['The stone falls.',`${F(m,'the')} ${F(m,'stone')} ${tag('gravity')}`],
    ['The [bird|fish] moves [up|down].',`${F(m,'the')} ${A(m,['bird','fish'])} ${tag('air_water_movement')} ${A(m,['up','down'])}`],
    ['The wolf walks in the forest.',`${F(m,'the')} ${F(m,'wolf')} ${tag('ground_movement')} ${F(m,'in')} ${F(m,'the')} ${F(m,'forest')}`],
    ['Stay here.',`${tag('stasis')} ${F(m,'here')}`],
    ['Come with me.',`${tag('movement')} ${F(m,'with')} ${F(m,'me')}`],
    ['Who are you?',`${F(m,'who')} ${F(m,'be')} ${F(m,'you')}`],
    ['What is this?',`${F(m,'what')} ${F(m,'be')} ${F(m,'this')}`],
    ['Where are we?',`${F(m,'where')} ${F(m,'be')} ${F(m,'we')}`],
    ['When do you go?',`${F(m,'when')} ${tag('movement')} ${F(m,'you')}`],
    ['Why do you do this?',`${F(m,'why')} ${tag('activity')} ${F(m,'this')}`],
    ['How does this work?',`${F(m,'how')} ${tag('process')} ${F(m,'this')}`],
    ['Where is the water?',`${F(m,'where')} ${F(m,'be')} ${F(m,'the')} ${F(m,'water')}`],
    ['I do not want this.',`${F(m,'i')} ${F(m,'not')} ${tag('volition')} ${F(m,'this')}`],
    ['You cannot enter.',`${F(m,'you')} ${F(m,'not')} ${F(m,'can')} ${tag('movement')}`],
    ['I do not know.',`${F(m,'i')} ${F(m,'not')} ${tag('cognition')}`],
    ['I know the way.',`${F(m,'i')} ${tag('cognition')} ${F(m,'the')} ${T(m.get('way')||m.get('road'))}`],
    ['I can help you.',`${F(m,'i')} ${F(m,'can')} ${tag('help')} ${F(m,'you')}`],
    ['Do not touch this.',`${F(m,'not')} ${tag('prohibition')} ${F(m,'this')}`],
    ['I am hungry.',`${F(m,'i')} ${F(m,'be')} ${F(m,'hungry')}`],
    ['My hand hurts.',`${F(m,'my')} ${F(m,'hand')} ${tag('pain')}`],
    ['I want to sleep.',`${F(m,'i')} ${tag('volition')} ${tag('rest')}`],
    ['This is [much|little].',`${F(m,'this')} ${F(m,'be')} ${A(m,['much','little'])}`],
    ['Everything is ready.',`${F(m,'all')} ${F(m,'be')} ${F(m,'ready')}`],
    ['Nothing exists.',`${F(m,'nothing')} ${tag('existence')}`],
    ['Today we work.',`${F(m,'today')} ${F(m,'we')} ${tag('activity')}`],
    ['Tomorrow we travel.',`${F(m,'tomorrow')} ${F(m,'we')} ${tag('movement')}`],
    ['Yesterday the hunter came.',`${F(m,'yesterday')} ${F(m,'the')} ${F(m,'hunter')} ${tag('movement')}`],
    ['The [dog|wolf|horse] sees the [hunter|farmer].',`${F(m,'the')} ${A(m,['dog','wolf','horse'])} ${tag('perception')} ${F(m,'the')} ${A(m,['hunter','farmer'])}`],
    ['I [eat|drink] [food|water].',`${F(m,'i')} ${A(m,['eat','drink'])} ${A(m,['food','water'])}`],
    ['The [sun|moon] is [bright|dark].',`${F(m,'the')} ${A(m,['sun','moon'])} ${F(m,'be')} ${A(m,['bright','dark'])}`],
    ['[The hunter|the farmer] has [food|water].',`${F(m,'the')} ${A(m,['hunter','farmer'])} ${F(m,'have')} ${A(m,['food','water'])}`],
    ['I see [the house|the village].',`${F(m,'i')} ${tag('perception')} ${F(m,'the')} ${A(m,['house','village'])}`],
    ['We build [a house|a boat].',`${F(m,'we')} ${tag('construction')} ${A(m,['house','boat'])}`],
    ['The [bird|fish] is [small|large].',`${F(m,'the')} ${A(m,['bird','fish'])} ${F(m,'be')} ${A(m,['small','large'])}`]
  ];return rows.map(([english,html],i)=>({number:i+1,english,html}))}
  function patch(){
    const detail=window.__conlangLastGeneration;if(!detail||!Array.isArray(detail.lexicon))return;
    fetch('vocabulary.json',{cache:'no-store'}).then(r=>r.json()).then(data=>{
      const source=Array.isArray(data)?data:(data.vocabulary||data.entries||[]),list=detail.lexicon,used=new Set(list.map(e=>e.conlang).filter(Boolean));
      const make=factory(detail.config||{},used),m=mapByConcept(list);
      for(const c of CONCRETE){const k=norm(c),existing=m.get(k);if(existing&&existing.conlang)continue;const src=source.find(e=>norm(e.concept||e.english)===k);if(!src)continue;const e={...src,conlang:make()};if(existing){const i=list.indexOf(existing);if(i>=0)list[i]=e}else list.push(e);m.set(k,e)}
      for(const t of TAGS){if(tagVerb(list,t))continue;const src=source.find(e=>norm(e.word_type)==='verb'&&arr(e.tags).some(x=>norm(x)===norm(t)));if(!src)continue;list.push({...src,conlang:make()})}
      const lex=document.querySelector('#lexicon-output .lexicon');if(lex){lex.innerHTML=list.slice().sort((a,b)=>String(a.concept||'').localeCompare(String(b.concept||''))).map(e=>`<div class="lex-row"><div class="word">${esc(e.conlang)}</div><div class="eng">${esc(e.concept||e.english||'')}</div><div class="meta">${esc(e.category||e.semantic_group||e.word_type||'')}</div></div>`).join('')}
      const box=document.getElementById('generation-output');const old=box?.querySelector('.sample-frame');if(old)old.remove();const rows=samples(list);if(box){const frame=document.createElement('div');frame.className='sample-frame';frame.innerHTML=`<h3>Sample sentences <span class="chip">v${VERSION}</span></h3>`+rows.map(x=>`<div class="sample-pill"><div class="en"><b>${x.number}.</b> ${x.english}</div><div class="cl"><b>${x.number}.</b> ${x.html}</div></div>`).join('');box.appendChild(frame)}
      const badge=document.querySelector('header h1 .version-badge');if(badge)badge.textContent='v'+VERSION;
    }).catch(console.error)
  }
  window.addEventListener('conlang:generated',e=>{window.__conlangLastGeneration=e.detail;setTimeout(patch,0)});
  setTimeout(()=>{const b=document.querySelector('header h1 .version-badge');if(b)b.textContent='v'+VERSION},0);
})();