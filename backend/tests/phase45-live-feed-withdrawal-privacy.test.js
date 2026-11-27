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
  assert.match(src, /'referral_reward'/);
});
