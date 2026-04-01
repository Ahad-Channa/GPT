const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found in DB' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    req.dbUser = user;
    next();
  } catch (error) {
    console.error('requireAdmin error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

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

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const primaryAdminEmail = process.env.PRIMARY_ADMIN_EMAIL;
      const isPrimary = primaryAdminEmail && req.user.email === primaryAdminEmail;
      
      const user = await User.findOne({ firebaseUid: req.user.uid });
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found in DB' });
      }

      if (isPrimary) {
        req.dbUser = user;
        return next();
      }

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

module.exports = {
  requireAdmin,
  requirePrimaryAdmin,
  requirePermission,
};
