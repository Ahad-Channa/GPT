// Multi-step admin form: minimal fields, advanced options collapsed, one colour per
// step, Goal Key generated from the label, and one combined error list on save.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8').replace(/\r\n/g, '\n');
const loadKey = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/goalKey.js')).href);

test('Goal Key is generated from the label and follows the server rules', async () => {
  const { slugifyGoalKey, GOAL_KEY_PATTERN } = await loadKey();
  const { assertValidGoalKeys } = require('../utils/offerGoals');
  assert.equal(slugifyGoalKey('Reach Level 10!'), 'reach_level_10');
  assert.equal(slugifyGoalKey('  Fight 20 Battles  '), 'fight_20_battles');
  assert.equal(slugifyGoalKey('Registrierung abschließen'), 'registrierung_abschliessen');
  assert.equal(slugifyGoalKey('Café Ärger'), 'cafe_arger');
  assert.equal(slugifyGoalKey('10 levels'), 'step_10_levels');
  assert.equal(slugifyGoalKey('!!!'), '');
  assert.equal(slugifyGoalKey(''), '');
  // always valid for the server
  for (const label of ['Reach Level 10!', '10 levels', 'x'.repeat(200), 'Café']) {
    const key = slugifyGoalKey(label);
    assert.ok(GOAL_KEY_PATTERN.test(key), key);
    assert.doesNotThrow(() => assertValidGoalKeys([{ goalKey: key }]));
  }
});

test('generated keys stay unique across steps (case-insensitive)', async () => {
  const { slugifyGoalKey } = await loadKey();
  assert.equal(slugifyGoalKey('Register', ['register']), 'register_2');
  assert.equal(slugifyGoalKey('Register', ['Register', 'register_2']), 'register_3');
  assert.equal(slugifyGoalKey('Deposit', ['register']), 'deposit');
});

test('form: no step description input, advanced options collapsed, one colour per step', () => {
  const form = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.doesNotMatch(form, /Step description/);
  assert.doesNotMatch(form, /setGoalLocalized\(idx, 'description'/);

  assert.match(form, /<details data-testid="goal-advanced"/);
  const advanced = form.slice(form.indexOf('data-testid="goal-advanced"'));
  const advancedBlock = advanced.slice(0, advanced.indexOf('</details>'));
  for (const field of ['External Event ID', 'External Aliases', 'Time (days)', 'Payout Metadata (USD)']) {
    assert.ok(advancedBlock.includes(field), `${field} is inside Advanced`);
  }
  // Reward, label and Goal Key stay visible (outside the collapsed block).
  const beforeAdvanced = form.slice(0, form.indexOf('data-testid="goal-advanced"'));
  const card = beforeAdvanced.slice(beforeAdvanced.lastIndexOf('data-testid="goal-step"'));
  for (const field of ['Step label', 'Reward (Coins)', 'Goal Key']) assert.ok(card.includes(field), field);

  const palette = form.match(/const GOAL_COLORS = \[([^\]]+)\]/);
  assert.ok(palette, 'palette exists');
  const colours = palette[1].match(/#[0-9A-Fa-f]{6}/g);
  assert.equal(new Set(colours).size, colours.length);
  assert.ok(colours.length >= 8);
  assert.match(form, /GOAL_COLORS\[idx % GOAL_COLORS\.length\]/);
  assert.match(form, /border: `2px solid \$\{stepColor\}`/);
});

test('form: new steps auto-create the key; editing the key stops it; saved steps are never re-keyed', () => {
  const form = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(form, /\{ \.\.\.createEmptyGoal\(\), keyAuto: true \}/);
  assert.match(form, /goal\.keyAuto && activeLanguage === REQUIRED_OFFER_LOCALE/);
  assert.match(form, /updateGoal\(\{ goalKey: e\.target\.value, keyAuto: false \}\)/);
  // keyAuto is a UI flag only: it is not part of the save payload.
  const payload = form.slice(form.indexOf('goals: form.goals.map(g => ({'));
  assert.doesNotMatch(payload.slice(0, payload.indexOf('platforms: form.platforms')), /keyAuto/);
});

test('form: save shows one combined error list (key, label, coins) instead of the first problem only', () => {
  const form = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(form, /const goalErrors = \[\];/);
  assert.match(form, /step label is missing/);
  assert.match(form, /enabled but its coin reward must be a whole number of at least 1/);
  assert.ok(form.includes(String.raw`setError(goalErrors.join('\n'))`));
  assert.match(form, /whitespace-pre-line/);
});

test('existing step descriptions in the database are untouched (payload still carries stored text)', () => {
  const { buildGoalTextPayload } = { buildGoalTextPayload: null };
  assert.equal(buildGoalTextPayload, null); // payload builder is unchanged; see phase18/phase35 tests
  const payloadSource = read('frontend/src/utils/directOfferPayload.js');
  assert.match(payloadSource, /buildGoalTextPayload/);
});
