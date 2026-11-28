// The public Live Feed must never expose a withdrawal's payout destination.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sanitizePublicWithdrawal, scrubTransaction } = require('../utils/earningFeed');

test('withdrawal keeps method and brand but drops destination, fee, balance and description', () => {
  const out = sanitizePublicWithdrawal({
    _id: 'x', transactionType: 'withdrawal', method: 'paypal', amount: -5000, fee: 50, balanceAfter: 12,
    payoutDestination: 'someone@example.com', description: 'Withdrawal via PayPal — someone@example.com',
    metadata: { feePercent: 1, brand: '' },
  });
  assert.equal(out.payoutDestination, undefined);
  assert.equal(out.fee, undefined);
  assert.equal(out.balanceAfter, undefined);
  assert.equal(out.method, 'paypal');
  assert.doesNotMatch(JSON.stringify(out), /someone@example\.com/);
  assert.deepEqual(out.metadata, {});
});

test('gift card keeps the brand; book order exposes only the book title', () => {
  assert.deepEqual(
    sanitizePublicWithdrawal({ transactionType: 'withdrawal', method: 'giftcard', payoutDestination: 'a@b.c', metadata: { brand: 'Amazon' } }).metadata,
    { brand: 'Amazon' },
  );
  const book = sanitizePublicWithdrawal({ transactionType: 'withdrawal', method: 'book', payoutDestination: 'My Book', description: 'Book Order: My Book' });
  assert.deepEqual(book.metadata, { bookTitle: 'My Book' });
  assert.equal(book.payoutDestination, undefined);
});

test('private users: scrub then sanitize still hides the destination', () => {
  const out = sanitizePublicWithdrawal(scrubTransaction({ transactionType: 'withdrawal', method: 'litecoin', payoutDestination: 'ltc1qaddress' }));
  assert.doesNotMatch(JSON.stringify(out), /ltc1qaddress/);
});

test('recent-earnings applies the sanitizer and includes affiliate earnings', () => {
  const src = fs.readFileSync(path.join(__dirname, '../routes/public.js'), 'utf8');
  assert.match(src, /processedTx = sanitizePublicWithdrawal\(processedTx\)/);
  assert.match(src, /transactionType: \{ \$in: FEED_EARNING_TYPES \}/);
});

// ── Live Feed in real time for bonuses and withdrawals (Harun, 2026-11-28) ──
const { buildNewEarningPayload, broadcastNewEarning, FEED_EARNING_TYPES } = require('../utils/earningFeed');
const user = { _id: 'u1', displayName: 'Ahad', avatarUrl: '', isPrivate: false };

test('bonus types and affiliate earnings are broadcast; negative or rejected rows are not', () => {
  for (const type of ['daily_bonus', 'vip_reward', 'leaderboard_reward', 'promo_code', 'referral_reward', 'admin_adjustment']) {
    assert.ok(FEED_EARNING_TYPES.includes(type), type);
    assert.ok(buildNewEarningPayload({ transaction: { transactionType: type, status: 'completed', amount: 10 }, user }), type);
  }
  assert.ok(buildNewEarningPayload({ transaction: { transactionType: 'referral_reward', status: 'hold', amount: 10 }, user }));
  assert.equal(buildNewEarningPayload({ transaction: { transactionType: 'admin_adjustment', status: 'completed', amount: -50 }, user }), null);
  assert.equal(buildNewEarningPayload({ transaction: { transactionType: 'admin_adjustment', status: 'rejected', amount: 50 }, user }), null);
  assert.equal(buildNewEarningPayload({ transaction: { transactionType: 'chargeback', status: 'completed', amount: 50 }, user }), null);
});

test('withdrawal broadcast never contains the payout destination (also for private users)', () => {
  const tx = { transactionType: 'withdrawal', status: 'pending', amount: -5000, method: 'paypal', payoutDestination: 'me@example.com', description: 'Withdrawal via PayPal — me@example.com', metadata: { feePercent: 1 } };
  const out = buildNewEarningPayload({ transaction: tx, user });
  assert.equal(out.method, 'paypal');
  assert.doesNotMatch(JSON.stringify(out), /me@example\.com/);
  const priv = buildNewEarningPayload({ transaction: tx, user: { ...user, isPrivate: true } });
  assert.doesNotMatch(JSON.stringify(priv), /me@example\.com/);
  assert.equal(buildNewEarningPayload({ transaction: { ...tx, status: 'rejected' }, user }), null);
  const sent = [];
  assert.equal(broadcastNewEarning({ transaction: tx, user, io: { emit: (e, p) => sent.push([e, p]) } }), true);
  assert.equal(sent[0][0], 'newEarning');
});

test('every claim / withdrawal route broadcasts to the Live Feed', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const wallet = read('routes/wallet.js');
  assert.match(wallet, /broadcastNewEarning\(\{ transaction: dailyBonusTx, user: updatedUser \}\)/);
  assert.match(wallet, /broadcastNewEarning\(\{ transaction: promoTx, user: updatedUser \}\)/);
  assert.match(wallet, /broadcastNewEarning\(\{ transaction, user: updatedUser \}\)/);
  assert.match(read('routes/vip.js'), /broadcastNewEarning\(\{ transaction: vipTx, user \}\)/);
  assert.match(read('routes/books.js'), /broadcastNewEarning\(\{ transaction: tx, user: updatedUser \}\)/);
  assert.match(read('routes/leaderboard.js'), /broadcastNewEarning\(\{ transaction: rewardTx, user \}\)/);
  assert.doesNotMatch(read('routes/leaderboard.js'), /io\.emit\('newEarning'/);
  const admin = read('routes/admin.js');
  assert.match(admin, /broadcastNewEarning\(\{ transaction: adjustmentTx, user \}\)/);
  assert.match(admin, /broadcastNewEarning\(\{ transaction: refTx, user: referrer \}\)/);
  assert.match(admin, /broadcastNewEarning\(\{ transaction: proofRefTx, user: referrer \}\)/);
  const ow = read('routes/offerwalls.js');
  assert.match(ow, /broadcastNewEarning\(\{ transaction: referralTx, user: referrer \}\)/);
  assert.match(ow, /broadcastNewEarning\(\{ transaction: signupBonusTx, user: updatedReferrer \|\| referrer \}\)/);
  assert.match(read('services/rewards/rewardService.js'), /transaction: effect\.referralTransaction, user: referrer/);
});
