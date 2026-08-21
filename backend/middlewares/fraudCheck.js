const https = require('https');
const FraudLog = require('../models/FraudLog');
const User = require('../models/User');
const { notifyAdmins } = require('../utils/adminNotify');

/* ─────────────────────────────────────────────────────────────────
   In-memory IP cache to avoid hammering proxycheck.io
   Key = IP, Value = { result, fetchedAt }
   TTL: 10 minutes for clean IPs, 30 minutes for flagged IPs
───────────────────────────────────────────────────────────────── */
const ipCache = new Map();
const CLEAN_TTL = 10 * 60 * 1000;   // 10 min
const FLAGGED_TTL = 30 * 60 * 1000; // 30 min
const MAX_CACHE = 5000;

function pruneCache() {
  if (ipCache.size > MAX_CACHE) {
    const oldest = [...ipCache.entries()]
      .sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)
      .slice(0, 1000);
    oldest.forEach(([key]) => ipCache.delete(key));
  }
}

/* ─────────────────────────────────────────────────────────────────
   Extract real client IP from request (behind Nginx proxy)
───────────────────────────────────────────────────────────────── */
function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    ''
  );
}

/* ─────────────────────────────────────────────────────────────────
   Call proxycheck.io API
   Returns: { proxy, type, risk, provider, country, city, asn }
───────────────────────────────────────────────────────────────── */
function checkIpWithProxyCheck(ip) {
  const apiKey = process.env.PROXYCHECK_API_KEY || '';
  return new Promise((resolve) => {
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const path = `/v2/${encodeURIComponent(ip)}?vpn=1&asn=1&risk=1${keyParam}`;

    const options = {
      hostname: 'proxycheck.io',
      path,
      method: 'GET',
      headers: { 'User-Agent': 'TaskMint-AntiFraud/1.0' },
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const ipData = json[ip] || {};
          resolve({
            status: json.status || 'error',
            proxy: ipData.proxy === 'yes',
            type: ipData.type || '',      // VPN, TOR, SOCKS, etc.
            risk: parseInt(ipData.risk, 10) || 0,
            provider: ipData.provider || '',
            country: ipData.country || '',
            city: ipData.city || '',
            asn: ipData.asn || '',
            raw: json,
          });
        } catch (e) {
          console.error('[FraudCheck] proxycheck.io parse error:', e.message);
          resolve({ status: 'error', proxy: false, type: '', risk: 0, provider: '', country: '', city: '', asn: '', raw: {} });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[FraudCheck] proxycheck.io network error:', e.message);
      resolve({ status: 'error', proxy: false, type: '', risk: 0, provider: '', country: '', city: '', asn: '', raw: {} });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.warn('[FraudCheck] proxycheck.io timeout for', ip);
      resolve({ status: 'error', proxy: false, type: '', risk: 0, provider: '', country: '', city: '', asn: '', raw: {} });
    });
  });
}

/* ─────────────────────────────────────────────────────────────────
   MAIN MIDDLEWARE FACTORY
   
   Usage:
     const { fraudCheck } = require('../middlewares/fraudCheck');
     router.post('/withdraw', verifyToken, fraudCheck('withdraw'), async (req, res) => { ... });
   
   Modes:
     'full'  — API call + log + increment fraudFlag + potentially block
     'light' — API call + log only (no blocking, used for login tracking)
   
   Results are attached to req.fraud = { flagged, result, action }
───────────────────────────────────────────────────────────────── */
function fraudCheck(routeName = 'unknown', mode = 'full') {
  return async (req, res, next) => {
    try {
      const ip = getClientIp(req);
      if (!ip || ip === '127.0.0.1' || ip === '::1') {
        req.fraud = { flagged: false, result: null, action: 'allowed' };
        return next();
      }

      // ── Check cache first ──
      const cached = ipCache.get(ip);
      const now = Date.now();
      if (cached) {
        const ttl = cached.result.proxy ? FLAGGED_TTL : CLEAN_TTL;
        if (now - cached.fetchedAt < ttl) {
          req.fraud = { flagged: cached.result.proxy, result: cached.result, action: cached.action };
          // Still log the access for tracking but don't block if mode is light
          if (mode === 'full' && cached.result.proxy) {
            return res.status(403).json({
              success: false,
              error: 'Access denied. VPN, proxy, or TOR connections are not allowed on this platform.',
              code: 'FRAUD_BLOCKED',
            });
          }
          return next();
        }
        ipCache.delete(ip);
      }

      // ── Call proxycheck.io ──
      const result = await checkIpWithProxyCheck(ip);

      // If proxycheck API errored, fail open (allow the request)
      if (result.status === 'error') {
        req.fraud = { flagged: false, result, action: 'allowed' };
        return next();
      }

      const isTor = (result.type || '').toUpperCase() === 'TOR';
      const isVpn = (result.type || '').toUpperCase() === 'VPN';
      const isProxy = result.proxy && !isTor && !isVpn;

      // Determine action
      let action = 'allowed';
      if (result.proxy) {
        action = mode === 'full' ? 'blocked' : 'warned';
      }

      // Cache the result
      ipCache.set(ip, { result, action, fetchedAt: now });
      pruneCache();

      // ── Get user from request (set by verifyToken middleware) ──
      let userId = null;
      if (req.user?.uid) {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (user) {
          userId = user._id;

          // Update user IP tracking
          user.lastIp = ip;
          if (!user.ipHistory) user.ipHistory = [];
          if (!user.ipHistory.includes(ip)) {
            user.ipHistory.push(ip);
            if (user.ipHistory.length > 20) user.ipHistory.shift();
          }

          // Update country if we got one
          if (result.country) user.lastCountry = result.country;

          // Fingerprint from frontend (sent in request body or header)
          const fingerprint = req.body?.fingerprint || req.headers['x-device-fingerprint'] || '';
          if (fingerprint) {
            if (!user.deviceFingerprints) user.deviceFingerprints = [];
            if (!user.deviceFingerprints.includes(fingerprint)) {
              user.deviceFingerprints.push(fingerprint);
              if (user.deviceFingerprints.length > 10) user.deviceFingerprints.shift();
            }
          }

          if (result.proxy) {
            user.fraudFlag = (user.fraudFlag || 0) + 1;
            user.fraudStatus = user.fraudFlag >= 3 ? 'blocked' : user.fraudFlag >= 1 ? 'flagged' : 'clean';
          }

          await user.save();
        }
      }

      // ── Log to database ──
      const fingerprint = req.body?.fingerprint || req.headers['x-device-fingerprint'] || '';
      try {
        await FraudLog.create({
          userId,
          ip,
          isProxy,
          isVpn,
          isTor,
          riskScore: result.risk,
          provider: result.provider,
          country: result.country,
          city: result.city,
          asn: result.asn,
          proxyType: result.type,
          fingerprint,
          route: routeName,
          action,
          rawResponse: result.raw,
        });
      } catch (logErr) {
        console.error('[FraudCheck] Failed to save fraud log:', logErr.message);
      }

      // ── Notify admins on detection ──
      if (result.proxy && userId) {
        try {
          const user = await User.findById(userId);
          await notifyAdmins({
            category: 'users',
            type: 'fraud_detected',
            message: `🚨 ${result.type || 'Proxy'} detected for user ${user?.displayName || 'Unknown'} (IP: ${ip}, Risk: ${result.risk}%, Route: ${routeName})`,
            permissionRequired: 'manage_users',
            metadata: { userId, ip, riskScore: result.risk, proxyType: result.type, route: routeName },
          });
        } catch (notifyErr) {
          console.error('[FraudCheck] Admin notify error:', notifyErr.message);
        }
      }

      req.fraud = { flagged: result.proxy, result, action };

      // ── Block if mode is full and proxy detected ──
      if (mode === 'full' && result.proxy) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. VPN, proxy, or TOR connections are not allowed on this platform.',
          code: 'FRAUD_BLOCKED',
        });
      }

      next();
    } catch (err) {
      // Fail open on any unexpected error — never break the app
      console.error('[FraudCheck] Unexpected error:', err.message);
      req.fraud = { flagged: false, result: null, action: 'allowed' };
      next();
    }
  };
}

module.exports = { fraudCheck, getClientIp };
