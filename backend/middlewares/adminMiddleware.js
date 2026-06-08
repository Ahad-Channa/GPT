const User = require('../models/User');

// Roles that can access the admin panel
const ADMIN_PANEL_ROLES = ['admin', 'support_agent'];

/**
 * requireAdmin — allows any admin panel user (admin OR support_agent).
 * Individual routes further restrict with requirePermission().
 */
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found in DB' });
    }

    if (!ADMIN_PANEL_ROLES.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    req.dbUser = user;
    next();
  } catch (error) {
    console.error('requireAdmin error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * requirePrimaryAdmin — only the primary admin (by email env var).
 */
const requirePrimaryAdmin = async (req, res, next) => {
  try {
    const primaryAdminEmail = process.env.PRIMARY_ADMIN_EMAIL;
    if (!primaryAdminEmail || req.user.email !== primaryAdminEmail) {
      return res.status(403).json({ success: false, error: 'Forbidden: Primary Admin access required' });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found in DB' });
    }

    req.dbUser = user;
    next();
  } catch (error) {
    console.error('requirePrimaryAdmin error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * requirePermission(permission) — checks that:
 *   - Primary admin → always allowed
 *   - support_agent with manage_support → allowed for manage_support routes
 *   - admin with the specific permission in adminPermissions[] → allowed
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const primaryAdminEmail = process.env.PRIMARY_ADMIN_EMAIL;
      const isPrimary = primaryAdminEmail && req.user.email === primaryAdminEmail;

      const user = await User.findOne({ firebaseUid: req.user.uid });
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found in DB' });
      }

      // Primary admin bypasses all permission checks
      if (isPrimary) {
        req.dbUser = user;
        return next();
      }

      // Support agents can only access manage_support routes
      if (user.role === 'support_agent') {
        if (permission === 'manage_support') {
          req.dbUser = user;
          return next();
        }
        return res.status(403).json({ success: false, error: 'Forbidden: Support Agents can only access Support.' });
      }

      // Regular admin: must have the specific permission
      if (user.role !== 'admin' || !user.adminPermissions.includes(permission)) {
        return res.status(403).json({ success: false, error: `Forbidden: Requires ${permission} permission` });
      }

      req.dbUser = user;
      next();
    } catch (error) {
      console.error('requirePermission error:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  };
};

/**
 * requireChatAccess — allows admin, chat_mod, support_agent to use chat moderation APIs.
 */
const requireChatAccess = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const User = require('../models/User');
    const admin = require('../config/firebase');
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });

    const primaryAdminEmail = process.env.PRIMARY_ADMIN_EMAIL;
    const isPrimary = primaryAdminEmail && decoded.email === primaryAdminEmail;

    const chatRoles = ['admin', 'chat_mod', 'support_agent', 'moderator'];
    const hasAdminChatPerm = user?.role === 'admin' && user?.adminPermissions?.includes('manage_chat');

    if (!user || (!chatRoles.includes(user.role) && !hasAdminChatPerm && !isPrimary)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    console.error('requireChatAccess error:', err);
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

module.exports = {
  requireAdmin,
  requirePrimaryAdmin,
  requirePermission,
  requireChatAccess,
};
