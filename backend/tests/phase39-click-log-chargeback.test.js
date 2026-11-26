const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

test('click logs have a manual chargeback route that reuses the Conversions chargeback path', () => {
  const admin = read('backend/routes/admin.js');
  assert.match(admin, /router\.post\('\/click-logs\/:clickId\/chargeback', requirePermission\('manage_offerwalls'\)/);
  // one shared reversal path, used by both routes
  assert.equal((admin.match(/respondWithConversionChargeback\(\{/g) || []).length, 2);
  assert.match(admin, /const respondWithConversionChargeback = async[\s\S]*?processReversal\(/);
  // safety rules of the click route
  const route = admin.slice(admin.indexOf("router.post('/click-logs/:clickId/chargeback'"));
  assert.match(route.slice(0, 2500), /A reason is required/);
  assert.match(route.slice(0, 2500), /manual proof queue/);
  assert.match(route.slice(0, 2500), /multi-step offer/);
  assert.match(route.slice(0, 2500), /already charged back/);
});

test('click log list marks charged-back clicks and the admin UI offers Chargeback only for credited clicks', () => {
  const admin = read('backend/routes/admin.js');
  assert.match(admin, /chargedBack: Boolean\(click\.chargedBack\)/);
  const ui = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(ui, /openAction\(click\.clickId, 'chargeback'\)/);
  assert.match(ui, /click\.status === 'approved' && click\.chargedBack/);
  assert.match(ui, /Charged back/);
});
