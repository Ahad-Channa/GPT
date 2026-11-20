import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfiguredPostbackExample,
  getEnabledPostbackGoals,
  maskPostbackSecret,
} from '../src/utils/postbackGuide.js';

const template = 'https://taskmint.example/api/direct-offers/postback?click_id={CLICK_ID}&txn_id={TRANSACTION_ID}&status=approved&payout={PAYOUT}&event_type={EVENT_TYPE}&secret=real-secret';

test('masks the offer secret without changing the rest of the template', () => {
  assert.equal(
    maskPostbackSecret(template),
    template.replace('real-secret', '{OFFER_SECRET}')
  );
});

test('builds one configured example per multi-step goal', () => {
  const result = buildConfiguredPostbackExample(template, {
    goalKey: 'fight_20_battles',
    externalEventId: 'Game Event 269',
    payoutAmount: 10,
  }, 0);

  assert.match(result, /click_id=FRESH_CLICK_ID/);
  assert.match(result, /txn_id=unique-fight_20_battles-1/);
  assert.match(result, /payout=10/);
  assert.match(result, /event_type=Game%20Event%20269/);
  assert.match(result, /secret=\{OFFER_SECRET\}/);
  assert.doesNotMatch(result, /real-secret/);
});

test('returns enabled configured goals only', () => {
  assert.deepEqual(getEnabledPostbackGoals({ goals: [
    { goalKey: 'register', enabled: true },
    { goalKey: 'disabled', enabled: false },
    { enabled: true },
  ]}).map((goal) => goal.goalKey), ['register']);
});
