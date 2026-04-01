const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const adminFirebase = require('../config/firebase'); // Renamed so not to conflict with auth var 'admin' inside routes
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireAdmin, requirePrimaryAdmin, requirePermission } = require('../middlewares/adminMiddleware');

// === ADMIN ROUTES ENTRY POINT ===
// All routes below require at least a valid Firebase token and an admin role.
router.use(verifyToken, requireAdmin);

// Utility to create logs
const createLog = async (adminId, action, targetUserId, details) => {
  try {
    await AdminLog.create({
      adminId,
      action,
      targetUserId,
      details,
    });
  } catch (error) {
    console.error('Failed to create AdminLog:', error);
  }
};

// ----------------------------------------------------
// USERS SECTION (Requires 'manage_users' permission)
// ----------------------------------------------------

// Get all users (with search capabilities)
router.get('/users', requirePermission('manage_users'), async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { firebaseUid: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await User.countDocuments(query);

    res.json({ success: true, users, total });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Ban/Unban user
router.put('/users/:id/ban', requirePermission('manage_users'), async (req, res) => {
  try {
    const { isBanned } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned }, { new: true });
    
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    await createLog(req.dbUser._id, isBanned ? 'BAN_USER' : 'UNBAN_USER', user._id, { reason: req.body.reason || 'No reason provided' });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update user ban status' });
  }
});



// Adjust balance
router.put('/users/:id/balance', requirePermission('manage_users'), async (req, res) => {
  try {
    const { amount, reason } = req.body; // Can be positive or negative
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    user.walletBalance += Number(amount);
    if (user.walletBalance < 0) user.walletBalance = 0;
    
    await user.save();
    
    await createLog(req.dbUser._id, 'ADJUST_BALANCE', user._id, { amount, reason });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to adjust balance' });
  }
});

// ----------------------------------------------------
// STAFF SECTION (Requires Primary Admin)
// ----------------------------------------------------

// Get all admins
router.get('/admins', requirePrimaryAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-__v');
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch admins' });
  }
});

// Promote user to admin
router.post('/admins', requirePrimaryAdmin, async (req, res) => {
  try {
    const { userId, permissions } = req.body; // array string
    
    const user = await User.findByIdAndUpdate(userId, { 
      role: 'admin',
      adminPermissions: permissions || []
    }, { new: true });
    
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    await createLog(req.dbUser._id, 'CREATE_ADMIN', user._id, { permissions });
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to promote admin' });
  }
});

// Edit admin permissions
router.put('/admins/:id/permissions', requirePrimaryAdmin, async (req, res) => {
  try {
    const { permissions } = req.body;
    
    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      { adminPermissions: permissions }, 
      { new: true }
    );
    
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });

    await createLog(req.dbUser._id, 'EDIT_PERMISSIONS', admin._id, { permissions });
    
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update admin permissions' });
  }
});

// Directly Mint Admin Credentials
router.post('/create-admin-credentials', requirePrimaryAdmin, async (req, res) => {
  try {
    const { email, password, displayName, permissions } = req.body;

    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!password || !pwdRegex.test(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters and include 1 special character and 1 number.' });
    }

    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!displayName || !nameRegex.test(displayName)) {
      return res.status(400).json({ success: false, error: 'Invalid User Name.' });
    }

    // 1. Create User in Firebase Auth
    const userRecord = await adminFirebase.auth().createUser({
      email,
      password,
      displayName,
    });

    // 2. Insert into MongoDB
    const newUser = new User({
      firebaseUid: userRecord.uid,
      email: userRecord.email,
      displayName: displayName,
      role: 'admin',
      adminPermissions: permissions || []
    });

    await newUser.save();
    await createLog(req.dbUser._id, 'CREATE_ADMIN', newUser._id, { method: 'DIRECT_MINT', permissions });

    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Create Admin Credentials Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to mint admin credentials' });
  }
});

// Revoke admin status
router.delete('/admins/:id', requirePrimaryAdmin, async (req, res) => {
  try {
     const adminUser = await User.findOneAndUpdate(
       { _id: req.params.id, role: 'admin' },
       { role: 'user', adminPermissions: [] },
       { new: true }
     );
     
     if (!adminUser) return res.status(404).json({ success: false, error: 'Admin not found' });

     await createLog(req.dbUser._id, 'REVOKE_ADMIN', adminUser._id, {});

     res.json({ success: true, user: adminUser });
  } catch (error) {
     res.status(500).json({ success: false, error: 'Failed to revoke admin status' });
  }
});

// ----------------------------------------------------
// LOGS SECTION (Requires Primary Admin)
// ----------------------------------------------------
router.get('/logs', requirePrimaryAdmin, async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate('adminId', 'email displayName')
      .populate('targetUserId', 'email displayName')
      .sort({ createdAt: -1 })
      .limit(100);
      
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

module.exports = router;
