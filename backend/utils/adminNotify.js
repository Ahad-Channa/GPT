const User = require('../models/User');
const AdminNotification = require('../models/AdminNotification');

/**
 * Creates and dispatches admin notifications to relevant admins.
 *
 * @param {Object} params
 * @param {string} params.category - Mapped to sidebar (e.g. 'withdrawals', 'offerwalls', 'users', 'security')
 * @param {string} params.type - Specific event type (e.g. 'withdrawal_requested')
 * @param {string} params.message - Human-readable alert message
 * @param {string} [params.permissionRequired] - The admin permission needed to see this (e.g. 'manage_withdrawals')
 * @param {Object} [params.metadata] - Extra data (IDs, links)
 */
async function notifyAdmins({ category, type, message, permissionRequired, metadata = {} }) {
  try {
    // 1. Fetch all admins & moderators
    const admins = await User.find({ role: { $in: ['admin', 'moderator'] } });

    // 2. Filter based on permission or if they are primary admin (which is checked usually via env email, but here we can just check their email against process.env.PRIMARY_ADMIN_EMAIL or if they have the exact permission).
    const eligibleAdmins = admins.filter((admin) => {
      const isPrimary = admin.email === process.env.PRIMARY_ADMIN_EMAIL;
      const hasPerm = admin.adminPermissions && admin.adminPermissions.includes(permissionRequired);
      return isPrimary || hasPerm || !permissionRequired;
    });

    if (eligibleAdmins.length === 0) return;

    // 3. Bulk insert to AdminNotification collection
    const notifications = eligibleAdmins.map((admin) => ({
      adminId: admin._id,
      category,
      type,
      message,
      metadata,
    }));

    await AdminNotification.insertMany(notifications);
  } catch (err) {
    console.error('[notifyAdmins] Failed to dispatch admin notifications:', err);
  }
}

module.exports = { notifyAdmins };
