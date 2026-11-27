#!/usr/bin/env node
/*
 * Staging test tool: sends a Lootably-style webhook to THIS server's own backend,
 * exactly like Lootably would (JSON body, secret header, webhook id/timestamp/type),
 * so crediting and chargebacks can be tested without a real Lootably conversion.
 *
 * Run it ON THE SERVER from the backend folder (it reads backend/.env):
 *
 *   node scripts/simulate-lootably-webhook.js --yes --user <userId> --event approved --coins 500 --txn sim-001 --offer "Test Offer"
 *   node scripts/simulate-lootably-webhook.js --yes --user <userId> --event rejected --txn sim-001
 *
 * Multi-step: add  --goal <goalId> --goal-desc "Reach level 5"  (same --txn, one --goal per step).
 *
 * It posts to http://127.0.0.1:<PORT> and sets X-Forwarded-For to the first IP of
 * LOOTABLY_WEBHOOK_ALLOWED_IPS (Express trusts one proxy hop, so a local call is
 * treated like a call from Lootably). It only works from the server itself.
 * The credit/chargeback is REAL for that user in the database this backend uses:
 * use a test user on staging, never on the live site.
 */
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const userId = opt('user');
const event = opt('event', 'approved');
const txn = opt('txn');
const coins = Number(opt('coins', '0'));
const offerName = opt('offer', 'Simulated Lootably Offer');
const goalId = opt('goal');
const goalDescription = opt('goal-desc', goalId ? `Step ${goalId}` : '');

if (!flag('yes')) fail('add --yes to confirm (this credits/charges back a real user in this server\'s database).');
if (!/^[0-9a-fA-F]{24}$/.test(userId)) fail('--user must be the user\'s 24-character Mongo ID.');
if (!['approved', 'rejected', 'pending'].includes(event)) fail('--event must be approved, rejected or pending.');
if (!txn) fail('--txn is required (use the same value for the credit and its chargeback).');
if (event === 'approved' && (!Number.isSafeInteger(coins) || coins < 1)) fail('--coins must be a whole number >= 1 for approved.');

const secret = String(process.env.LOOTABLY_WEBHOOK_SECRET || '').trim();
const placementId = String(process.env.LOOTABLY_PLACEMENT_ID || '').trim();
const allowedIp = String(process.env.LOOTABLY_WEBHOOK_ALLOWED_IPS || '').split(',').map((ip) => ip.trim()).filter(Boolean)[0];
const port = process.env.PORT || 5000;

if (!secret || !placementId || !allowedIp) {
  fail('LOOTABLY_WEBHOOK_SECRET, LOOTABLY_PLACEMENT_ID and LOOTABLY_WEBHOOK_ALLOWED_IPS must be set in backend/.env.');
}
if (process.env.OFFERWALL_ADAPTER_LOOTABLY_ENABLED !== 'true') {
  console.warn('Warning: OFFERWALL_ADAPTER_LOOTABLY_ENABLED is not "true"; the server will refuse the webhook.');
}

const data = {
  placementID: placementId,
  userID: userId,
  transactionID: txn,
  offerName,
  offerType: goalId ? 'multistep' : 'singlestep',
  ...(goalId ? { goalID: goalId, goalDescription } : {}),
  ...(event === 'approved' ? { currencyReward: coins } : {}),
};

const run = async () => {
  const url = `http://127.0.0.1:${port}/api/offerwalls/webhook/lootably`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': allowedIp,
      'X-Lootably-Webhook-Secret': secret,
      'X-Lootably-Webhook-Id': `sim-${crypto.randomUUID()}`,
      'X-Lootably-Webhook-Timestamp': new Date().toISOString(),
      'X-Lootably-Webhook-Type': event,
    },
    body: JSON.stringify({ event, data }),
  });
  const body = await response.text();
  console.log(`POST ${url}`);
  console.log(`event=${event} user=${userId} txn=${txn}${goalId ? ` goal=${goalId}` : ''}${event === 'approved' ? ` coins=${coins}` : ''}`);
  console.log(`Response: HTTP ${response.status} body "${body}"  ("1" = accepted)`);
  console.log('Check: Admin -> Postback Logs, the user\'s wallet/notifications, VIP and Daily Bonus progress.');
};

run().catch((error) => fail(error.message));
