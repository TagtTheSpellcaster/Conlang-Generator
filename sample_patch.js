/* ConLang Generator sample resolver v0.7.10 */
(() => {
  'use strict';

  const VERSION = '0.7.10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').toLowerCase().trim().replace(/^to\s+/, '').replace(/[-\s]+/g, '_');
  const arr = v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);

  const grammar = {
    be:['be'], have:['have'], i:['i'], you:['you'], we:['we'], they:['they'], me:['me'], my:['my'],
    this:['this'], that:['that'], who:['who'], what:['what'], where:['where'], when:['when'], why:['why'],
    how:['how'], many:['many'], nothing:['nothing'], all:['all'], not:['not'], can:['can'], to:['to'],
    from:['from'], with:['with'], in:['in'], the:['the'], here:['here'], there:['there'], today:['today'],
    tomorrow:['tomorrow'], yesterday:['yesterday']
  };

  const semantic = {
    'consumption verb':['consumption'], 'perception verb':['perception'], 'violence/hunting verb':['violence','hunting'],
    'generic action verb':['activity','action'], 'positive emotion verb':['emotion_positive','positive_emotion'],
    'negative emotion verb':['emotion_negative','negative_emotion'], 'movement verb':['movement'],
    'natural movement verb':['natural_movement','movement'], 'gravity movement verb':['gravity'],
    'air/water movement verb':['air_water_movement','air','water'], 'ground movement verb':['ground_movement','ground'],
    'stop imperative verb':['stasis'], 'movement imperative verb':['movement'], 'future movement verb':['movement'],
    'action verb':['activity','action'], 'will verb':['volition'], 'limited action verb':['activity','action'],
    'cognition verb':['cognition'], 'help action verb':['help'], 'forbidden action verb':['prohibition'],
    'pain verb':['pain'], 'rest verb':['rest'], 'negative existence verb':['existence'],
    'present activity verb':['activity','action'], 'future activity verb':['activity','action'],
    'past event verb':['event','change','activity'], 'process verb':['process'],
    'name/role':['person','occupation','profession','role'], 'relationship/friendship':['relationship'],
    'near object':['inanimate_object'], 'distant object':['inanimate_object'],
    'near place adverb':['place','location'], 'distant place adverb':['place','location'],
    'fundamental resource':['fundamental_resource','resource','vital_resource'], 'natural element':['natural_element'],
    'physical adjective 1':['physical'], 'physical adjective 2':['physical'],
    'living being 1':['living_being','animal','person'], 'living being 2':['living_being','animal','person'],
    'food resource':['food','resource'], liquid:['liquid'], 'living being':['living_being','animal','person'],
    threat:['threat'], 'geographical place':['geographical_feature','geographical_place','place','settlement'],
    'cosmic element':['cosmic'], 'inanimate object':['inanimate_object'], animal:['animal'],
    'vertical direction':['direction','vertical'], 'natural zone':['natural_zone'], 'organ/body part':['body_part','organ'],
    'path/road':['path','road'], 'physical need/state':['need','bodily_function'],
    'large quantity':['large','quantity'], 'small quantity':['small','quantity'], readiness:['readiness'],
    'vital resource':['vital_resource'], 'plural entities':['entity'], entity:['entity']
  };

  function fieldValues(entry) {
    return ['semantic_group','category','tags','features'].flatMap(field =>
      arr(entry?.[field]).flatMap(v => String(v).split(/[;,]/)).map(norm).filter(Boolean)
    );
  }

  function find(lexicon, label) {
    const wanted = grammar[label] || [];
    const exact = lexicon.find(e => wanted.includes(norm(e.concept)));
    if (exact) return exact;
    const groups = semantic[label] || [];
    if (!groups.length) return null;
    return lexicon.find(e => {
      const kind = norm(e.kind || e.word_type);
      if (label.includes('verb') && kind && kind !== 'verb') return false;
      if (label.includes('adjective') && kind && kind !== 'adjective') return false;
      return groups.some(g => fieldValues(e).some(v => v === norm(g) || v.includes(norm(g)) || norm(g).includes(v)));
    }) || null;
  }

  function repair(item, lexicon, config) {
    if (!item?.placeholder) return item;
    const label = String(item.text || '').replace(/^<|>$/g, '').trim().toLowerCase();
    const entry = find(lexicon, label);
    if (!entry?.conlang) return item;
    let word = entry.conlang;
    if (label === 'be' || label === 'have' || label.endsWith('verb')) {
      if (config.morphology === 'suffixing') word += '-ta';
      else if (config.morphology === 'prefixing') word = `ka-${word}`;
    }
    return {word, english:entry.concept || label};
  }

  function repairValue(value, lexicon, config) {
    return Array.isArray(value) ? value.map(v => repairValue(v, lexicon, config)) : repair(value, lexicon, config);
  }

  function install() {
    if (!window.ConLangEngine || window.ConLangEngine.__samplePatchVersion === VERSION) return;
    const engine = window.ConLangEngine;
    const originalSamples = engine.samples;
    if (typeof originalSamples !== 'function') return;

    engine.samples = (config, lexicon) => originalSamples(config, lexicon).map(sentence => ({
      ...sentence,
      S:repairValue(sentence.S, lexicon, config),
      V:repairValue(sentence.V, lexicon, config),
      O:repairValue(sentence.O, lexicon, config),
      extra:repairValue(sentence.extra || [], lexicon, config)
    }));
    engine.__samplePatchVersion = VERSION;

    const heading = document.querySelector('h1');
    if (heading) {
      let badge = heading.querySelector('.version-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'version-badge';
        badge.style.cssText='display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#18243a;border:1px solid #2a3b59;color:#a9c4e8;font-size:11px;vertical-align:middle';
        heading.appendChild(badge);
      }
      badge.textContent=`v${VERSION}`;
    }
  }

  const timer = setInterval(() => {
    if (window.ConLangEngine) { install(); clearInterval(timer); }
  }, 50);
})();
