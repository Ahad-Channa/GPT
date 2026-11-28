import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOGO_ICON_PATH, LOGO_WORDMARK_PATH, LOGO_ICON_PATH_PIXEL, LOGO_WORDMARK_PATH_PIXEL, snapLogoPathToPixels,
} from '../src/components/brand/logoPaths.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const nums = (d) => d.match(/-?\d*\.?\d+/g).map(Number);

test('pixel paths round every coordinate and keep the command structure', () => {
  for (const [orig, snapped] of [[LOGO_ICON_PATH, LOGO_ICON_PATH_PIXEL], [LOGO_WORDMARK_PATH, LOGO_WORDMARK_PATH_PIXEL]]) {
    assert.match(orig, /^[MLHVCZ0-9.\s-]+$/, 'only absolute commands');
    const a = nums(orig); const b = nums(snapped);
    assert.equal(a.length, b.length);
    a.forEach((v, i) => { assert.ok(Number.isInteger(b[i])); assert.ok(Math.abs(v - b[i]) <= 0.5); });
    assert.equal(orig.replace(/[^A-Z]/g, ''), snapped.replace(/[^A-Z]/g, ''));
  }
  assert.equal(snapLogoPathToPixels('M1.4 2.6H3.5'), 'M1 3H4');
});

test('desktop logos use the pixel paths drawn 1:1; mobile keeps the originals', () => {
  const landing = fs.readFileSync(path.join(here, '../src/pages/Landing.jsx'), 'utf8');
  assert.match(landing, /d=\{isMobile \? LOGO_ICON_PATH : LOGO_ICON_PATH_PIXEL\}/);
  assert.match(landing, /d=\{isMobile \? LOGO_WORDMARK_PATH : LOGO_WORDMARK_PATH_PIXEL\}/);
  assert.match(landing, /viewBox=\{isMobile \? '0 0 161 29' : '0 0 161 30'\}/);
  const header = fs.readFileSync(path.join(here, '../src/components/layout/Header.jsx'), 'utf8');
  const desktop = header.slice(header.indexOf('id="header-brand-logo"'));
  assert.match(desktop.slice(0, 1500), /d=\{LOGO_ICON_PATH_PIXEL\}/);
  assert.doesNotMatch(header, /strokeWidth="0\.3"/);
});
