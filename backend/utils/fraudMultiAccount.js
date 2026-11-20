const User = require('../models/User');
const { notifyAdmins } = require('./adminNotify');

/**
 * Evaluates whether currentUser shares multi-account signals with existing accounts.
 *
 * Rules:
 * 1. Admins and fraudExempt users are NEVER auto-banned.
 * 2. Matches on 2+ signals (device cookie, browser fingerprint, client IP) = CONFIRMED multi-account.
 * 3. The oldest account (earliest createdAt) is the Primary Account and remains active.
 * 4. Any secondary / additional accounts are automatically banned (isBanned: true, banReason: 'auto_multi_account', fraudStatus: 'blocked').
 * 5. Matches on only 1 signal (e.g. shared IP on home/office WiFi) = FLAGGED ONLY, no auto-ban.
 */
async function enforceMultiAccountCheck(currentUser, { deviceToken, fingerprint, clientIp } = {}) {
  try {
    if (!currentUser || currentUser.role === 'admin' || currentUser.fraudExempt) {
      return { autoBanned: false };
    }

    const orConditions = [];
    if (deviceToken) {
      orConditions.push({ deviceTokens: deviceToken });
    }
    if (fingerprint) {
      orConditions.push({ deviceFingerprints: fingerprint });
    }
    const isPublicIp = clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== 'localhost';
    if (isPublicIp) {
      orConditions.push({ lastIp: clientIp });
      orConditions.push({ ipHistory: clientIp });
    }

    if (orConditions.length === 0) {
      return { autoBanned: false };
    }

    // Query candidate accounts
    const candidates = await User.find({
      _id: { $ne: currentUser._id },
      role: { $ne: 'admin' },
      fraudExempt: { $ne: true },
      $or: orConditions
    }).select('_id email displayName createdAt deviceTokens deviceFingerprints lastIp ipHistory isBanned fraudStatus fraudFlag');

    if (!candidates || candidates.length === 0) {
      return { autoBanned: false };
    }

    const confirmedMulti = [];
    const singleSignalMatches = [];

    for (const cand of candidates) {
      const matchToken = Boolean(deviceToken && cand.deviceTokens && cand.deviceTokens.includes(deviceToken));
      const matchFingerprint = Boolean(fingerprint && cand.deviceFingerprints && cand.deviceFingerprints.includes(fingerprint));
      const matchIp = Boolean(
        isPublicIp && (cand.lastIp === clientIp || (Array.isArray(cand.ipHistory) && cand.ipHistory.includes(clientIp)))
      );

      const signalCount = (matchToken ? 1 : 0) + (matchFingerprint ? 1 : 0) + (matchIp ? 1 : 0);
      const details = { matchToken, matchFingerprint, matchIp, signalCount };

      if (signalCount >= 2) {
        cand.matchedSignalDetails = details;
        confirmedMulti.push(cand);
      } else if (signalCount === 1) {
        cand.matchedSignalDetails = details;
        singleSignalMatches.push(cand);
      }
    }

    // Handle 2+ signals: Confirmed multi-account abuse
    if (confirmedMulti.length > 0) {
      // Determine primary account: oldest account by createdAt
      const pool = [currentUser, ...confirmedMulti].slice();
      pool.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
        return timeA - timeB;
      });
      const primaryAccount = pool[0];
      const isCurrentPrimary = currentUser._id.toString() === primaryAccount._id.toString();

      if (!isCurrentPrimary) {
        // Current user is an additional account -> AUTO-BAN
        currentUser.isBanned = true;
        currentUser.banReason = 'auto_multi_account';
        currentUser.bannedAt = new Date();
        currentUser.fraudStatus = 'blocked';
        currentUser.fraudFlag = (currentUser.fraudFlag || 0) + 2;
        await currentUser.save();

        try {
          const FraudLog = require('../models/FraudLog');
          await FraudLog.create({
            userId: currentUser._id,
            ip: clientIp || 'unknown',
            fingerprint: fingerprint || '',
            action: 'blocked',
            route: 'multi_account_auto_ban',
            riskScore: 99,
            rawResponse: {
              reason: 'auto_multi_account',
              primaryUserId: primaryAccount._id,
              primaryEmail: primaryAccount.email,
              matchedAccounts: confirmedMulti.map(c => ({
                id: c._id,
                email: c.email,
                details: c.matchedSignalDetails
              }))
            }
          });
        } catch (logErr) {
          console.warn('[Fraud] Failed to create FraudLog for auto-ban:', logErr.message);
        }

        await notifyAdmins({
          category: 'users',
          type: 'multi_account_detected',
          message: `🚨 Multi-account AUTO-BANNED! ${currentUser.displayName} (${currentUser.email}) matched primary account ${primaryAccount.displayName} (${primaryAccount.email}) with 2+ signals.`,
          permissionRequired: 'manage_users',
          metadata: {
            userId: currentUser._id,
            primaryAccountId: primaryAccount._id,
            signals: confirmedMulti.map(c => c._id)
          }
        });

        return {
          autoBanned: true,
          isBanned: true,
          banReason: 'auto_multi_account',
          primaryAccount
        };
      } else {
        // Current user is Primary -> keep active, but ban any unbanned additional accounts in confirmedMulti
        for (const addl of confirmedMulti) {
          if (!addl.isBanned) {
            addl.isBanned = true;
            addl.banReason = 'auto_multi_account';
            addl.bannedAt = new Date();
            addl.fraudStatus = 'blocked';
            addl.fraudFlag = (addl.fraudFlag || 0) + 2;
            await addl.save();

            try {
              const FraudLog = require('../models/FraudLog');
              await FraudLog.create({
                userId: addl._id,
                ip: clientIp || 'unknown',
                fingerprint: fingerprint || '',
                action: 'blocked',
                route: 'multi_account_auto_ban',
                riskScore: 99,
                rawResponse: {
                  reason: 'auto_multi_account',
                  primaryUserId: primaryAccount._id,
                  primaryEmail: primaryAccount.email
                }
              });
            } catch (e) {}

            await notifyAdmins({
              category: 'users',
              type: 'multi_account_detected',
              message: `🚨 Additional multi-account AUTO-BANNED! ${addl.displayName} (${addl.email}) matched primary account ${primaryAccount.displayName} (${primaryAccount.email}).`,
              permissionRequired: 'manage_users',
              metadata: { userId: addl._id, primaryAccountId: primaryAccount._id }
            });
          }
        }

        return {
          autoBanned: false,
          isPrimary: true,
          primaryAccount
        };
      }
    }

    // Handle single signal match: Flag only, do NOT auto-ban
    if (singleSignalMatches.length > 0) {
      currentUser.fraudFlag = (currentUser.fraudFlag || 0) + 1;
      if (currentUser.fraudStatus === 'clean') {
        currentUser.fraudStatus = 'flagged';
      }
      await currentUser.save();

      await notifyAdmins({
        category: 'users',
        type: 'multi_account_detected',
        message: `⚠️ Potential multi-account detected (single signal): ${currentUser.displayName} shares a signal with: ${singleSignalMatches.map(a => a.displayName).join(', ')}`,
        permissionRequired: 'manage_users',
        metadata: {
          userId: currentUser._id,
          linkedAccountIds: singleSignalMatches.map(a => a._id),
          deviceToken,
          fingerprint,
          clientIp
        }
      });

      return { autoBanned: false, flagged: true, singleSignalMatches };
    }

    return { autoBanned: false };
  } catch (err) {
    console.error('[Fraud] enforceMultiAccountCheck error:', err);
    return { autoBanned: false, error: err.message };
  }
}

module.exports = { enforceMultiAccountCheck };
