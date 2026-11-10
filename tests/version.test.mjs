import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VERSION } from '../src/version.js';

const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('version: MAJOR.MINOR.PATCH, identical in code and package.json, newest in CHANGELOG', () => {
    assert.match(VERSION, /^\d+\.\d+\.\d+$/);
    assert.equal(JSON.parse(read('package.json')).version, VERSION);
    const first = read('CHANGELOG.md').match(/^## (\d+\.\d+\.\d+)/m);
    assert.equal(first[1], VERSION, 'the first CHANGELOG entry must be the current version');
});

test('CHANGELOG versions strictly decrease from top to bottom', () => {
    const versions = [...read('CHANGELOG.md').matchAll(/^## (\d+)\.(\d+)\.(\d+)/gm)].map(m => m.slice(1).map(Number));
    for (let i = 1; i < versions.length; i++) {
        const [a, b] = [versions[i - 1], versions[i]];
        assert.ok(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))), `${a.join('.')} before ${b.join('.')}`);
    }
});
