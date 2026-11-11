// Pure helpers for keeping local dictionary edits apart from data/vocabulary.json.
// Local edits are stored as an overlay (added / modified / removed entries) on top of the file, so a new version of the
// file is never hidden by an old full copy and the overlay stays small.
import { SCHEMA_VERSION, cloneEntry } from './schema.js';

export const OVERLAY_VERSION = 1;

const same = (a, b) => JSON.stringify(cloneEntry(a)) === JSON.stringify(cloneEntry(b));

// Text of data/vocabulary.json: one entry per line (same format as tools/lexicon/build.mjs, small diffs).
export function serializeVocabulary(entries) {
    return `{\n "schema": ${SCHEMA_VERSION},\n "vocabulary": [\n${entries.map(e => '  ' + JSON.stringify(cloneEntry(e))).join(',\n')}\n ]\n}\n`;
}

// What differs between the file (base) and the working copy (current).
export function diffVocabulary(base, current) {
    const baseById = new Map(base.map(e => [e.id, e]));
    const currentIds = new Set(current.map(e => e.id));
    const overlay = { version: OVERLAY_VERSION, added: [], modified: [], removed: [] };
    for (const e of current) {
        const b = baseById.get(e.id);
        if (!b) overlay.added.push(cloneEntry(e));
        else if (!same(b, e)) overlay.modified.push(cloneEntry(e));
    }
    for (const e of base) if (!currentIds.has(e.id)) overlay.removed.push(e.id);
    return overlay;
}

export const overlaySize = o => o ? o.added.length + o.modified.length + o.removed.length : 0;

// Applies an overlay to a (possibly newer) base. Entries keep the base order; added entries go at the end.
export function applyOverlay(base, overlay) {
    if (!overlay || overlay.version !== OVERLAY_VERSION) return base.map(cloneEntry);
    const removed = new Set(overlay.removed);
    const modified = new Map(overlay.modified.map(e => [e.id, e]));
    const out = [];
    for (const e of base) {
        if (removed.has(e.id)) continue;
        out.push(cloneEntry(modified.get(e.id) ?? e));
    }
    const have = new Set(out.map(e => e.id));
    for (const e of overlay.added) if (!have.has(e.id)) out.push(cloneEntry(e));
    // relations may point at removed entries
    const ids = new Set(out.map(e => e.id));
    for (const e of out) for (const [type, list] of Object.entries(e.relations)) {
        const kept = list.filter(id => ids.has(id));
        if (kept.length !== list.length) { if (kept.length) e.relations[type] = kept; else delete e.relations[type]; }
    }
    return out;
}
