import test from 'node:test';
import assert from 'node:assert/strict';
import { hasManualOfferStarted, resolveProofInstructions } from '../src/utils/manualOfferState.js';

test('manual proof stays available after reopening from server submission state', () => {
  assert.equal(hasManualOfferStarted({ submissionStatus: 'started' }), true);
  assert.equal(hasManualOfferStarted({ submissionStatus: 'rejected' }), true);
  assert.equal(hasManualOfferStarted({ submissionStatus: 'pending' }), false);
  assert.equal(hasManualOfferStarted({ submissionStatus: 'approved' }), false);
});

test('legacy clicked manual offer can be started again', () => {
  assert.equal(hasManualOfferStarted({ clickStatus: 'clicked' }), true);
  assert.equal(hasManualOfferStarted({ clickStatus: null }), false);
});

test('proof instructions use English unless German is the active locale', () => {
  const offer = { proofInstructions: 'Send proof to support.', proofInstructionsDe: 'Senden Sie den Nachweis.' };
  assert.equal(resolveProofInstructions(offer, 'en'), 'Send proof to support.');
  assert.equal(resolveProofInstructions(offer, 'en-US'), 'Send proof to support.');
  assert.equal(resolveProofInstructions(offer, 'de'), 'Senden Sie den Nachweis.');
  assert.equal(resolveProofInstructions({ proofInstructions: 'English only' }, 'de'), 'English only');
});
