// Browser side of the dictionary storage, shared by the generator and the vocabulary manager.
// data/vocabulary.json is the base; local edits live in localStorage as an overlay (see src/lexicon/store.js).
// "Save to file" writes the working copy back to data/vocabulary.json (File System Access API, Chromium browsers;
// elsewhere the file is downloaded and has to replace data/vocabulary.json by hand).
import { assertVocabulary, validateVocabulary, cloneEntry } from '../lexicon/schema.js';
import { diffVocabulary, applyOverlay, overlaySize, serializeVocabulary } from '../lexicon/store.js';

const OVERLAY_KEY = 'conlang_vocabulary_overlay_v1';
const LEGACY_KEY = 'conlang_vocabulary_v2';   // full local copy written by versions before 1.9.0

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (e) { console.warn('localStorage unavailable', e); return false; } };
const remove = key => { try { localStorage.removeItem(key); } catch { /* ignore */ } };

export async function fetchBase() {
    const response = await fetch(`data/vocabulary.json?cacheBust=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`data/vocabulary.json: HTTP ${response.status}`);
    return assertVocabulary(await response.json(), 'data/vocabulary.json').map(cloneEntry);
}

// { vocabulary, base, edits, warning }: the dictionary the generator must use.
export async function loadVocabulary() {
    const base = await fetchBase();
    let warning = '';
    // migration: a full copy saved by an older version becomes an overlay
    const legacy = read(LEGACY_KEY);
    if (legacy && !read(OVERLAY_KEY)) {
        try {
            const old = assertVocabulary(JSON.parse(legacy), 'local copy').map(cloneEntry);
            const overlay = diffVocabulary(base, old);
            if (overlaySize(overlay)) write(OVERLAY_KEY, JSON.stringify(overlay));
        } catch (e) { console.warn('Ignoring incompatible local copy', e); }
    }
    remove(LEGACY_KEY);
    let overlay = null;
    const stored = read(OVERLAY_KEY);
    if (stored) { try { overlay = JSON.parse(stored); } catch { overlay = null; } }
    let vocabulary = base;
    if (overlay) {
        const merged = applyOverlay(base, overlay);
        const errors = validateVocabulary(merged);
        if (errors.length) { warning = `Local dictionary edits ignored: ${errors[0]}`; overlay = null; }
        else vocabulary = merged;
    }
    return { vocabulary, base, edits: overlaySize(overlay), warning };
}

// Stores the working copy as a difference from the file; nothing is stored when they are identical.
export function persistEdits(base, current) {
    const overlay = diffVocabulary(base, current);
    const n = overlaySize(overlay);
    if (n) write(OVERLAY_KEY, JSON.stringify(overlay)); else remove(OVERLAY_KEY);
    return n;
}

export const discardEdits = () => { remove(OVERLAY_KEY); remove(LEGACY_KEY); };

// --- writing data/vocabulary.json -------------------------------------------------------------------------------
const DB = 'conlang-generator', STORE = 'handles', HANDLE_KEY = 'vocabulary-file';
const idb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});
const idbGet = async key => { const db = await idb(); return new Promise(res => { const r = db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); }); };
const idbSet = async (key, value) => { const db = await idb(); return new Promise(res => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, key); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); };

export const canWriteFile = () => typeof window !== 'undefined' && 'showSaveFilePicker' in window;

// Returns 'file' when data/vocabulary.json was overwritten, 'download' when the browser cannot write files.
export async function saveToFile(entries) {
    const text = serializeVocabulary(entries);
    if (canWriteFile()) {
        let handle = null;
        try { handle = await idbGet(HANDLE_KEY); } catch { handle = null; }
        if (handle) {
            try { if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') handle = null; }
            catch { handle = null; }
        }
        if (!handle) {
            handle = await window.showSaveFilePicker({ suggestedName: 'vocabulary.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
            try { await idbSet(HANDLE_KEY, handle); } catch { /* the handle is only a convenience */ }
        }
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        return 'file';
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'vocabulary.json' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    return 'download';
}
