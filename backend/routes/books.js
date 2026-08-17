const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const multer = require('multer');
const Book = require('../models/Book');
const BookOrder = require('../models/BookOrder');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const { verifyToken } = require('../middlewares/authMiddleware');

/* ─── Multer — memory storage (images saved as base64 in MongoDB) ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    fieldSize: 15 * 1024 * 1024 // 15 MB per field to allow large base64 strings
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Accept: coverImage (single) + previewImages (up to 5)
const bookUpload = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'previewImages', maxCount: 5 },
]);

/* ─── Helper: convert uploaded buffer to base64 data URL, or use URL string ── */
function resolveImageField(files, fieldName, fallbackUrl) {
  if (files && files[fieldName] && files[fieldName].length > 0) {
    const file = files[fieldName][0];
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
  return (fallbackUrl || '').trim();
}

/* ─── IP helpers ──────────────────────────────────────────────── */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '';
}

const ipCountryCache = new Map();
const IP_CACHE_TTL = 10 * 60 * 1000;

function queryIpApi(ip) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'ip-api.com',
      path: `/json/${ip}?fields=countryCode,proxy,hosting`,
      method: 'GET',
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            country: parsed.countryCode ? parsed.countryCode.toUpperCase() : 'XX',
            proxy: !!parsed.proxy,
            hosting: !!parsed.hosting,
          });
        } catch (e) {
          resolve({ country: 'XX', proxy: false, hosting: false });
        }
      });
    });
    req.on('error', () => resolve({ country: 'XX', proxy: false, hosting: false }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ country: 'XX', proxy: false, hosting: false }); });
    req.end();
  });
}

function queryIpWhoIs(ip) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'ipwho.is',
      path: `/${ip}`,
      method: 'GET',
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.country_code ? parsed.country_code.toUpperCase() : 'XX');
        } catch (e) {
          resolve('XX');
        }
      });
    });
    req.on('error', () => resolve('XX'));
    req.setTimeout(3000, () => { req.destroy(); resolve('XX'); });
    req.end();
  });
}

function queryCountryIs(ip) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.country.is',
      path: `/${ip}`,
      method: 'GET',
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.country ? parsed.country.toUpperCase() : 'XX');
        } catch (e) {
          resolve('XX');
        }
      });
    });
    req.on('error', () => resolve('XX'));
    req.setTimeout(3000, () => { req.destroy(); resolve('XX'); });
    req.end();
  });
}

function queryIpApiCo(ip) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'ipapi.co',
      path: `/${ip}/country/`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const country = data.trim().toUpperCase();
        resolve(country.length === 2 ? country : 'XX');
      });
    });
    req.on('error', () => resolve('XX'));
    req.setTimeout(3000, () => { req.destroy(); resolve('XX'); });
    req.end();
  });
}

async function getCountryAndVpnFromIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.') || ip.startsWith('::ffff:127')) {
    console.log(`[Books Geolocation] Localhost/private IP detected: ${ip}. Defaulting to DE, no VPN.`);
    return { country: 'DE', isVPN: false };
  }
  const cached = ipCountryCache.get(ip);
  if (cached && Date.now() - cached.ts < IP_CACHE_TTL) {
    console.log(`[Books Geolocation] Cache hit for IP ${ip}: country=${cached.country}, isVPN=${cached.isVPN}`);
    return { country: cached.country, isVPN: cached.isVPN };
  }

  let country = 'XX';
  let isVPN = false;

  // 1. Try ip-api.com (returns country + proxy/hosting detection)
  const ipApiResult = await queryIpApi(ip);
  if (ipApiResult.country && ipApiResult.country !== 'XX') {
    country = ipApiResult.country;
    isVPN = ipApiResult.proxy || ipApiResult.hosting;
    console.log(`[Books Geolocation] Resolved IP ${ip} via ip-api.com: country=${country}, proxy=${ipApiResult.proxy}, hosting=${ipApiResult.hosting}, isVPN=${isVPN}`);
    ipCountryCache.set(ip, { country, isVPN, ts: Date.now() });
    return { country, isVPN };
  }

  // 2. Try ipwho.is
  const ipWhoCountry = await queryIpWhoIs(ip);
  if (ipWhoCountry && ipWhoCountry !== 'XX') {
    country = ipWhoCountry;
    console.log(`[Books Geolocation] Resolved IP ${ip} via ipwho.is: ${country}`);
    ipCountryCache.set(ip, { country, isVPN: false, ts: Date.now() });
    return { country, isVPN: false };
  }

  // 3. Try api.country.is
  const countryIsResult = await queryCountryIs(ip);
  if (countryIsResult && countryIsResult !== 'XX') {
    country = countryIsResult;
    console.log(`[Books Geolocation] Resolved IP ${ip} via api.country.is: ${country}`);
    ipCountryCache.set(ip, { country, isVPN: false, ts: Date.now() });
    return { country, isVPN: false };
  }

  // 4. Try ipapi.co
  const ipapiCoResult = await queryIpApiCo(ip);
  if (ipapiCoResult && ipapiCoResult !== 'XX') {
    country = ipapiCoResult;
    console.log(`[Books Geolocation] Resolved IP ${ip} via ipapi.co: ${country}`);
    ipCountryCache.set(ip, { country, isVPN: false, ts: Date.now() });
    return { country, isVPN: false };
  }

  console.warn(`[Books Geolocation] All geolocators failed for IP ${ip}. Defaulting to XX.`);
  return { country: 'XX', isVPN: false };
}

/* ─── Admin middleware ─────────────────────────────────────────── */
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    req.mongoUser = user;
    next();
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
}


/* ─────────────────────────────────────────────────────────────────
   PUBLIC: GET /api/books/debug
───────────────────────────────────────────────────────────────── */
router.get('/debug', async (req, res) => {
  const settings = await Settings.findOne({ _singleton: 'platform_settings' }).lean();
  res.json({ settings });
});

/* ─────────────────────────────────────────────────────────────────
   PUBLIC: GET /api/books
───────────────────────────────────────────────────────────────── */
router.get('/', verifyToken, async (req, res) => {
  try {
    let settings = await Settings.findOne({ _singleton: 'platform_settings' }).lean();
    if (!settings) {
      settings = await Settings.create({ _singleton: 'platform_settings' });
    }
    const booksGermanyOnly = settings.booksGermanyOnly !== false;

    const ip = getClientIp(req);
    let country = null;
    let isVPN = false;

    // Check CDN headers first (Cloudflare / Vercel provide real country)
    const headerCountry = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-country-code'];
    if (headerCountry) {
      country = String(headerCountry).toUpperCase().trim();
      // Even with CDN header country, still check VPN status via ip-api.com
      const vpnCheck = await queryIpApi(ip);
      isVPN = vpnCheck.proxy || vpnCheck.hosting;
    }
    if (!country) {
      const result = await getCountryAndVpnFromIp(ip);
      country = result.country;
      isVPN = result.isVPN;
    }

    // Only allow German IP if: country is DE AND not using VPN/proxy/hosting
    const isGermanIP = country === 'DE' && !isVPN;
    console.log(`[Books Geolocation] Client IP: ${ip}, Headers: cf-ipcountry=${req.headers['cf-ipcountry'] || 'none'}, x-vercel-ip-country=${req.headers['x-vercel-ip-country'] || 'none'}, Resolved: ${country}, isVPN: ${isVPN}, isGermanIP: ${isGermanIP}`);

    let user = null;
    if (req.user) {
      user = await User.findOne({ firebaseUid: req.user.uid }).lean();
    }
    const books = await Book.find({ available: true }).lean().sort({ createdAt: -1 });

    if (user) {
      const userOrders = await BookOrder.find({ userId: user._id, status: { $ne: 'cancelled' } }).lean();
      const orderMap = {};
      userOrders.forEach(o => {
        orderMap[o.bookId.toString()] = o;
      });
      books.forEach(b => {
        if (orderMap[b._id.toString()]) {
          b.userOrder = orderMap[b._id.toString()];
        }
      });
    }

    // Fix hardcoded localhost URLs in DB
    const currentBase = process.env.BACKEND_URL || 'http://localhost:5000';
    books.forEach(b => {
      if (b.coverImage) b.coverImage = b.coverImage.replace('http://localhost:5000', currentBase);
      if (b.previewImages) b.previewImages = b.previewImages.map(img => img.replace('http://localhost:5000', currentBase));
    });

    res.json({ success: true, books, booksGermanyOnly, isGermanIP });
  } catch (e) {
    console.error('[GET /api/books]', e);
    res.status(500).json({ success: false, error: 'Failed to fetch books' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/books/order
───────────────────────────────────────────────────────────────── */
router.post('/order', verifyToken, async (req, res) => {
  try {
    const { bookId, fullName, email, address, city, zipcode, wantsSignature, signatureName } = req.body;

    if (!bookId || !fullName || !email || !address || !city || !zipcode) {
      return res.status(400).json({ success: false, error: 'All shipping fields are required' });
    }

    const book = await Book.findById(bookId);
    if (!book || !book.available) {
      return res.status(404).json({ success: false, error: 'Book not found or unavailable' });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.walletBalance < book.coinCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. You need ${book.coinCost.toLocaleString()} coins but have ${user.walletBalance.toLocaleString()}`,
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, walletBalance: { $gte: book.coinCost } },
      { $inc: { walletBalance: -book.coinCost } },
      { returnDocument: 'after' }
    );
    if (!updatedUser) {
      return res.status(409).json({ success: false, error: 'Balance changed. Please try again.' });
    }

    const tx = await Transaction.create({
      userId: user._id,
      transactionType: 'withdrawal',
      amount: -book.coinCost,
      fee: 0,
      balanceAfter: updatedUser.walletBalance,
      description: `Book Order: ${book.title}`,
      status: 'pending',
      method: 'book',
      payoutDestination: book.title,
    });

    const order = await BookOrder.create({
      userId: user._id,
      bookId: book._id,
      bookTitle: book.title,
      coinCost: book.coinCost,
      fullName: fullName.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      zipcode: zipcode.trim(),
      wantsSignature: !!wantsSignature,
      signatureName: wantsSignature ? (signatureName || '').trim() : '',
      transactionId: tx._id,
    });

    await Notification.create({
      userId: user._id,
      type: 'book_order_placed',
      title: 'Order Placed',
      message: `Your order for "${book.title}" has been successfully placed.`,
      metadata: { orderId: order._id }
    });

    res.json({
      success: true,
      message: 'Order placed successfully! Your book will be shipped within 3–5 business days.',
      order: { _id: order._id, bookTitle: order.bookTitle, coinCost: order.coinCost, status: order.status, createdAt: order.createdAt },
      newBalance: updatedUser.walletBalance,
    });
  } catch (e) {
    console.error('[POST /api/books/order]', e);
    res.status(500).json({ success: false, error: 'Failed to place order' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: GET /api/books/admin/list
───────────────────────────────────────────────────────────────── */
router.get('/admin/list', verifyToken, requireAdmin, async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 }).lean();

    // Fix hardcoded localhost URLs in DB
    const currentBase = process.env.BACKEND_URL || 'http://localhost:5000';
    books.forEach(b => {
      if (b.coverImage) b.coverImage = b.coverImage.replace('http://localhost:5000', currentBase);
      if (b.previewImages) b.previewImages = b.previewImages.map(img => img.replace('http://localhost:5000', currentBase));
    });

    let settings = await Settings.findOne({ _singleton: 'platform_settings' }).lean();
    if (!settings) {
      settings = await Settings.create({ _singleton: 'platform_settings' });
    }
    res.json({ success: true, books, booksGermanyOnly: settings.booksGermanyOnly !== false });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch books' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: POST /api/books/admin/create  (supports file upload OR URL)
───────────────────────────────────────────────────────────────── */
router.post('/admin/create', verifyToken, requireAdmin, (req, res) => {
  bookUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });

    try {
      const { title, description, coinCost, available } = req.body;
      // coverImageUrl = text URL field (optional, overridden by file upload)
      const coverImageUrl = req.body.coverImageUrl || '';
      const previewImageUrls = req.body.previewImageUrls || []; // may come as array or comma-string

      if (!title || !coinCost) {
        return res.status(400).json({ success: false, error: 'Title and coinCost are required' });
      }

      // Cover: uploaded file (base64) takes priority over URL
      const coverImage = resolveImageField(req.files, 'coverImage', coverImageUrl);

      // Preview images: merge uploaded files (base64) + URL strings
      const uploadedPreviews = (req.files?.previewImages || []).map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`);
      const urlPreviews = Array.isArray(previewImageUrls)
        ? previewImageUrls.filter(Boolean)
        : (typeof previewImageUrls === 'string' ? previewImageUrls.split(',').map(s => s.trim()).filter(Boolean) : []);
      const previewImages = [...uploadedPreviews, ...urlPreviews].slice(0, 5);

      const book = await Book.create({
        title: title.trim(),
        description: (description || '').trim(),
        coverImage,
        previewImages,
        coinCost: Number(coinCost),
        available: available !== 'false' && available !== false,
      });

      res.json({ success: true, book });
    } catch (e) {
      console.error('[POST /api/books/admin/create]', e);
      res.status(500).json({ success: false, error: 'Failed to create book' });
    }
  });
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: PUT /api/books/admin/settings  — toggle booksGermanyOnly
   MUST be before /admin/:id to avoid :id catching "settings"
───────────────────────────────────────────────────────────────── */
router.put('/admin/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { booksGermanyOnly } = req.body;
    await Settings.updateOne(
      { _singleton: 'platform_settings' },
      { $set: { booksGermanyOnly: !!booksGermanyOnly } },
      { strict: false }
    );
    res.json({ success: true, booksGermanyOnly: !!booksGermanyOnly });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: PUT /api/books/admin/:id  (supports file upload OR URL)
───────────────────────────────────────────────────────────────── */
router.put('/admin/:id', verifyToken, requireAdmin, (req, res) => {
  bookUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });

    try {
      const { title, description, coinCost, available } = req.body;
      const coverImageUrl = req.body.coverImageUrl || '';
      const previewImageUrls = req.body.previewImageUrls || [];

      // Existing book (to preserve current cover if no new one provided)
      const existing = await Book.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Book not found' });

      // Cover: uploaded file (base64) > new URL > keep existing
      let coverImage = existing.coverImage;
      if (req.files?.coverImage?.length) {
        const f = req.files.coverImage[0];
        coverImage = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;
      } else if (coverImageUrl.trim()) {
        coverImage = coverImageUrl.trim();
      }

      // Previews: uploaded files (base64) + URL strings (replace existing)
      const uploadedPreviews = (req.files?.previewImages || []).map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`);
      const urlPreviews = Array.isArray(previewImageUrls)
        ? previewImageUrls.filter(Boolean)
        : (typeof previewImageUrls === 'string' ? previewImageUrls.split(',').map(s => s.trim()).filter(Boolean) : []);
      // If admin sent new previews (uploaded or URLs) replace; otherwise keep existing
      const hasNewPreviews = uploadedPreviews.length > 0 || urlPreviews.length > 0;
      const previewImages = hasNewPreviews
        ? [...uploadedPreviews, ...urlPreviews].slice(0, 5)
        : existing.previewImages;

      const book = await Book.findByIdAndUpdate(
        req.params.id,
        {
          title: (title || existing.title).trim(),
          description: (description !== undefined ? description : existing.description || '').trim(),
          coverImage,
          previewImages,
          coinCost: coinCost !== undefined ? Number(coinCost) : existing.coinCost,
          available: available !== undefined ? (available !== 'false' && available !== false) : existing.available,
        },
        { new: true }
      );

      res.json({ success: true, book });
    } catch (e) {
      console.error('[PUT /api/books/admin/:id]', e);
      res.status(500).json({ success: false, error: 'Failed to update book' });
    }
  });
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: DELETE /api/books/admin/:id
───────────────────────────────────────────────────────────────── */
router.delete('/admin/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to delete book' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: POST /api/books/admin/fix-images
   One-time cleanup: clears all broken localhost image URLs from DB
   so books show a placeholder instead of CORS errors.
───────────────────────────────────────────────────────────────── */
router.post('/admin/fix-images', verifyToken, requireAdmin, async (req, res) => {
  try {
    const books = await Book.find({});
    let fixed = 0;
    for (const book of books) {
      let changed = false;
      // Clear cover if it points to localhost
      if (book.coverImage && book.coverImage.includes('localhost')) {
        book.coverImage = '';
        changed = true;
      }
      // Clear each preview that points to localhost
      if (book.previewImages && book.previewImages.length > 0) {
        const cleaned = book.previewImages.filter(img => !img.includes('localhost'));
        if (cleaned.length !== book.previewImages.length) {
          book.previewImages = cleaned;
          changed = true;
        }
      }
      if (changed) {
        await book.save();
        fixed++;
      }
    }
    res.json({ success: true, message: `Fixed ${fixed} book(s). Re-upload their cover images from the admin panel.` });
  } catch (e) {
    console.error('[POST /api/books/admin/fix-images]', e);
    res.status(500).json({ success: false, error: 'Failed to fix images' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: GET /api/books/admin/orders
───────────────────────────────────────────────────────────────── */
router.get('/admin/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const statusFilter = req.query.status;

    const query = statusFilter ? { status: statusFilter } : {};
    const [orders, total] = await Promise.all([
      BookOrder.find(query)
        .populate('userId', 'displayName email avatarUrl')
        .populate('bookId', 'title coverImage')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      BookOrder.countDocuments(query),
    ]);

    res.json({ success: true, orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   ADMIN: PUT /api/books/admin/orders/:id
───────────────────────────────────────────────────────────────── */
router.put('/admin/orders/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, adminNote, trackingNumber } = req.body;

    const existingOrder = await BookOrder.findById(req.params.id);
    if (!existingOrder) return res.status(404).json({ success: false, error: 'Order not found' });

    if (existingOrder.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cannot update a cancelled order.' });
    }

    const order = await BookOrder.findByIdAndUpdate(
      req.params.id,
      { status, adminNote, trackingNumber },
      { new: true }
    ).populate('userId', 'displayName email firebaseUid').populate('bookId', 'title');
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (status === 'cancelled' && existingOrder.status !== 'cancelled') {
      await User.findByIdAndUpdate(order.userId._id, { $inc: { walletBalance: order.coinCost } });
      if (order.transactionId) {
        await Transaction.findByIdAndUpdate(order.transactionId, { status: 'rejected' });
      }
      await Notification.create({
        userId: order.userId._id,
        type: 'book_order_cancelled',
        title: 'Order Cancelled',
        message: `Your order for "${order.bookId ? order.bookId.title : order.bookTitle}" was cancelled and ${order.coinCost.toLocaleString()} coins have been refunded.`,
        metadata: { orderId: order._id }
      });
    } else if (existingOrder.status !== status || existingOrder.adminNote !== adminNote || existingOrder.trackingNumber !== trackingNumber) {
      await Notification.create({
        userId: order.userId._id,
        type: 'book_order_updated',
        title: 'Order Updated',
        message: `There is an update on your order for "${order.bookId ? order.bookId.title : order.bookTitle}". Status: ${status}`,
        metadata: { orderId: order._id }
      });
    }

    const { emitToUser } = require('../utils/walletEvents');
    if (order.userId.firebaseUid) {
      emitToUser(order.userId.firebaseUid, 'bookOrderUpdated', {
        orderId: order._id,
        bookId: order.bookId ? order.bookId._id : null,
        status: order.status
      });
    }

    if (status === 'delivered' && order.transactionId) {
      await Transaction.findByIdAndUpdate(order.transactionId, { status: 'completed' });
    }

    res.json({ success: true, order });
  } catch (e) {
    console.error('[PUT /api/books/admin/orders/:id]', e);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

module.exports = router;

