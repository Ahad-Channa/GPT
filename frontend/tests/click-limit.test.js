import test from 'node:test';
import assert from 'node:assert/strict';
import { isOfferClickLimitReached } from '../src/utils/offerClickLimit.js';

test('cap reached disables Start only for users who have not started the offer', () => {
  const capped = { maxTotalClicks: 1, totalClicks: 1 };
  assert.equal(isOfferClickLimitReached(capped), true);
  assert.equal(isOfferClickLimitReached({ ...capped, lifecycle: 'available' }), true);
  // a user who already holds the click can still resume it (the server allows it)
  for (const lifecycle of ['started', 'pending', 'rejected', 'reversed', 'completed']) {
    assert.equal(isOfferClickLimitReached({ ...capped, lifecycle }), false, lifecycle);
  }
});

test('unlimited or below-cap offers are never limit-reached', () => {
  assert.equal(isOfferClickLimitReached({ maxTotalClicks: null, totalClicks: 50 }), false);
  assert.equal(isOfferClickLimitReached({ maxTotalClicks: 5, totalClicks: 4 }), false);
  assert.equal(isOfferClickLimitReached(undefined), false);
});
