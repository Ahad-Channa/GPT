const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseCoverImageInput } = require('../utils/directOfferInput');

test('empty cover image becomes null (removes the image)', () => {
  assert.equal(parseCoverImageInput(''), null);
  assert.equal(parseCoverImageInput(null), null);
  assert.equal(parseCoverImageInput(undefined), null);
});

test('uploaded image data URLs and existing http(s) URLs are accepted', () => {
  assert.equal(parseCoverImageInput('data:image/webp;base64,AAAA'), 'data:image/webp;base64,AAAA');
  assert.equal(parseCoverImageInput('data:image/png;base64,iVBOR=='), 'data:image/png;base64,iVBOR==');
  assert.equal(parseCoverImageInput(' https://cdn.example/x.png '), 'https://cdn.example/x.png');
});

test('scripts, non-image data URLs, SVG and oversized uploads are rejected with 400', () => {
  const bad = [
    'javascript:alert(1)',
    'data:text/html;base64,AAAA',
    'data:image/svg+xml;base64,AAAA',
    `data:image/png;base64,${'A'.repeat(3 * 1024 * 1024)}`,
    { not: 'a string' },
  ];
  for (const value of bad) {
    assert.throws(() => parseCoverImageInput(value), (error) => error.statusCode === 400);
  }
});

test('admin create and update both validate coverImage', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
  assert.match(src, /coverImage: parseCoverImageInput\(coverImage\),/);
  assert.match(src, /\.\.\.\(coverImage !== undefined && \{ coverImage: parseCoverImageInput\(coverImage\) \}\)/);
});
