// A history of the language told from what the generator has actually produced: the sound changes with their dates, the
// contacts with other languages and the words they left, the split from the sister, the present state. No new facts are
// invented: every sentence is built from the history, the loans and the semantic structure of the language.
const ROLE_TEXT = {
    conqueror: (n, f) => `For a time the speakers lived under the power of the ${n}, the language of government and arms; ${f} came in with it.`,
    trade: (n, f) => `Merchants who spoke ${n} began to trade with the speakers, and with their goods came ${f}.`,
    sacred: (n, f) => `${n} became the language of ritual and learning, and ${f} entered the speech of the community.`,
    neighbour: (n, f) => `The people who spoke ${n} lived next door; everyday contact brought ${f}.`
};
const FIELD = { war: 'war', weapon: 'weapons', society: 'society', abstract: 'abstract notions', settlement: 'buildings and settlements', technology: 'techniques', craft: 'crafts', food: 'food', material: 'materials', object: 'tools and objects', clothing: 'clothing', transport: 'travel', maritime: 'the sea', household: 'the household', music: 'music', faith: 'religion', magic: 'magic', time: 'time', nature: 'nature', animal: 'animals', family: 'family', quality: 'qualities', action: 'verbs of everyday action', body: 'the body', space: 'space' };
const joinList = a => a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;

export function historyStory(lang) {
    const h = lang.history;
    if (!h) return null;
    const lo = h.loans, events = [], st = h.stats;
    const yearsAll = [...h.rules.map(r => r.years), ...(h.sister?.rules ?? []).map(r => r.years)];
    const split = Math.max(...yearsAll, 0) + 40;
    for (const r of h.rules) events.push({ years: r.years, kind: 'sound', text: `Sound change: ${r.label}${r.example ? ` (${r.example})` : ''}; ${r.words} words are affected.` });
    for (const d of lo?.donors ?? []) {
        const items = lo.items.filter(x => x.donor === d.id);
        const fields = Object.entries(items.reduce((m, x) => (m[x.domain] = (m[x.domain] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => FIELD[k] ?? k);
        const ex = [...items].sort((a, b) => a.lemma.localeCompare(b.lemma)).slice(0, 4).map(x => `“${x.lemma}” (${x.form}, from ${x.source}, which replaced ${x.replaced})`);
        const what = items.length ? `${items.length} loanwords, above all words of ${joinList(fields)}` : 'few words';
        events.push({ years: d.years, kind: 'contact', text: `${ROLE_TEXT[d.role](d.name, what)}${ex.length ? ` For instance ${joinList(ex)}.` : ''}` });
    }
    events.sort((a, b) => b.years - a.years);
    const inv = h.inventory ?? { gained: [], lost: [] };
    const sem = lang.semantics;
    const intro = `The language began as the speech of a community whose language is reconstructed here as the mother. About ${split} years ago that community divided: one part’s speech became this language, the other’s its sister (${h.sister?.rules?.length ?? 0} changes of its own). The two share ${h.sister?.stats?.same ?? 0} of ${h.sister?.stats?.words ?? 0} words unchanged.`;
    const parts = [];
    parts.push(`${st.unchanged} of ${st.words} inherited words are still identical to the mother’s, and ${st.words - st.unchanged} have changed.`);
    if (inv.gained.length || inv.lost.length) parts.push(`The sound system ${inv.gained.length ? `gained ${inv.gained.join(' ')}` : ''}${inv.gained.length && inv.lost.length ? ' and ' : ''}${inv.lost.length ? `lost ${inv.lost.join(' ')}` : ''}.`);
    if (lo) parts.push(`Borrowing replaced ${lo.items.length} native words (${Math.round(lo.share * 100)}% of the lexicon), from ${lo.donors.length === 1 ? 'one language' : `${lo.donors.length} languages`}.`);
    if (sem) parts.push(`In meaning, ${sem.pairs.length + sem.kinshipPairs.length} senses were folded into words that already existed${sem.colours ? `, the language has ${sem.colours.terms} basic colour terms` : ''}${sem.kinship ? ` and its kinship terms are ${sem.kinship.id === 'descriptive' ? 'descriptive' : 'classificatory'}` : ''}.`);
    return { intro, events, outro: parts.join(' '), split };
}
