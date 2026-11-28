import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOGO_ICON_PATH, LOGO_WORDMARK_PATH } from '../src/components/brand/logoPaths.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('logo uses the original designed paths everywhere (no pixel snapping)', () => {
  assert.match(LOGO_ICON_PATH, /^M5\.26177 0H23\.2747/);
  assert.match(LOGO_WORDMARK_PATH, /^M155\.229 4\.91809/);
  const landing = fs.readFileSync(path.join(here, '../src/pages/Landing.jsx'), 'utf8');
  const header = fs.readFileSync(path.join(here, '../src/components/layout/Header.jsx'), 'utf8');
  for (const src of [landing, header]) {
    assert.doesNotMatch(src, /_PIXEL/);
    assert.doesNotMatch(src, /strokeWidth="0\.3"/);
  }
  assert.match(landing, /d=\{LOGO_ICON_PATH\}/);
  assert.match(header, /d=\{LOGO_ICON_PATH\}/);
  // Desktop landing logo stays 1:1 on whole pixels.
  assert.match(landing, /viewBox=\{isMobile \? '0 0 161 29' : '0 0 161 30'\}/);
});
