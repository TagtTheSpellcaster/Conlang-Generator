// Sentences described by roles, not by grammatical functions. A frame says who does what to whom (agent, patient, theme,
// recipient…) together with tense, polarity and the like; the language decides which argument becomes the subject and which
// the object, and how the rest is marked. The mapping covers the active, passive, antipassive, causative and applicative voices;
// the realiser (clauseTokens) takes care of case, agreement and word order from the template this module returns, so a
// frame is realised by the same code as a hand-written template.
//
//   roles: agent, experiencer, theme, patient, attribute, recipient, oblique, adjunct
//   subject = agent ?? experiencer ?? theme
//   object  = patient ?? attribute ?? (theme, when there is an agent or experiencer)
//   recipient -> a "to" phrase; oblique (place, instrument…) and adjunct (time, manner) -> the adjunct slots
// Everything that is not a role (tense, mood, aspect on the predicate, q, seq, initial, requires, id, en, topic) is kept.
export const ROLES = Object.freeze(['agent', 'experiencer', 'theme', 'patient', 'attribute', 'recipient', 'oblique', 'adjunct', 'causer']);
export const SUBJECT_ROLES = Object.freeze(['agent', 'experiencer', 'theme']);
const TO = np => ({ adp: 'to:adposition', case: 'dative', np });
const BY = np => ({ adp: 'by:adposition', case: 'instrumental', np });
const isTo = a => a && a.adp === 'to:adposition' && a.case === 'dative' && a.np && Object.keys(a).length === 3;
const phrase = (x, wrap) => x ? (x.adp ? x : wrap(x)) : null;
// Voices: the frame states the roles of the event (who does what to whom) and the voice says how they are linked to the clause.
//   active       subject = agent ?? experiencer ?? theme; object = patient ?? attribute ?? (theme, with an agent or experiencer)
//   passive      subject = patient (or theme); the agent becomes a "by" phrase, or is dropped when the frame has none
//   antipassive  subject = agent; no object; the patient becomes a dative phrase, or is dropped
//   causative    roles.causer is the new subject; the old subject becomes the object, or a dative phrase if the verb has an object
//   applicative  roles.oblique becomes the object; the old object becomes a dative phrase
export const VOICE_NAMES = Object.freeze(['active', 'passive', 'antipassive', 'causative', 'applicative']);

export function toTemplate(frame) {
    const { roles = {}, pred, coord, comp, adv, conv, quote, voice = 'active', ...rest } = frame;
    if (!VOICE_NAMES.includes(voice)) throw new Error(`unknown voice "${voice}"`);
    for (const k of Object.keys(roles)) if (!ROLES.includes(k)) throw new Error(`unknown role "${k}"`);
    if (roles.causer && voice !== 'causative') throw new Error('the role "causer" needs the causative voice');
    const subjectRole = SUBJECT_ROLES.find(r => roles[r]);
    const withAgent = roles.agent || roles.experiencer;
    const objectRole = roles.patient ? 'patient' : roles.attribute ? 'attribute' : withAgent && roles.theme ? 'theme' : null;
    const out = { ...rest };
    let obliques = [];
    const recipient = phrase(roles.recipient, TO);
    if (voice === 'active') {
        if (subjectRole) out.S = roles[subjectRole];
        if (objectRole) out.O = roles[objectRole];
        obliques = [recipient, roles.oblique ?? null];
    } else if (voice === 'passive') {
        const target = roles.patient ?? (withAgent ? roles.theme : null) ?? roles.attribute;
        if (!target) throw new Error('a passive needs a patient or a theme');
        out.S = target;
        obliques = [recipient, roles.agent || roles.experiencer ? BY(roles.agent ?? roles.experiencer) : null, roles.oblique ?? null];
    } else if (voice === 'antipassive') {
        if (!withAgent || !roles.patient) throw new Error('an antipassive needs an agent and a patient');
        out.S = roles.agent ?? roles.experiencer;
        obliques = [phrase(roles.patient, TO), recipient, roles.oblique ?? null];
    } else if (voice === 'causative') {
        if (!roles.causer || !subjectRole) throw new Error('a causative needs a causer and the role of the causee');
        if (recipient) throw new Error('a causative of a ditransitive verb is not supported');
        out.S = roles.causer;
        if (objectRole) { out.O = roles[objectRole]; obliques = [TO(roles[subjectRole]), roles.oblique ?? null]; }
        else { out.O = roles[subjectRole]; obliques = [roles.oblique ?? null]; }
    } else {
        if (!roles.oblique || !subjectRole) throw new Error('an applicative needs an oblique argument and a subject');
        out.S = roles[subjectRole];
        out.O = roles.oblique.adp ? roles.oblique.np : roles.oblique;
        obliques = [objectRole ? TO(roles[objectRole]) : null, recipient];
    }
    if (pred) out.V = voice === 'active' ? pred : { ...pred, voice };
    obliques = obliques.filter(Boolean);
    if (obliques[0]) out.A = obliques[0];
    const second = obliques[1] ?? roles.adjunct;
    if (second) out.B = second;
    const nested = c => c && { ...c, ...(c.frame ? { clause: toTemplate(c.frame) } : {}), frame: undefined };
    if (quote) out.quote = { ...(quote.prefer ? { prefer: quote.prefer } : {}), indirect: toTemplate(quote.indirect), direct: toTemplate(quote.direct) };
    for (const [k, c] of [['coord', coord], ['comp', comp], ['adv', adv], ['conv', conv]]) if (c) { const n = nested(c); delete n.frame; out[k] = n; }
    return out;
}

// The reverse, for templates written by hand: used to check that the mapping is stable and to migrate old templates.
// `transitivityOf(headList)` tells the transitivity of the verb (copula, intransitive, transitive, ditransitive).
export function templateToFrame(t, transitivityOf = () => null) {
    const { S, V, O, A, B, coord, comp, adv, ...rest } = t;
    const tr = V ? transitivityOf(V.head) : null;
    const roles = {};
    if (S) roles[tr === 'transitive' || tr === 'ditransitive' || (!tr && O) ? 'agent' : 'theme'] = S;
    if (O) roles[tr === 'copula' ? 'attribute' : isTo(A) && S ? 'theme' : 'patient'] = O;
    if (A) { if (isTo(A) && O) roles.recipient = A.np; else roles.oblique = A; }
    if (B) roles.adjunct = B;
    const f = { ...rest, roles };
    if (V) f.pred = V;
    const sub = c => c && { ...c, ...(c.clause ? { frame: templateToFrame(c.clause, transitivityOf), clause: undefined } : {}) };
    for (const [k, c] of [['coord', coord], ['comp', comp], ['adv', adv]]) if (c) { const n = sub(c); delete n.clause; f[k] = n; }
    return f;
}
