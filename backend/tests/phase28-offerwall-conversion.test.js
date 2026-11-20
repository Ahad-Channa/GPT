const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { convertProviderUnitsToCoins } = require('../utils/offerwallConversion');
const Settings = require('../models/Settings');

test('floating-point products that are mathematically whole numbers are not under-rounded', () => {
  // Confirmed regression: plain Math.floor gives 28 / 56 / 114 / 434.
  assert.equal(Math.floor(0.29 * 100), 28);
  assert.equal(convertProviderUnitsToCoins(0.29, 100), 29);
  assert.equal(convertProviderUnitsToCoins(0.57, 100), 57);
  assert.equal(convertProviderUnitsToCoins(1.15, 100), 115);
  assert.equal(convertProviderUnitsToCoins(4.35, 100), 435);
});

test('rounding policy is still floor for real fractional remainders', () => {
  assert.equal(convertProviderUnitsToCoins(0.019, 100), 1);
  assert.equal(convertProviderUnitsToCoins(1.999, 100), 199);
  assert.equal(convertProviderUnitsToCoins(0.2999, 100), 29);
  assert.equal(convertProviderUnitsToCoins(0.009, 100), 0);
  assert.equal(convertProviderUnitsToCoins(1, 100), 100);
  assert.equal(convertProviderUnitsToCoins(5, 0.5), 2);
  assert.equal(convertProviderUnitsToCoins(1234567890123, 1), 1234567890123);
});

test('invalid inputs produce NaN so the handler ignores the callback', () => {
  assert.ok(Number.isNaN(convertProviderUnitsToCoins(Infinity, 100)));
  assert.ok(Number.isNaN(convertProviderUnitsToCoins('abc', 100)));
});

test('legacy callback handler uses the shared conversion helper, and Lootably still bypasses it', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'offerwalls.js'), 'utf8');
  assert.match(src, /convertProviderUnitsToCoins\(parsedProviderUnits, provider\.conversionRatio\)/);
  assert.doesNotMatch(src, /Math\.floor\(parsedProviderUnits \* provider\.conversionRatio\)/);
  assert.match(src, /explicitPlatformCoins === undefined\s*\?\s*convertProviderUnitsToCoins/);
});

test('coinsPerUSD new-install default is 1000 and is not used by offerwall crediting', () => {
  assert.equal(Settings.schema.path('coinsPerUSD').defaultValue, 1000);
  const doc = new Settings({});
  assert.equal(doc.coinsPerUSD, 1000);
  assert.equal(new Settings({ coinsPerUSD: 777 }).coinsPerUSD, 777);
  const offerwalls = fs.readFileSync(path.join(__dirname, '..', 'routes', 'offerwalls.js'), 'utf8');
  assert.doesNotMatch(offerwalls, /coinsPerUSD/);
});

test('getSingleton never writes coinsPerUSD', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'Settings.js'), 'utf8');
  const start = src.indexOf('settingsSchema.statics.getSingleton');
  assert.ok(start > 0);
  assert.doesNotMatch(src.slice(start), /coinsPerUSD\s*=/);
});

test('provider default ratios are unchanged at 100 (no rates invented)', () => {
  const providers = new Settings({}).offerwallProviders;
  assert.ok(providers.length >= 10);
  for (const provider of providers) assert.equal(provider.conversionRatio, 100);
});
