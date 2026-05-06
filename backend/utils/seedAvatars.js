/**
 * seedAvatars.js
 * One-time script: imports all existing image files from frontend/public/avatars/
 * into MongoDB as free avatars (if they don't already exist).
 *
 * Usage (run from the backend/ directory):
 *   node utils/seedAvatars.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Avatar = require('../models/Avatar');

const AVATARS_DIR = path.join(__dirname, '../../frontend/public/avatars');
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

async function seed() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<username>')) {
    console.error('❌ MONGODB_URI not set or is a placeholder. Check your .env file.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const files = fs.readdirSync(AVATARS_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTS.includes(ext);
  });

  console.log(`📁 Found ${files.length} image file(s) in /public/avatars/`);

  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const url = `/avatars/${file}`;
    const exists = await Avatar.findOne({ url });

    if (exists) {
      console.log(`  ⏭  Skipped (already in DB): ${file}`);
      skipped++;
      continue;
    }

    // Generate a friendly name from the filename
    const baseName = path.basename(file, path.extname(file));
    const friendlyName = baseName
      .replace(/[-_]/g, ' ')
      .replace(/\d+$/, match => ` ${match}`)  // separate trailing numbers
      .replace(/\b\w/g, c => c.toUpperCase())  // title case
      .trim();

    await Avatar.create({
      name: friendlyName,
      url,
      isPremium: false,
      price: 0,
    });

    console.log(`  ✅ Imported: ${file} → "${friendlyName}"`);
    created++;
  }

  console.log(`\n🎉 Done! ${created} avatar(s) imported, ${skipped} skipped.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
