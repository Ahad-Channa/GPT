import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBonusFeedDisplay, getLiveFeedDisplay } from '../src/utils/earningDisplay.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('leaderboard shows "Leaderboard" and the place', () => {
  assert.deepEqual(
    getBonusFeedDisplay({ transactionType: 'leaderboard_reward', description: 'Daily Leaderboard Reward — Rank #1' }),
    { sourceLine: 'Leaderboard', detailLine: 'Place 1' },
  );
  assert.equal(getBonusFeedDisplay({ transactionType: 'leaderboard_reward', metadata: { rank: 3 } }).detailLine, 'Place 3');
  // private users: description scrubbed -> no detail, no crash
  assert.deepEqual(
    getBonusFeedDisplay({ transactionType: 'leaderboard_reward', description: 'Earned a Leaderboard Prize' }),
    { sourceLine: 'Leaderboard', detailLine: '' },
  );
});

test('daily bonus shows the streak day', () => {
  assert.deepEqual(
    getBonusFeedDisplay({ transactionType: 'daily_bonus', description: 'Daily Bonus Claim (Streak: 1 Days)' }),
    { sourceLine: 'Daily Bonus', detailLine: 'Day 1' },
  );
  assert.equal(getBonusFeedDisplay({ transactionType: 'daily_bonus', description: 'Daily Bonus Claim (Streak: 12 Days)' }).detailLine, 'Day 12');
});

test('VIP shows the level', () => {
  assert.deepEqual(
    getBonusFeedDisplay({ transactionType: 'vip_reward', description: 'VIP Bonus — Bronze I' }),
    { sourceLine: 'VIP', detailLine: 'Bronze I' },
  );
  assert.equal(getBonusFeedDisplay({ transactionType: 'vip_reward', description: 'Earned a VIP Reward', metadata: { tier: 'Gold', rank: 'II' } }).detailLine, 'Gold II');
});

test('bonus code and affiliate earnings are one line', () => {
  assert.deepEqual(getBonusFeedDisplay({ transactionType: 'promo_code', description: 'Promo: ABC' }), { sourceLine: 'Bonus Code', detailLine: '' });
  assert.deepEqual(getBonusFeedDisplay({ transactionType: 'referral_reward', description: 'Referral Reward from Offer' }), { sourceLine: 'Affiliate Earnings', detailLine: '' });
});

test('offers are not treated as bonuses', () => {
  assert.equal(getBonusFeedDisplay({ transactionType: 'direct_offer_reward' }), null);
  assert.ok(getLiveFeedDisplay({ transactionType: 'direct_offer_reward', metadata: { offerTitle: 'X' } }));
});

test('live feed uses bonus chips without popup and supports mouse dragging', () => {
  const src = fs.readFileSync(path.join(here, '../src/components/LiveEarningsBar.jsx'), 'utf8');
  assert.match(src, /const bonusDisplay = getBonusFeedDisplay\(tx\);/);
  assert.match(src, /hasPopup = false;/);
  assert.match(src, /onPointerDown=\{handlePointerDown\}/);
  assert.match(src, /onClickCapture=\{handleClickCapture\}/);
  assert.doesNotMatch(src, /Task: Claimed Daily Bonus/);
});

test('backend feed includes affiliate earnings', () => {
  const feed = fs.readFileSync(path.join(here, '../../backend/utils/earningFeed.js'), 'utf8');
  assert.match(feed, /'vip_reward',\s*'referral_reward',/);
  const pub = fs.readFileSync(path.join(here, '../../backend/routes/public.js'), 'utf8');
  assert.match(pub, /transactionType: \{ \$in: FEED_EARNING_TYPES \}/);
});

test('withdrawals show only the payout name; books keep the title for the hover', async () => {
  const { getWithdrawalFeedDisplay } = await import('../src/utils/earningDisplay.js');
  assert.deepEqual(getWithdrawalFeedDisplay({ transactionType: 'withdrawal', method: 'litecoin' }), { label: 'Litecoin', bookTitle: '' });
  assert.deepEqual(getWithdrawalFeedDisplay({ transactionType: 'withdrawal', method: 'paypal' }), { label: 'PayPal', bookTitle: '' });
  assert.equal(getWithdrawalFeedDisplay({ transactionType: 'withdrawal', method: 'giftcard', metadata: { brand: 'Amazon' } }).label, 'Amazon');
  assert.equal(getWithdrawalFeedDisplay({ transactionType: 'withdrawal', method: 'giftcard' }).label, 'Gift Card');
  assert.deepEqual(
    getWithdrawalFeedDisplay({ transactionType: 'withdrawal', method: 'book', metadata: { bookTitle: 'My Book' } }),
    { label: 'Book', bookTitle: 'My Book' },
  );
  assert.equal(getWithdrawalFeedDisplay({ transactionType: 'daily_bonus' }), null);
  const src = fs.readFileSync(path.join(here, '../src/components/LiveEarningsBar.jsx'), 'utf8');
  assert.match(src, /hasPopup: Boolean\(withdrawal\.bookTitle\)/);
  assert.doesNotMatch(src, /Withdrawal Completed/);
});
