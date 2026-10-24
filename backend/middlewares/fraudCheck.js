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
  let ip = (
    req.headers['x-test-ip'] ||
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.headers['x-client-ip'] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ''
  );
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  return ip.trim();
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
      // ── Look up user early so we can check admin / exempt status ──
      let dbUser = null;
      if (req.user?.uid) {
        dbUser = await User.findOne({ firebaseUid: req.user.uid });
      }

      // ── Admin accounts and fraud-exempt users are NEVER blocked ──
      const isProtected = dbUser && (dbUser.role === 'admin' || dbUser.fraudExempt === true);

      // ── Developer Test Mode: Simulate VPN detection on localhost/test ──
      if (!isProtected && (req.headers['x-mock-vpn'] === 'true' || req.query?.mockVpn === 'true')) {
        const mockResult = {
          status: 'ok',
          proxy: true,
          type: 'VPN',
          risk: 99,
          provider: 'Simulated VPN (Dev Test)',
          country: 'Germany',
          city: 'Frankfurt',
          asn: 'AS12345',
          raw: { simulated: true },
        };
        req.fraud = { flagged: true, result: mockResult, action: 'blocked' };
        if (mode === 'full') {
          return res.status(403).json({
            success: false,
            error: 'Access denied. VPN, proxy, or TOR connections are not allowed on this platform.',
            code: 'FRAUD_BLOCKED',
          });
        }
      }

      const ip = getClientIp(req);
      if (!ip || ip === '127.0.0.1' || ip === '::1') {
        req.fraud = { flagged: false, result: null, action: 'allowed' };
        if (req.user?.uid) {
          const { resolveClientGeo } = require('../utils/geoIp');
          resolveClientGeo(req).then(({ ip: realIp, country }) => {
            User.updateOne(
              { firebaseUid: req.user.uid },
              { $set: { lastIp: realIp, ...(country ? { lastCountry: country } : {}) } }
            ).catch(() => {});
          }).catch(() => {});
        }
        return next();
      }

      // ── Check cache first ──
      const cached = ipCache.get(ip);
      const now = Date.now();
      if (cached) {
        const ttl = cached.result.proxy ? FLAGGED_TTL : CLEAN_TTL;
        if (now - cached.fetchedAt < ttl) {
          req.fraud = { flagged: cached.result.proxy, result: cached.result, action: cached.action };
          // Block NON-protected users on cached proxy result
          if (mode === 'full' && cached.result.proxy && !isProtected) {
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

      // If proxycheck API errored, log warning but still allow (don't crash the app)
      // However, do NOT silently pass — mark as unknown so we can track
      if (result.status === 'error') {
        console.warn('[FraudCheck] proxycheck.io API failed for IP:', ip, '— allowing through but logging');
        req.fraud = { flagged: false, result, action: 'allowed' };
        if (req.user?.uid) {
          const { resolveClientGeo } = require('../utils/geoIp');
          resolveClientGeo(req).then(({ ip: realIp, country }) => {
            User.updateOne(
              { firebaseUid: req.user.uid },
              { $set: { lastIp: realIp || ip, ...(country ? { lastCountry: country } : {}) } }
            ).catch(() => {});
          }).catch(() => {});
        }
        // Log the failed check so admin can review
        try {
          await FraudLog.create({
            userId: dbUser?._id || null,
            ip,
            isProxy: false,
            isVpn: false,
            isTor: false,
            riskScore: 0,
            route: routeName,
            action: 'api_error',
            rawResponse: result.raw || { error: 'proxycheck API failed' },
          });
        } catch (_) {}
        return next();
      }

      const isTor = (result.type || '').toUpperCase() === 'TOR';
      const isVpn = (result.type || '').toUpperCase() === 'VPN';
      const isProxy = result.proxy && !isTor && !isVpn;

      // Determine action (protected users are always allowed)
      let action = 'allowed';
      if (result.proxy && !isProtected) {
        action = mode === 'full' ? 'blocked' : 'warned';
      }

      // Cache the result
      ipCache.set(ip, { result, action, fetchedAt: now });
      pruneCache();

      // ── Update user tracking (IP, fingerprints, fraud flags) ──
      let userId = null;
      if (dbUser) {
        userId = dbUser._id;

        // Update user IP tracking
        dbUser.lastIp = ip;
        if (!dbUser.ipHistory) dbUser.ipHistory = [];
        if (!dbUser.ipHistory.includes(ip)) {
          dbUser.ipHistory.push(ip);
          if (dbUser.ipHistory.length > 20) dbUser.ipHistory.shift();
        }

        // Update country if we got one
        if (result.country) dbUser.lastCountry = result.country;

        // Fingerprint from frontend (sent in request body or header)
        const fingerprint = req.body?.fingerprint || req.headers['x-device-fingerprint'] || '';
        if (fingerprint) {
          if (!dbUser.deviceFingerprints) dbUser.deviceFingerprints = [];
          if (!dbUser.deviceFingerprints.includes(fingerprint)) {
            dbUser.deviceFingerprints.push(fingerprint);
            if (dbUser.deviceFingerprints.length > 10) dbUser.deviceFingerprints.shift();
          }
        }

        // Only increment fraud flags for NON-protected users
        if (result.proxy && !isProtected) {
          dbUser.fraudFlag = (dbUser.fraudFlag || 0) + 1;
          dbUser.fraudStatus = dbUser.fraudFlag >= 3 ? 'blocked' : dbUser.fraudFlag >= 1 ? 'flagged' : 'clean';
        }

        await dbUser.save();
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

      // ── Notify admins on detection (only for non-protected users) ──
      if (result.proxy && userId && !isProtected) {
        try {
          await notifyAdmins({
            category: 'users',
            type: 'fraud_detected',
            message: `🚨 ${result.type || 'Proxy'} detected for user ${dbUser?.displayName || 'Unknown'} (IP: ${ip}, Risk: ${result.risk}%, Route: ${routeName})`,
            permissionRequired: 'manage_users',
            metadata: { userId, ip, riskScore: result.risk, proxyType: result.type, route: routeName },
          });
        } catch (notifyErr) {
          console.error('[FraudCheck] Admin notify error:', notifyErr.message);
        }
      }

      req.fraud = { flagged: result.proxy, result, action };

      // ── Block if mode is full and proxy detected (NEVER block protected users) ──
      if (mode === 'full' && result.proxy && !isProtected) {
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

