import test from 'node:test';
import assert from 'node:assert/strict';
import { formatGoalLabel, getEnabledGoalRewardTotal, humanizeGoalKey } from '../src/utils/offerGoalDisplay.js';

test('humanizes raw goal keys with repeated underscores, separators, and camel case', () => {
  assert.equal(humanizeGoalKey('fight__20_battles'), 'Fight 20 Battles');
  assert.equal(humanizeGoalKey('play-5-minutes'), 'Play 5 Minutes');
  assert.equal(humanizeGoalKey('completeRegistration'), 'Complete Registration');
});

test('uses a meaningful configured label and humanizes labels that duplicate the raw key', () => {
  assert.equal(formatGoalLabel({ goalKey: 'fight__20_battles', label: 'fight__20_battles' }), 'Fight 20 Battles');
  assert.equal(formatGoalLabel({ goalKey: 'register', label: 'Create an account' }), 'Create an account');
  assert.equal(formatGoalLabel({ goalKey: 'deposit', label: 'Deposit', labelDe: 'Einzahlen' }, 'de'), 'Einzahlen');
});

test('calculates the total from enabled step rewards only', () => {
  assert.equal(getEnabledGoalRewardTotal([
    { rewardAmount: '500', enabled: true },
    { rewardAmount: 250, enabled: true },
    { rewardAmount: 900, enabled: false },
    { rewardAmount: 'invalid', enabled: true },
  ]), 750);
});

test('goal labels show no underscores and use the € symbol instead of the word euro', async () => {
  const { cleanGoalLabelText, formatGoalLabel } = await import('../src/utils/offerGoalDisplay.js');
  assert.equal(cleanGoalLabelText('fight_italiano'), 'fight italiano');
  assert.equal(cleanGoalLabelText('Deposit 50 euro'), 'Deposit 50 €');
  assert.equal(cleanGoalLabelText('Einzahlung 10,50 EUR'), 'Einzahlung 10,50 €');
  assert.equal(cleanGoalLabelText('Deposit 20 euros'), 'Deposit 20 €');
  assert.equal(cleanGoalLabelText('Deposit €20'), 'Deposit €20');
  assert.equal(formatGoalLabel({ goalKey: 'g1', label: 'fight_italiano' }, 'en'), 'fight italiano');
});
