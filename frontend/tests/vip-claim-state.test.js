import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('a VIP level with a reward is never shown as claimed without a claim', () => {
  const page = fs.readFileSync(new URL('../src/pages/VipPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /const isClaimed = lvl\.claimed \|\| \(isReached && lvl\.rewardAmount === 0\);/);
  assert.doesNotMatch(page, /lvl\.key === 'bronze_1'/);
});
