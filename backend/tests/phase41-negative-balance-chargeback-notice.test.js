const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildChargebackNotification, getChargebackOfferLabel } = require('../services/notifications/offerRewardMessage');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

test('chargeback notification names the offer for single-step offers', () => {
  const notice = buildChargebackNotification({ _id: 't1', amount: 1000, metadata: { offerTitle: 'ios android pc' } });
  assert.equal(notice.title, 'Offer Chargeback');
  assert.equal(notice.message, 'Your reward for "ios android pc" was charged back: -1.000 coins.');
  assert.equal(notice.metadata.amount, -1000);
});

test('chargeback notification names offer and step for multi-step offers', () => {
  const tx = { amount: -100, metadata: { offerTitle: 'Radi Shadow Legends', stepLabel: 'fight_10_battels' } };
  assert.equal(getChargebackOfferLabel(tx), 'Radi Shadow Legends - Fight 10 Battels');
  assert.match(buildChargebackNotification(tx).message, /"Radi Shadow Legends - Fight 10 Battels".*-100 coins/);
});

test('chargeback label falls back to campaign, custom-offer description and a generic text', () => {
  assert.equal(getChargebackOfferLabel({ metadata: { campaignTitle: 'Raid', stepLabel: 'Offer reward' } }), 'Raid');
  assert.equal(getChargebackOfferLabel({ description: 'Custom Offer Reward: Install App' }), 'Install App');
  assert.equal(getChargebackOfferLabel({ description: 'Offer Reward', metadata: { providerName: 'Lootably' } }), 'Lootably');
  assert.equal(getChargebackOfferLabel({}), 'an offer');
});

test('every chargeback path uses the offer-naming notification', () => {
  const admin = read('backend/routes/admin.js');
  const offerwalls = read('backend/routes/offerwalls.js');
  const reversal = read('backend/services/rewards/reversalService.js');
  assert.equal((admin.match(/buildChargebackNotification\(parentTx\)/g) || []).length, 2);
  assert.match(offerwalls, /buildChargebackNotification\(originalTx\)/);
  assert.match(reversal, /buildChargebackNotification\(/);
  for (const src of [admin, offerwalls, reversal]) {
    assert.doesNotMatch(src, /A previously approved offer was reversed|An offer was automatically reversed|A transaction was reversed and/);
  }
});

test('admin balance changes and hold releases never cut a negative balance to 0', () => {
  const admin = read('backend/routes/admin.js');
  assert.doesNotMatch(admin, /walletBalance = Math\.max\(0/);
  assert.match(admin, /user\.walletBalance = \(user\.walletBalance \|\| 0\) \+ amountNum;/);
  assert.equal((admin.match(/user\.walletBalance = \(user\.walletBalance \|\| 0\) \+ tx\.amount;/g) || []).length, 2);
});

test('admin conversions can be filtered by username or email', () => {
  const admin = read('backend/routes/admin.js');
  const route = admin.slice(admin.indexOf("router.get('/conversions'"));
  assert.match(route.slice(0, 2500), /\$or: \[\{ displayName: pattern \}, \{ email: pattern \}\]/);
  const ui = read('frontend/src/pages/admin/AdminConversions.jsx');
  assert.match(ui, /placeholder="User \(name, email or ID\)"/);
});
