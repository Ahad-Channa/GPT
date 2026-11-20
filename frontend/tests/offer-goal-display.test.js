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
