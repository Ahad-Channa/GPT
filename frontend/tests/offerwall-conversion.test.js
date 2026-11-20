import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConversionControl, describeMultiplierExample } from '../src/utils/offerwallConversion.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminSource = fs.readFileSync(path.join(root, 'src', 'pages', 'admin', 'AdminOfferwalls.jsx'), 'utf8');

test('Lootably: credited directly as coins, no ratio control and no formula', () => {
  const control = getConversionControl('lootably');
  assert.equal(control.mode, 'direct_coins');
  assert.equal(control.showRatioInput, false);
  assert.equal(control.showFormula, false);
  assert.match(control.note, /currencyReward/);
  assert.match(control.note, /directly as TaskMint coins/);
  assert.match(control.note, /not used/);
});

test('Goodpicks: ratio control removed; rewards are configured in coins per offer', () => {
  const control = getConversionControl('goodpicks');
  assert.equal(control.mode, 'not_used');
  assert.equal(control.showRatioInput, false);
  assert.equal(control.showFormula, false);
  assert.match(control.note, /each offer|per offer|on each offer/i);
  assert.match(control.note, /coins/);
});

test('other providers: labelled provider-specific multiplier, with unverified status and no assumed unit', () => {
  for (const id of ['primeearn', 'ayet', 'cpx', 'adgem', 'torox', 'adtowall', 'revu', 'adscend']) {
    const control = getConversionControl(id);
    assert.equal(control.mode, 'multiplier', id);
    assert.equal(control.showRatioInput, true, id);
    assert.match(control.title, /multiplier/i, id);
    assert.match(control.integrationStatus, /disabled|cannot credit/, id);
    assert.doesNotMatch(control.note, /\$1|dollar per|cents? equal/i, id);
    assert.match(control.note, /not assumed/, id);
  }
  assert.match(getConversionControl('unknown-provider').integrationStatus, /unverified/);
});

test('example text rounds down and ignores invalid ratios', () => {
  assert.match(describeMultiplierExample(100), /1 of its own units.*100 coins/);
  assert.match(describeMultiplierExample(2.9), /2 coins/);
  assert.equal(describeMultiplierExample(0), '');
  assert.equal(describeMultiplierExample('abc'), '');
});

test('AdminOfferwalls has no misleading labels and only sends a ratio for multiplier providers', () => {
  assert.doesNotMatch(adminSource, /Network Unit/);
  assert.doesNotMatch(adminSource, /User Split Ratio/);
  assert.match(adminSource, /\.\.\.\(usesRatio \? \{ conversionRatio: Number\(ratio\) \} : \{\}\)/);
  assert.match(adminSource, /conversionControl\.showFormula/);
  assert.match(adminSource, /!usesRatio \?/);
});
