/* ConLang Generator UI + phonology patch — v0.9.0 */
(() => {
  'use strict';
  const VERSION='0.9.0';
  let phonologyBusy=false;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').toLowerCase().replace(/^to\s+/,'').trim();
  const arr=v=>Array.isArray(v)?v.filter(x=>x!==null&&x!==undefined&&x!=='').map(String):(v==null||v===''?[]:[String(v)]);
  function styles(){if($('ui-patch-v090'))return;const s=document.createElement('style');s.id='ui-patch-v090';s.textContent='.base-parameters{margin-top:16px}.base-parameters-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.base-parameters .param-group{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:11px}.base-parameters .param-title{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--accent);margin-bottom:7px}.base-parameters .param-value{color:var(--text);line-height:1.5}';document.head.appendChild(s)}
  function tab(){let t=document.querySelector('.tab[data-tab="samples"]'),p=$('samples');if(t&&p)return p;const tabs=document.querySelector('.tabs'),d=tabs?.querySelector('.tab[data-tab="dictionary"]');t=document.createElement('button');t.type='button';t.className='tab';t.dataset.tab='samples';t.setAttribute('aria-selected','false');t.textContent='Sample Sentences';if(d)d.insertAdjacentElement('afterend',t);else tabs?.appendChild(t);p=document.createElement('section');p.id='samples';p.className='tab-panel';p.innerHTML='<main><div id="samples-output" class="result empty">Generate a language to populate the sample sentences.</div></main>';document.querySelector('#generator')?.insertAdjacentElement('afterend',p);t.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));t.classList.add('active');t.setAttribute('aria-selected','true');p.classList.add('active')});return p}
  function val(id){const e=$(id);if(!e)return'';return e.tagName==='SELECT'?[...e.selectedOptions].map(x=>x.value).filter(Boolean).join(', '):e.value||''}
  function params(){const b=$('generation-output');if(!b)return;let c=b.querySelector('.base-parameters');if(!c){c=document.createElement('div');c.className='card base-parameters';b.appendChild(c)}const g=[['Semantic profile',[['Region',val('region')||'Any'],['Culture',val('culture')||'Any'],['Biome',val('biome')||'Any'],['Temporal setting',val('temporal_setting')||'Any'],['Tags',val('tags')||'Any']]],['Phonology',[['Model',$('consonants')?.selectedOptions?.[0]?.textContent||''],['Vowels',$('vowels')?.selectedOptions?.[0]?.textContent||''],['Mean syllables',$('mean')?.value||'']]],['Morphosyntax',[['Word order',val('word-order')],['Morphology',$('morphology')?.selectedOptions?.[0]?.textContent||''],['Adjective position',$('adj-position')?.selectedOptions?.[0]?.textContent||''],['Articles',$('articles')?.selectedOptions?.[0]?.textContent||''],['Plural',$('plural')?.selectedOptions?.[0]?.textContent||''],['Grammatical relations',$('relations')?.selectedOptions?.[0]?.textContent||'']]]];c.innerHTML='<h3>Language parameters</h3><div class="base-parameters-grid">'+g.map(([t,a])=>'<div class="param-group"><div class="param-title">'+esc(t)+'</div>'+a.map(([k,v])=>'<div style="margin:4px 0"><span style="color:var(--muted)">'+esc(k)+':</span> <span class="param-value">'+esc(v)+'</span></div>').join('')+'</div>').join('')+'</div>'}
  function move(){const p=tab(),o=$('generation-output'),t=$('samples-output');if(!o||!t)return;const f=o.querySelector('.sample-frame');if(f){t.innerHTML='';t.appendChild(f)}params();setTimeout(phonologize,0)}
  const VOWELS={standard:['a','e','i','o','u'],minimal:['a','i','u'],extended:['a','e','i','o','u','y','ø','æ']};
  const MODEL={
    isolated:{name:'Minimalist Isolating',vowels:VOWELS.standard,c:['p','t','k','m','n','l','h'],glides:[],nasals:['m','n'],make:['CV','V']},
    japanese:{name:'Controlled Open Syllable',vowels:VOWELS.standard,c:['p','t','k','b','d','g','m','n','s','z','h','r','f'],glides:['j','w'],nasals:['n','m'],make:['CV','GV','CVN','CGV','CGVN','V']},
    european:{name:'Balanced European',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','v','s','z','m','n','r','l','j','w'],obstruents:['p','t','k','b','d','g','f','v'],sibilants:['s','z'],liquids:['r','l'],nasals:['m','n'],glides:['j','w'],make:['CV','CCV','CVC','CCVC','V']},
    english:{name:'Dynamic Anglo-Saxon',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','θ','s','z','m','n','ŋ','r','l','j','w'],sibilants:['s','z'],obstruents:['p','t','k','b','d','g','f','θ'],nasals:['m','n','ŋ'],liquids:['r','l'],glides:['j','w'],make:['CV','CVC','CCV','CCVC','CCCV','CVCC','CVCCC','CCVCC']},
    slavic:{name:'Compact Slavic',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','v','s','z','ʃ','ʒ','m','n','r','l','j'],liquids:['r','l'],make:['CV','CVC','CCV','CCCV','CVCC','CCCVCC','V']},
    semitic:{name:'Root-and-Pattern Semitic',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','s','z','ʃ','ħ','ʕ','m','n','r','l'],make:['CV','CVC']}
  };
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let x=hash(seed)||1;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  const pick=(a,r)=>a[Math.floor(r()*a.length)];
  const son={S:1,O:2,N:3,L:4,G:4};
  function modelFor(){return MODEL[$('consonants')?.value]||MODEL.european}
  function vowelSet(){return VOWELS[$('vowels')?.value]||VOWELS.standard}
  function cls(c,m){if(m.sibilants?.includes(c))return'S';if(m.obstruents?.includes(c))return'O';if(m.nasals?.includes(c))return'N';if(m.liquids?.includes(c))return'L';if(m.glides?.includes(c))return'G';return'O'}
  function cleanWord(raw,m,v,r){
    let w=raw;
    if(m===MODEL.isolated){w=w.replace(/([bcdfghjklmnpqrstvwxyz])(?=[bcdfghjklmnpqrstvwxyz])/gi,()=>pick(v,r));w=w.replace(/[^aeiouyøæ]+$/gi,'');w=w.replace(/([aeiouyøæ])\1{3,}/gi,'$1$1$1');}
    if(m===MODEL.japanese){w=w.replace(/([bcdfghjklmnpqrstvwxyz])([bcdfghjklmnpqrstvwxyz])/gi,(x,a,b)=>m.nasals.includes(a)||m.glides.includes(b)?x:pick(v,r)+b);w=w.replace(/([aeiouyøæ])([aeiouyøæ])/gi,(x,a,b)=>['ai','ei','oi','au','ou'].includes((a+b).toLowerCase())?x:a+'j'+b);}
    if(m===MODEL.european){w=w.replace(/^([^aeiouyøæ]+)([aeiouyøæ])/i,(x,on,vv)=>{const cs=[...on];if(cs.length<2)return x;const ok=cs.length===2?((m.liquids.includes(cs[1])&&m.obstruents.includes(cs[0]))||(m.sibilants.includes(cs[0])&&m.obstruents.includes(cs[1]))):(m.sibilants.includes(cs[0])&&m.obstruents.includes(cs[1])&&m.liquids.includes(cs[2]));return ok?x:vv+on});w=w.replace(/([bcdfghjklmnpqrstvwxyz])([bcdfghjklmnpqrstvwxyz])/gi,(x,a,b)=>{if(m.liquids.includes(a)||m.nasals.includes(a)||m.sibilants.includes(a))return x;return a===b?x:a+a});w=w.replace(/([aeiouyøæ])([aeiouyøæ])([aeiouyøæ])/gi,(x,a,b,c)=>a+(r()<.5?'j':'')+c);}
    if(m===MODEL.english){w=w.replace(/([aeiouyøæ])([aeiouyøæ])/gi,(x,a,b)=>a+b);}
    if(m===MODEL.slavic){if(!/[aeiouyøæ]/i.test(w)&&!m.liquids.some(x=>w.includes(x)))w=w.slice(0,1)+pick(v,r)+w.slice(1);w=w.replace(/([aeiouyøæ])([aeiouyøæ])/gi,(x,a,b)=>r()<.5?a:'k'+b);}
    if(m===MODEL.semitic){w=w.replace(/^[^aeiouyøæ]+/i,x=>x.length>1?'i'+x:x);w=w.replace(/([^aeiouyøæ])([^aeiouyøæ])([^aeiouyøæ])/gi,(x,a,b,c)=>a+b+pick(v,r)+c);w=w.replace(/([aeiouyøæ])([aeiouyøæ])/gi,(x,a,b)=>r()<.5?a:a+'’'+b);}
    if(!/[aeiouyøæ]/i.test(w)&&!m.liquids?.some(x=>w.includes(x)))w+=pick(v,r);
    return w.toLowerCase();
  }
  function makeSyllable(m,v,r){const p=pick(m.make,r);let out='';for(const ch of p){if(ch==='C')out+=pick(m.c,r);else if(ch==='V')out+=pick(v,r);else if(ch==='G')out+=pick(m.glides,r);else if(ch==='N')out+=pick(m.nasals,r);else if(ch==='L')out+=pick(m.liquids||['r','l'],r)}return out}
  function makeWord(m,v,mean,r){for(let tries=0;tries<100;tries++){const n=Math.max(1,Math.min(6,Math.round(mean+(r()-.5)*1.4)));let w='';for(let i=0;i<n;i++)w+=makeSyllable(m,v,r);w=cleanWord(w,m,v,r);if(w.length>1&&/[aeiouyøæ]/i.test(w))return w}return cleanWord(makeSyllable(m,v,r),m,v,r)}
  function installModelOptions(){const e=$('consonants');if(!e)return;const current=e.value;const opts=[['isolated','1 — Minimalist Isolating (Hawaiian-type)'],['japanese','2 — Controlled Open Syllable (Japanese-type)'],['european','3 — Balanced European (Italian/Finnish-type)'],['english','4 — Dynamic Anglo-Saxon (English-type)'],['slavic','5 — Compact Slavic (Croatian/Polish-type)'],['semitic','6 — Semitic Root-and-Pattern (Arabic-type)']];e.innerHTML=opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');e.value=MODEL[current]?current:'european'}
  function phonologize(){
    if(phonologyBusy)return;
    const rows=[...document.querySelectorAll('#lexicon-output .lex-row')];
    if(!rows.length||rows.every(row=>row.children[0]?.dataset.phonologized==='1'))return;
    phonologyBusy=true;
    const model=modelFor(),v=vowelSet(),seed=$('seed')?.value.trim()||'auto',mean=Number($('mean')?.value)||2.2;
    const r=rng(seed+'|phonology|'+Object.keys(MODEL).find(k=>MODEL[k]===model));const map=new Map();const used=new Set();
    rows.forEach(row=>{const meaning=row.children[1]?.textContent.trim();if(!meaning)return;let w=map.get(norm(meaning));if(!w){do{w=makeWord(model,v,mean,r)}while(used.has(w));used.add(w);map.set(norm(meaning),w)}const cell=row.children[0];if(cell){cell.textContent=w;cell.dataset.phonologized='1'}});
    document.querySelectorAll('.sample-word').forEach(el=>{const meaning=norm(el.getAttribute('data-meaning')||el.textContent);const w=map.get(meaning);if(w)el.textContent=w});
    document.querySelectorAll('#dictionary-output .dict-row').forEach(row=>{const strong=row.querySelector('strong');const span=row.querySelector('span');if(!strong||!span)return;const meaning=norm(span.textContent);if(map.has(meaning))strong.textContent=map.get(meaning);});
    phonologyBusy=false;
  }
  function init(){styles();installModelOptions();tab();const o=$('generation-output');if(o)new MutationObserver(()=>requestAnimationFrame(move)).observe(o,{childList:true,subtree:true});const l=$('lexicon-output');if(l)new MutationObserver(()=>requestAnimationFrame(phonologize)).observe(l,{childList:true,subtree:true});move();const h=document.querySelector('header h1');if(h){let b=h.querySelector('.version-badge');if(!b){b=document.createElement('span');b.className='chip version-badge';b.style.marginLeft='8px';h.appendChild(b)}b.textContent='v'+VERSION}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();