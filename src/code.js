// Language code: one line of text that carries the seed, every option and the version of the program, so that a language
// can be saved in a text file and recreated later. Format:  TUT1.<version>.<branch>.<payload>.<check>
//   branch  D = the first daughter, S = its sister (generated from the same mother)
//   payload base64url of a compact JSON object {key: value} (empty options are left out)
//   check   six hex digits over the other parts: a mistyped or truncated code is detected, not silently turned into another language
// Pure functions, no DOM.
import { VERSION } from './version.js';

export const CODE_KEYS = ['seed', 'culture', 'biome', 'era', 'vowels', 'consonants', 'mean', 'order', 'morphology', 'articles', 'plural', 'number', 'gender', 'relations', 'caseSystem', 'adjPosition', 'genre', 'numerals', 'numeralVariant', 'classifiers', 'numeralPosition', 'onsetClusters', 'codaClusters', 'maxCluster', 'script', 'tags'];
const LIST_KEYS = new Set(['culture', 'biome', 'era', 'onsetClusters', 'codaClusters', 'script', 'tags']);
const PREFIX = 'TUT1';

const b64 = text => { const bytes = new TextEncoder().encode(text); let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = text => { const t = text.replace(/-/g, '+').replace(/_/g, '/'); const s = atob(t + '='.repeat((4 - t.length % 4) % 4)); return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(s, c => c.charCodeAt(0))); };
function check(text) {
    let h = 0x811c9dc5;
    for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0').slice(0, 6);
}

// Keeps only what the generator reads, drops empty values.
export function normalizeInput(input = {}) {
    const out = {};
    for (const key of CODE_KEYS) {
        let v = input[key];
        if (v === undefined || v === null) continue;
        if (LIST_KEYS.has(key)) { v = (Array.isArray(v) ? v : [v]).map(String).filter(Boolean); if (!v.length) continue; }
        else { v = String(v).trim(); if (v === '') continue; }
        out[key] = v;
    }
    return out;
}

export function encodeLanguageCode(input, branch = 'daughter', version = VERSION) {
    const body = `${PREFIX}.${version}.${branch === 'sister' ? 'S' : 'D'}.${b64(JSON.stringify(normalizeInput(input)))}`;
    return `${body}.${check(body)}`;
}

// -> { ok, error?, input, branch, version, versionMatch, warning? }
export function decodeLanguageCode(text, current = VERSION) {
    const fail = error => ({ ok: false, error });
    const raw = String(text ?? '').replace(/\s+/g, '');
    if (!raw) return fail('The code is empty.');
    const parts = raw.split('.');
    // the version itself contains dots: TUT1 . x . y . z . branch . payload . check
    if (parts.length !== 7 || parts[0] !== PREFIX) return fail('This is not a Tutlayin language code (it should start with TUT1).');
    const [, a, b, c, branchCode, payload, sum] = parts;
    const version = `${a}.${b}.${c}`;
    if (check(parts.slice(0, 6).join('.')) !== sum) return fail('The code is damaged (check digits do not match): part of it may be missing or mistyped.');
    if (!['D', 'S'].includes(branchCode)) return fail('Unknown language branch in the code.');
    let data;
    try { data = JSON.parse(unb64(payload)); } catch { return fail('The code cannot be read.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('The code cannot be read.');
    const input = normalizeInput(data);
    if (!input.seed) return fail('The code contains no seed.');
    const versionMatch = version === current;
    return {
        ok: true, input, branch: branchCode === 'S' ? 'sister' : 'daughter', version, versionMatch,
        ...(versionMatch ? {} : { warning: `This code was made with version ${version}; this program is version ${current}. The language may differ from the original.` })
    };
}
