const crypto = require('crypto');

// Standard Base32 decoding implementation
function base32Decode(base32) {
  const cleaned = base32.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes = [];
  
  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error('Invalid base32 character');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Generate secure 16-char base32 secret
function generateBase32Secret(length = 16) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += alphabet[bytes[i] % alphabet.length];
  }
  return secret;
}

// Verify TOTP token with 30s step and optional window for drift
function verifyTOTP(token, secret, window = 1) {
  if (!token || !secret) return false;
  try {
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30);
    const key = base32Decode(secret);
    
    for (let i = -window; i <= window; i++) {
      const val = counter + i;
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64BE(BigInt(val), 0);
      
      const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const codeVal = ((hmac[offset] & 0x7f) << 24) |
                      ((hmac[offset + 1] & 0xff) << 16) |
                      ((hmac[offset + 2] & 0xff) << 8) |
                      (hmac[offset + 3] & 0xff);
      const expectedToken = (codeVal % 1000000).toString().padStart(6, '0');
      if (expectedToken === token) return true;
    }
  } catch (err) {
    console.error('Error verifying TOTP:', err);
  }
  return false;
}

// Session signing / JWT-like token implementation using HMAC
const JWT_SECRET = process.env.JWT_SECRET || 'secret-totp-fallback-key-2026';

function signTwoFactorToken(uid, expiresInMs = 24 * 60 * 60 * 1000) {
  const expiry = Date.now() + expiresInMs;
  const payload = { uid, expiry };
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64');
}

function verifyTwoFactorToken(token) {
  if (!token) return null;
  try {
    const { data, signature } = JSON.parse(Buffer.from(token, 'base64').toString());
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(data);
    if (Date.now() > payload.expiry) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateBase32Secret,
  verifyTOTP,
  signTwoFactorToken,
  verifyTwoFactorToken,
};
