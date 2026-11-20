import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/pages/admin/AdminOfferwalls.jsx'), 'utf8');
const conversionSource = fs.readFileSync(path.join(root, 'src/utils/offerwallConversion.js'), 'utf8');

test('Offerwalls admin intro describes provider settings, not a single conversion ratio', () => {
  assert.match(source, /<p className="admin-page-sub">\s*Manage provider settings and coin conversion behavior\.\s*<\/p>/);
});

test('the old generic "adjust the conversion ratio (User Split) for each network" sentence is gone', () => {
  assert.doesNotMatch(source, /adjust the conversion ratio \(User Split\)/i);
  assert.doesNotMatch(source, /for each network\./i);
});

test('Lootably note no longer points at a ratio field that is not rendered for it', () => {
  assert.doesNotMatch(source, /The User Split Ratio below is not used for Lootably/);
  assert.doesNotMatch(conversionSource, /The User Split Ratio below is not used for Lootably/);
  assert.match(conversionSource, /No conversion ratio is applied to Lootably\./);
});
