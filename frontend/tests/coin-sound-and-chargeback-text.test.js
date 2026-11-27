import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { localizeNotification } from '../src/utils/notificationLocalizer.js';

test('coin sound plays for offerwall, Goodpicks/direct and custom offer rewards only', () => {
  const src = fs.readFileSync(new URL('../src/contexts/NotificationContext.jsx', import.meta.url), 'utf8');
  assert.match(src, /COIN_SOUND_TYPES = new Set\(\['offer_reward', 'direct_offer_reward', 'custom_offer_approved'\]\)/);
  assert.match(src, /if \(loadedOnceRef\.current\)/);
});

test('chargeback notification is translated with the offer name', () => {
  const notif = { title: 'Offer Chargeback', message: 'Your reward for "Radi Shadow Legends - Register" was charged back: -1.000 coins.' };
  const de = localizeNotification(notif, 'de');
  assert.equal(de.title, 'Rückbuchung');
  assert.equal(de.message, 'Deine Belohnung für „Radi Shadow Legends - Register“ wurde zurückgebucht: -1.000 Coins.');
  for (const lang of ['fr', 'es', 'ur']) {
    const out = localizeNotification(notif, lang);
    assert.match(out.message, /Radi Shadow Legends - Register/, lang);
    assert.doesNotMatch(out.message, /charged back/, lang);
  }
  assert.equal(localizeNotification(notif, 'en').message, notif.message);
});
