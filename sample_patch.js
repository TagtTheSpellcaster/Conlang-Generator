/* ConLang Generator UI + phonology patch — v0.9.2 */
(() => {
'use strict';
const VERSION='0.9.2';
let phonologyBusy=false;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').toLowerCase().replace(/^to\s+/,'').trim();
function styles(){if($('ui-patch-v092'))return;const s=document.createElement('style');s.id='ui-patch-v092';s.textContent='.base-parameters{margin-top:16px}.base-parameters-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.base-parameters .param-group{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:11px}.base-parameters .param-title{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--accent);margin-bottom:7px}.base-parameters .param-value{color:var(--text);line-height:1.5}';document.head.appendChild(s)}
function tab(){let t=document.querySelector('.tab[data-tab="samples"]'),p=$('samples');if(t&&p)return p;const tabs=document.querySelector('.tabs'),d=tabs?.querySelector('.tab[data-tab="dictionary"]');t=document.createElement('button');t.type='button';t.className='tab';t.dataset.tab='samples';t.setAttribute('aria-selected','false');t.textContent='Sample Sentences';if(d)d.insertAdjacentElement('afterend',t);else tabs?.appendChild(t);p=document.createElement('section');p.id='samples';p.className='tab-panel';p.innerHTML='<main><div id="samples-output" class="result empty">Generate a language to populate the sample sentences.</div></main>';document.querySelector('#generator')?.insertAdjacentElement('afterend',p);t.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));t.classList.add('active');t.setAttribute('aria-selected','true');p.classList.add('active')});return p}
function val(id){const e=$(id);if(!e)return'';return e.tagName==='SELECT'?[...e.selectedOptions].map(x=>x.value).filter(Boolean).join(', '):e.value||''}
function params(){const b=$('generation-output');if(!b)return;let c=b.querySelector('.base-parameters');if(!c){c=document.createElement('div');c.className='card base-parameters';b.appendChild(c)}const g=[['Semantic profile',[['Region',val('region')||'Any'],['Culture',val('culture')||'Any'],['Biome',val('biome')||'Any'],['Temporal setting',val('temporal_setting')||'Any'],['Tags',val('tags')||'Any']]],['Phonology',[['Model',$('consonants')?.selectedOptions?.[0]?.textContent||''],['Vowels',$('vowels')?.selectedOptions?.[0]?.textContent||''],['Mean syllables',$('mean')?.value||'']]],['Morphosyntax',[['Word order',val('word-order')],['Morphology',$('morphology')?.selectedOptions?.[0]?.textContent||''],['Adjective position',$('adj-position')?.selectedOptions?.[0]?.textContent||''],['Articles',$('articles')?.selectedOptions?.[0]?.textContent||''],['Plural',$('plural')?.selectedOptions?.[0]?.textContent||''],['Grammatical relations',$('relations')?.selectedOptions?.[0]?.textContent||'']]]];c.innerHTML='<h3>Language parameters</h3><div class="base-parameters-grid">'+g.map(([t,a])=>'<div class="param-group"><div class="param-title">'+esc(t)+'</div>'+a.map(([k,v])=>'<div style="margin:4px 0"><span style="color:var(--muted)">'+esc(k)+':</span> <span class="param-value">'+esc(v)+'</span></div>').join('')+'</div>').join('')+'</div>'}
function move(){const p=tab(),o=$('generation-output'),t=$('samples-output');if(!o||!t)return;const f=o.querySelector('.sample-frame');if(f){t.innerHTML='';t.appendChild(f)}params();setTimeout(phonologize,0)}
const VOWELS={standard:['a','e','i','o','u'],minimal:['a','i','u'],extended:['a','e','i','o','u','y','ø','æ']};
const CINFO={
 p:{type:'O',place:'Labiale'},b:{type:'O',place:'Labiale'},f:{type:'O',place:'Labiale'},v:{type:'O',place:'Labiale'},m:{type:'N',place:'Labiale'},
 t:{type:'O',place:'Alveolare'},d:{type:'O',place:'Alveolare'},s:{type:'S',place:'Alveolare'},z:{type:'S',place:'Alveolare'},n:{type:'N',place:'Alveolare'},l:{type:'L',place:'Alveolare'},r:{type:'L',place:'Alveolare'},
 'ʃ':{type:'S',place:'Palatale'},'ɲ':{type:'N',place:'Palatale'},j:{type:'G',place:'Palatale'},
 k:{type:'O',place:'Velare'},w:{type:'G',place:'Velare'},ŋ:{type:'N',place:'Velare'},
 θ:{type:'O',place:'Dentale'},ħ:{type:'O',place:'Faringale'},ʕ:{type:'O',place:'Faringale'}
};
const FRIC=new Set(['f','v','s','z','ʃ']);
const MODEL={
 isolated:{name:'Minimalist Isolating',vowels:VOWELS.standard,c:['p','t','k','m','n','l','h'],glides:[],nasals:['m','n'],make:['CV','V']},
 japanese:{name:'Controlled Open Syllable',vowels:VOWELS.standard,c:['p','t','k','b','d','g','m','n','s','z','h','r','f','ŋ'],obstruents:['p','t','k','b','d','g','f'],glides:['j','w'],nasals:['n','m','ŋ'],make:['CV','GV','CVN','CGV','CGVN','V']},
 european:{name:'Balanced European',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','v','s','z','m','n','r','l','j','w'],obstruents:['p','t','k','b','d','g','f','v'],sibilants:['s','z'],liquids:['r','l'],nasals:['m','n'],glides:['j','w'],make:['CV','CCV','CVC','CCVC','V']},
 english:{name:'Dynamic Anglo-Saxon',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','θ','s','z','m','n','ŋ','r','l','j','w'],sibilants:['s','z'],obstruents:['p','t','k','b','d','g','f','θ'],nasals:['m','n','ŋ'],liquids:['r','l'],glides:['j','w'],make:['CV','CVC','CCV','CCVC','CCCV','CVCC','CVCCC','CCVCC']},
 slavic:{name:'Compact Slavic',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','v','s','z','ʃ','m','n','r','l','j'],liquids:['r','l'],make:['CV','CVC','CCV','CCCV','CVCC','CCCVCC','V']},
 semitic:{name:'Root-and-Pattern Semitic',vowels:VOWELS.standard,c:['p','t','k','b','d','g','f','s','z','ʃ','ħ','ʕ','m','n','r','l'],make:['CV','CVC']}
};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let x=hash(seed)||1;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const pick=(a,r)=>a[Math.floor(r()*a.length)];
const isV=c=>VOWELS.standard.includes(c)||'yøæ'.includes(c);
const isC=c=>!!CINFO[c];
function consonantRuns(w){const out=[];let i=0;while(i<w.length){if(isC(w[i])){let j=i+1;while(j<w.length&&isC(w[j]))j++;out.push({start:i,end:j,text:w.slice(i,j)});i=j}else i++}return out}
function globalPhonotactics(w){
 const runs=consonantRuns(w);
 // Macro 1: identical geminates are internal only.
 if(runs.length&&runs[0].start===0&&runs[0].text.length>=2&&runs[0].text[0]===runs[0].text[1])return false;
 // Macro 2: fricative/sibilant clusters. s/z are universal first-position wildcards.
 for(const run of runs){for(let i=0;i<run.text.length-1;i++){const a=run.text[i],b=run.text[i+1];if(FRIC.has(a)&&FRIC.has(b)){if(a!==b&&a!=='s'&&a!=='z')return false;if(a===b&&run.start===0&&i===0)return false}}}
 // Macro 3: anatomical homophony. Pairs sharing a place must be identical; triplets may contain a shared-place pair only when that pair is an adjacent identical geminate.
 for(const run of runs){const q=run.text;for(let i=0;i<q.length-1;i++){const a=CINFO[q[i]],b=CINFO[q[i+1]];if(a.place===b.place&&q[i]!==q[i+1])return false}
  for(let i=0;i<q.length-2;i++){for(let j=i+1;j<i+3;j++){if(CINFO[q[i]].place===CINFO[q[j]].place){const adjacentGem=(j===i+1&&q[i]===q[j])||(j===i-1&&q[i]===q[j]);if(!adjacentGem)return false}}}
 }
 return true
}
function countRuns(w,re){let max=0;for(const m of w.matchAll(re))max=Math.max(max,m[0].length);return max}
function modelValid(w,m){const runs=consonantRuns(w),V='aeiouyøæ';
 if(!w||!/[aeiouyøæ]/i.test(w)&&!m.liquids?.some(x=>w.includes(x)))return false;
 if(m===MODEL.isolated){if(countRuns(w,/[^aeiouyøæ]/gi)>1||countRuns(w,/[aeiouyøæ]/gi)>3)return false;if(/([aeiouyøæ])\1{2,}/i.test(w))return false}
 if(m===MODEL.japanese){if(countRuns(w,/[^aeiouyøæ]/gi)>3||countRuns(w,/[aeiouyøæ]/gi)>2)return false;for(const x of runs){const q=x.text;if(q.length===2&&!m.nasals.includes(q[0]))return false;if(q.length===3&&!(m.nasals.includes(q[0])&&m.obstruents.includes(q[1])&&m.glides.includes(q[2])))return false;if(q.length>3)return false}}
 if(m===MODEL.european){if(countRuns(w,/[^aeiouyøæ]/gi)>3||countRuns(w,/[aeiouyøæ]/gi)>2)return false;for(const x of runs){const q=x.text;if(q.length===2&&!(['r','l','m','n','s'].includes(q[0])||q[0]===q[1]))return false;if(q.length===3&&!(['r','l','m','n','s'].includes(q[0])&&['r','l','j','w'].includes(q[2])))return false;if(q.length>3)return false}}
 if(m===MODEL.english){if(countRuns(w,/[^aeiouyøæ]/gi)>4||countRuns(w,/[aeiouyøæ]/gi)>1)return false;if(runs.some(x=>x.text.length>4))return false}
 if(m===MODEL.slavic){if(countRuns(w,/[^aeiouyøæ]/gi)>4||countRuns(w,/[aeiouyøæ]/gi)>1)return false;if(runs.some(x=>x.text.length>4))return false;for(const x of runs){const q=x.text;let bil=q.split('').filter(c=>CINFO[c]?.place==='Labiale').length;if(bil>2)return false}}
 if(m===MODEL.semitic){if(!/^[^aeiouyøæ][aeiouyøæ]/i.test(w))return false;if(/[aeiouyøæ][^aeiouyøæ]$/i.test(w)&&!/[aeiouyøæ]$/.test(w))return false;if(runs.some(x=>x.start===0&&x.text.length>1))return false;if(runs.some(x=>x.text.length>2))return false;if(/[aeiouyøæ]{2}/i.test(w))return false}
 return true
}
function validWord(w,m){return globalPhonotactics(w)&&modelValid(w,m)}
function makeSyllable(m,v,r){const p=pick(m.make,r);let out='';for(const ch of p){if(ch==='C')out+=pick(m.c,r);else if(ch==='V')out+=pick(v,r);else if(ch==='G')out+=pick(m.glides||['j','w'],r);else if(ch==='N')out+=pick(m.nasals||['n','m'],r);else if(ch==='L')out+=pick(m.liquids||['r','l'],r)}return out}
function makeWord(m,v,mean,r){for(let tries=0;tries<5000;tries++){const n=Math.max(1,Math.min(6,Math.round(mean+(r()-.5)*1.4)));let w='';for(let i=0;i<n;i++)w+=makeSyllable(m,v,r);w=w.toLowerCase();if(validWord(w,m))return w}
 for(let tries=0;tries<1000;tries++){let w=makeSyllable(m,v,r).toLowerCase();if(validWord(w,m))return w}
 return null
}
function installModelOptions(){const e=$('consonants');if(!e)return;const current=e.value;const opts=[['isolated','1 — Minimalist Isolating (Hawaiian-type)'],['japanese','2 — Controlled Open Syllable (Japanese-type)'],['european','3 — Balanced European (Italian/Finnish-type)'],['english','4 — Dynamic Anglo-Saxon (English-type)'],['slavic','5 — Compact Slavic (Croatian/Polish-type)'],['semitic','6 — Semitic Root-and-Pattern (Arabic-type)']];e.innerHTML=opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');e.value=MODEL[current]?current:'european'}
function phonologize(){if(phonologyBusy)return;const rows=[...document.querySelectorAll('#lexicon-output .lex-row')];if(!rows.length||rows.every(row=>row.children[0]?.dataset.phonologized==='1'))return;phonologyBusy=true;const model=modelFor(),v=vowelSet(),seed=$('seed')?.value.trim()||'auto',mean=Number($('mean')?.value)||2.2,r=rng(seed+'|phonology|'+Object.keys(MODEL).find(k=>MODEL[k]===model));const map=new Map(),used=new Set();rows.forEach(row=>{const meaning=row.children[1]?.textContent.trim();if(!meaning)return;let w=map.get(norm(meaning));if(!w){for(let guard=0;guard<100;guard++){w=makeWord(model,v,mean,r);if(w&&!used.has(w))break;w=null}if(!w)w='naka';used.add(w);map.set(norm(meaning),w)}const cell=row.children[0];if(cell){cell.textContent=w;cell.dataset.phonologized='1'}});document.querySelectorAll('.sample-word').forEach(el=>{const meaning=norm(el.getAttribute('data-meaning')||el.textContent);const w=map.get(meaning);if(w)el.textContent=w});document.querySelectorAll('#dictionary-output .dict-row').forEach(row=>{const strong=row.querySelector('strong');const span=row.querySelector('span');if(!strong||!span)return;const meaning=norm(span.textContent);if(map.has(meaning))strong.textContent=map.get(meaning)});phonologyBusy=false}
function init(){styles();installModelOptions();tab();const o=$('generation-output');if(o)new MutationObserver(()=>requestAnimationFrame(move)).observe(o,{childList:true,subtree:true});const l=$('lexicon-output');if(l)new MutationObserver(()=>requestAnimationFrame(phonologize)).observe(l,{childList:true,subtree:true});move();const h=document.querySelector('header h1');if(h){let b=h.querySelector('.version-badge');if(!b){b=document.createElement('span');b.className='chip version-badge';b.style.marginLeft='8px';h.appendChild(b)}b.textContent='v'+VERSION}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();