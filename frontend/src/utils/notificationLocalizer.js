/**
 * Utility to localize notification titles, messages, and links
 * dynamically based on the current active language (e.g., 'de' or 'en').
 */

// ─── URDU LOCALIZATION ───
export function localizeUrdu(rawTitle, rawMessage, rawMetadata = {}) {
  let title = rawTitle || '';
  let message = rawMessage || '';
  let metadata = rawMetadata ? { ...rawMetadata } : {};
  let m;

  // ─── 1. TITLE LOCALIZATION (Urdu) ───
  if ((m = title.match(/^🎉\s*You reached (.*?)!$/i))) {
    title = `🎉 آپ ${m[1]} پر پہنچ گئے!`;
  } else if (/^Offer Approved & Held/i.test(title)) {
    title = 'پیشکش منظور اور ہولڈ پر';
  } else if (/^Proof Approved/i.test(title)) {
    title = 'ثبوت منظور ہوگیا';
  } else if (/^Custom Offer Approved!?/i.test(title)) {
    title = 'کسٹم پیشکش منظور ہوگئی!';
  } else if (/^Offer Approved/i.test(title)) {
    title = 'پیشکش منظور ہوگئی';
  } else if (/^Proof Rejected/i.test(title)) {
    title = 'ثبوت مسترد کر دیا گیا';
  } else if (/^Custom Offer Rejected/i.test(title) || /^Offer Rejected/i.test(title)) {
    title = 'پیشکش مسترد کر دی گئی';
  } else if (/^Withdrawal Approved!?/i.test(title)) {
    title = 'رقم نکلوانے کی درخواست منظور ہوگئی!';
  } else if (/^Withdrawal Rejected/i.test(title)) {
    title = 'رقم نکلوانے کی درخواست مسترد کر دی گئی';
  } else if (/^Offer Chargeback(ed)?/i.test(title) || /^Transaction Reversed/i.test(title)) {
    title = 'رقم کی واپسی / منسوخی (Chargeback)';
  } else if (/^VIP Bonus Claimed!?/i.test(title)) {
    title = 'وی آئی پی بونس وصول کر لیا گیا!';
  } else if (/^Balance Adjustment/i.test(title)) {
    title = 'بیلنس میں تبدیلی';
  } else if (/^Account Suspended/i.test(title)) {
    title = 'اکاؤنٹ معطل کر دیا گیا';
  } else if (/^Offer Credited/i.test(title)) {
    title = 'پیشکش کا کریڈٹ مل گیا';
  } else if (/^Offer Reward on Hold/i.test(title)) {
    title = 'پیشکش کا انعام ہولڈ پر ہے';
  } else if (/^🎉\s*Offer Completed!?/i.test(title)) {
    title = '🎉 پیشکش مکمل ہوگئی!';
  } else if (/^Referral Funds Released!?/i.test(title)) {
    title = 'ریفرل فنڈز جاری کر دیے گئے!';
  } else if (/^Held Earnings Released!?/i.test(title) || /^Earning Hold Released!?/i.test(title)) {
    title = 'روکی ہوئی کمائی جاری کر دی گئی!';
  } else if (/^Referral Bonus Credited!?/i.test(title)) {
    title = 'ریفرل بونس کریڈٹ ہوگیا!';
  } else if (/^Referral Earning Pending!?/i.test(title)) {
    title = 'ریفرل کمائی زیر التواء ہے!';
  } else if (/^Referral Earning!?/i.test(title)) {
    title = 'ریفرل کمائی!';
  } else if (/^Referral Signup Bonus!?/i.test(title)) {
    title = 'ریفرل سائن اپ بونس!';
  } else if (/^New Referral!?/i.test(title)) {
    title = 'نیا ریفرل!';
  } else if (/^Welcome!?/i.test(title)) {
    title = 'خوش آمدید!';
  } else if (/^Claim Your Daily Bonus!?/i.test(title)) {
    title = 'اپنا روزانہ بونس وصول کریں!';
  } else if (/^Streak Expiring Soon/i.test(title)) {
    title = 'سٹریک جلد ختم ہونے والی ہے';
  } else if (/^Order Placed/i.test(title)) {
    title = 'آرڈر درج کر دیا گیا';
  } else if (/^Order Cancelled/i.test(title)) {
    title = 'آرڈر منسوخ کر دیا گیا';
  } else if (/^Order Updated/i.test(title)) {
    title = 'آرڈر اپ ڈیٹ کر دیا گیا';
  } else if (/^Leaderboard Reward/i.test(title)) {
    title = 'لیڈر بورڈ انعام';
  }

  // ─── 2. MESSAGE LOCALIZATION (Urdu) ───

  // VIP Status Level Up
  if ((m = message.match(/^Congratulations!\s*You(?:'ve|\s*have)\s*reached\s+(.*?)\s+VIP\s*status\.\s*Check your progress on the (?:VIP page|VIP Seite|وی آئی پی پیج)\.?$/i))) {
    message = `مبارک ہو! آپ ${m[1]} وی آئی پی اسٹیٹس پر پہنچ چکے ہیں۔ وی آئی پی پیج پر اپنی پیشرفت چیک کریں۔`;
    metadata.linkText = 'وی آئی پی پیج';
  } else if ((m = message.match(/^Congratulations!\s*You(?:'ve|\s*have)\s*reached\s+(.*?)\s+VIP\s*status\.\s*Claim your\s+([\d,.]+)\s+coin bonus on the (?:VIP page|VIP Seite|وی آئی پی پیج)\.?$/i))) {
    message = `مبارک ہو! آپ ${m[1]} وی آئی پی اسٹیٹس پر پہنچ چکے ہیں۔ وی آئی پی پیج پر اپنا ${m[2]} کوائنز کا بونس کلیم کریں۔`;
    metadata.linkText = 'وی آئی پی پیج';
  } else if ((m = message.match(/^🎉\s*You reached\s+(.*?)!\s*Claim your\s+([\d,.]+)\s+coin bonus on the (?:VIP page|VIP Seite|وی آئی پی پیج)\.?$/i))) {
    message = `🎉 آپ ${m[1]} پر پہنچ گئے! وی آئی پی پیج پر اپنا ${m[2]} کوائنز کا بونس کلیم کریں۔`;
    metadata.linkText = 'وی آئی پی پیج';
  } else if ((m = message.match(/^🎉\s*You reached\s+(.*?)\s+VIP status!\s*Check your progress on the (?:VIP page|VIP Seite|وی آئی پی پیج)\.?$/i))) {
    message = `🎉 آپ ${m[1]} وی آئی پی اسٹیٹس پر پہنچ گئے! وی آئی پی پیج پر اپنی پیشرفت دیکھیں۔`;
    metadata.linkText = 'وی آئی پی پیج';
  } else if ((m = message.match(/^You claimed\s+([\d,.]+)\s+coins for reaching\s+(.*?)\.?$/i))) {
    message = `آپ نے ${m[2]} حاصل کرنے پر ${m[1]} کوائنز کلیم کیے۔`;
  }

  // Offer Approved
  else if ((m = message.match(/^Your proof for\s*["'„](.*?)["'“]\s*was approved!\s*\+([\d,.]+)\s*coins\.?$/i))) {
    message = `"${m[1]}" کے لیے آپ کا ثبوت منظور ہو گیا! +${m[2]} کوائنز۔`;
  } else if ((m = message.match(/^Your manual proof for\s*["'„](.*?)["'“]\s*was approved!\s*\+([\d,.]+)\s*coins\.?$/i))) {
    message = `"${m[1]}" کے لیے آپ کا دستی ثبوت منظور ہو گیا! +${m[2]} کوائنز۔`;
  } else if ((m = message.match(/^Your submission for\s*['"„](.*?)['"“]\s*was approved!\s*\+([\d,.]+)\s*coins placed on hold for\s*(\d+)\s*days\.?$/i))) {
    message = `"${m[1]}" کے لیے آپ کی جمع کرائی گئی پیشکش منظور ہوگئی! +${m[2]} کوائنز ${m[3]} دنوں کے لیے ہولڈ پر رکھ دیے گئے ہیں۔`;
  } else if ((m = message.match(/^Your submission for\s*['"„](.*?)['"“]\s*was approved!\s*\+([\d,.]+)\s*coins\.?$/i))) {
    message = `"${m[1]}" کے لیے آپ کی جمع کرائی گئی پیشکش منظور ہوگئی! +${m[2]} کوائنز۔`;
  }

  // Offer Rejected
  else if ((m = message.match(/^Your proof for\s*["'„](.*?)["'“]\s*was rejected\.\s*Reason:\s*(.*)$/i))) {
    message = `"${m[1]}" کے لیے آپ کا ثبوت مسترد کر دیا گیا۔ وجہ: ${m[2]}`;
  } else if ((m = message.match(/^Your manual proof for\s*["'„](.*?)["'“]\s*was rejected\.\s*Reason:\s*(.*)$/i))) {
    message = `"${m[1]}" کے لیے آپ کا دستی ثبوت مسترد کر دیا گیا۔ وجہ: ${m[2]}`;
  } else if ((m = message.match(/^Your submission for\s*['"„](.*?)['"“]\s*was rejected\.(?:\s*Reason:\s*(.*))?$/i))) {
    message = `"${m[1]}" کے لیے آپ کی جمع کرائی گئی پیشکش مسترد کر دی گئی۔${m[2] ? ' وجہ: ' + m[2] : ''}`;
  }

  // Withdrawals
  else if ((m = message.match(/^Your payout of\s*([\d,.]+)\s*coins has been approved\.?$/i))) {
    message = `آپ کی ${m[1]} کوائنز نکلوانے کی درخواست منظور ہو گئی ہے۔`;
  } else if ((m = message.match(/^Your withdrawal of\s*([\d,.]+)\s*coins was rejected\.\s*([\d,.]+)\s*coins refunded\.?$/i))) {
    message = `آپ کی ${m[1]} کوائنز نکلوانے کی درخواست مسترد کر دی گئی۔ ${m[2]} کوائنز واپس جمع کر دیے گئے۔`;
  }

  // Offer Rewards & Direct Offers
  else if ((m = message.match(/^You earned\s*\+([\d,.]+)\s*coins from\s*(.*?)\.?$/i))) {
    message = `آپ نے ${m[2]} سے +${m[1]} کوائنز کمائے۔`;
  } else if ((m = message.match(/^You earned\s*([\d,.]+)\s*coins from\s*["'„](.*?)["'“]\.?$/i))) {
    message = `آپ نے "${m[2]}" سے ${m[1]} کوائنز کمائے۔`;
  } else if ((m = message.match(/^You completed an offer from\s*(.*?)\s*for\s*\+([\d,.]+)\s*coins\.\s*The reward is placed on hold for\s*(\d+)\s*days\.?$/i))) {
    message = `آپ نے ${m[1]} سے +${m[2]} کوائنز کی پیشکش مکمل کی۔ انعام ${m[3]} دنوں کے لیے ہولڈ پر رکھ دیا گیا ہے۔`;
  }

  // Chargebacks / Reversals
  else if ((m = message.match(/^An offer was automatically reversed:\s*-([\d,.]+)\s*coins/i))) {
    message = `ایک پیشکش خودکار طریقے سے واپس کر دی گئی: -${m[1]} کوائنز`;
  } else if ((m = message.match(/^A transaction was reversed and\s*-([\d,.]+)\s*coins were deducted\.?$/i))) {
    message = `ایک ٹرانزیکشن منسوخ کر دی گئی اور -${m[1]} کوائنز کاٹ لیے گئے۔`;
  } else if ((m = message.match(/^A previously approved offer reward was charged back and\s*-([\d,.]+)\s*coins were deducted\.?$/i))) {
    message = `پہلے سے منظور شدہ پیشکش کا انعام واپس لے لیا گیا اور -${m[1]} کوائنز کاٹ لیے گئے۔`;
  }

  // Admin Adjustment & Account
  else if ((m = message.match(/^An admin has adjusted your balance by\s*(.*?)\s*coins\.\s*Reason:\s*(.*)$/i))) {
    message = `ایڈمن نے آپ کے بیلنس میں ${m[1]} کوائنز کی تبدیلی کی ہے۔ وجہ: ${m[2]}`;
  } else if (/^Your account has been suspended by an administrator\.?$/i.test(message)) {
    message = 'آپ کا اکاؤنٹ ایڈمنسٹریٹر نے معطل کر دیا ہے۔';
  }

  // Referral Holds & Releases
  else if ((m = message.match(/^Your held referral reward of\s*\+([\d,.]+)\s*coins is now available in your wallet!?$/i))) {
    message = `آپ کا روکا ہوا ریفرل انعام (+${m[1]} کوائنز) اب آپ کے والٹ میں دستیاب ہے!`;
  } else if ((m = message.match(/^Your held reward for\s*["'„](.*?)["'“]\s*has been released!\s*\+([\d,.]+)\s*coins have been credited to your wallet\.?$/i))) {
    message = `"${m[1]}" کے لیے آپ کا روکا ہوا انعام جاری کر دیا گیا ہے! +${m[2]} کوائنز آپ کے والٹ میں کریڈٹ کر دیے گئے ہیں۔`;
  } else if ((m = message.match(/^You earned\s*\+([\d,.]+)\s*coins from\s*(.*?)'s offer\.?$/i))) {
    message = `آپ نے ${m[2]} کی پیشکش سے +${m[1]} کوائنز کمائے۔`;
  } else if ((m = message.match(/^\+([\d,.]+)\s*bonus coins!\s*(.*?)\s*just completed their first offer!?$/i))) {
    message = `+${m[1]} بونس کوائنز! ${m[2]} نے ابھی اپنی پہلی پیشکش مکمل کی ہے!`;
  } else if ((m = message.match(/^\+([\d,.]+)\s*coins referral commission from\s*(.*?)\s*has been credited to your wallet\.?$/i))) {
    message = `${m[2]} سے +${m[1]} کوائنز کا ریفرل کمیشن آپ کے والٹ میں شامل کر دیا گیا ہے۔`;
  } else if ((m = message.match(/^\+([\d,.]+)\s*coins referral commission from\s*(.*?)\s*is on hold for\s*(\d+)\s*day\(s\)\.?$/i))) {
    message = `${m[2]} سے +${m[1]} کوائنز کا ریفرل کمیشن ${m[3]} دن کے لیے ہولڈ پر ہے۔`;
  } else if ((m = message.match(/^(.*?)\s*joined using your referral link!?$/i))) {
    message = `${m[1]} آپ کے ریفرل لنک کے ذریعے شامل ہوا!`;
  }

  // Welcome
  else if (/^Welcome to the platform! Start earning coins by completing tasks\.?$/i.test(message)) {
    message = 'پلیٹ فارم پر خوش آمدید! کام مکمل کر کے کوائنز کمانا شروع کریں۔';
  }

  // Streak Warning
  else if ((m = message.match(/^Your\s*(\d+)-day streak will reset in\s*(.*?)\s*\(midnight UTC\)\.\s*Complete offers and claim your daily reward before the day ends!?$/i))) {
    message = `آپ کی ${m[1]} دن کی سٹریک ${m[2]} (آدھی رات UTC) میں ختم ہو جائے گی۔ دن ختم ہونے سے پہلے پیشکشیں مکمل کریں اور اپنا روزانہ انعام حاصل کریں!`;
  }

  // Book Orders
  else if ((m = message.match(/^Your order for\s*["'„](.*?)["'“]\s*has been successfully placed\.?$/i))) {
    message = `"${m[1]}" کے لیے آپ کا آرڈر کامیابی سے جمع ہو گیا ہے۔`;
  } else if ((m = message.match(/^Your order for\s*["'„](.*?)["'“]\s*was cancelled and\s*([\d,.]+)\s*coins have been refunded\.?$/i))) {
    message = `"${m[1]}" کے لیے آپ کا آرڈر منسوخ کر دیا گیا ہے اور ${m[2]} کوائنز واپس کر دیے گئے ہیں۔`;
  } else if ((m = message.match(/^There is an update on your order for\s*["'„](.*?)["'“]\.\s*Status:\s*(.*)$/i))) {
    message = `"${m[1]}" کے آرڈر سے متعلق تازہ ترین معلومات: صورتحال: ${m[2]}`;
  }

  // Link normalization
  if (metadata.link && !metadata.linkText) {
    if (metadata.link.includes('vip')) metadata.linkText = 'وی آئی پی پیج';
  } else if (metadata.linkText === 'VIP page' || metadata.linkText === 'VIP Seite') {
    metadata.linkText = 'وی آئی پی پیج';
  }

  return { title, message, metadata };
}

export function localizeNotification(notif, lang = 'en') {
  if (!notif) return { title: '', message: '', metadata: notif?.metadata };

  const isDe = lang === 'de';
  const isUr = lang === 'ur';
  let title = notif.title || '';
  let message = notif.message || '';
  let metadata = notif.metadata ? { ...notif.metadata } : {};

  if (isUr) {
    if (metadata.link && !metadata.linkText) {
      if (metadata.link.includes('vip')) metadata.linkText = 'وی آئی پی پیج';
    }
    return localizeUrdu(title, message, metadata);
  }

  if (!isDe) {
    // English normalization if needed
    if (metadata.link && !metadata.linkText) {
      if (metadata.link.includes('vip')) metadata.linkText = 'VIP page';
    }
    return { title, message, metadata };
  }

  // ─── 1. TITLE LOCALIZATION (German) ───
  let m;

  if ((m = title.match(/^🎉\s*You reached (.*?)!$/i))) {
    title = `🎉 Du hast ${m[1]} erreicht!`;
  } else if (/^Offer Approved & Held/i.test(title)) {
    title = 'Angebot genehmigt & in Wartestellung';
  } else if (/^Proof Approved/i.test(title)) {
    title = 'Nachweis bestätigt';
  } else if (/^Custom Offer Approved!?/i.test(title)) {
    title = 'Angebot bestätigt!';
  } else if (/^Offer Approved/i.test(title)) {
    title = 'Angebot bestätigt';
  } else if (/^Proof Rejected/i.test(title)) {
    title = 'Nachweis abgelehnt';
  } else if (/^Custom Offer Rejected/i.test(title) || /^Offer Rejected/i.test(title)) {
    title = 'Angebot abgelehnt';
  } else if (/^Withdrawal Approved!?/i.test(title)) {
    title = 'Auszahlung genehmigt!';
  } else if (/^Withdrawal Rejected/i.test(title)) {
    title = 'Auszahlung abgelehnt';
  } else if (/^Offer Chargeback(ed)?/i.test(title) || /^Transaction Reversed/i.test(title)) {
    title = 'Rückbuchung';
  } else if (/^VIP Bonus Claimed!?/i.test(title)) {
    title = 'VIP-Bonus eingelöst!';
  } else if (/^Balance Adjustment/i.test(title)) {
    title = 'Guthaben Anpassung';
  } else if (/^Account Suspended/i.test(title)) {
    title = 'Konto gesperrt';
  } else if (/^Offer Credited/i.test(title)) {
    title = 'Angebot gutgeschrieben';
  } else if (/^Offer Reward on Hold/i.test(title)) {
    title = 'Angebotsbelohnung in Wartestellung';
  } else if (/^🎉\s*Offer Completed!?/i.test(title)) {
    title = '🎉 Angebot abgeschlossen!';
  } else if (/^Referral Funds Released!?/i.test(title)) {
    title = 'Empfehlungsguthaben freigegeben!';
  } else if (/^Held Earnings Released!?/i.test(title) || /^Earning Hold Released!?/i.test(title)) {
    title = 'Zurückgehaltene Einnahmen freigegeben!';
  } else if (/^Referral Bonus Credited!?/i.test(title)) {
    title = 'Empfehlungsbonus gutgeschrieben!';
  } else if (/^Referral Earning Pending!?/i.test(title)) {
    title = 'Empfehlungsbonus ausstehend!';
  } else if (/^Referral Earning!?/i.test(title)) {
    title = 'Empfehlungseinnahme!';
  } else if (/^Referral Signup Bonus!?/i.test(title)) {
    title = 'Empfehlungs-Anmeldebonus!';
  } else if (/^New Referral!?/i.test(title)) {
    title = 'Neue Empfehlung!';
  } else if (/^Welcome!?/i.test(title)) {
    title = 'Willkommen!';
  } else if (/^Claim Your Daily Bonus!?/i.test(title)) {
    title = 'Hole deinen täglichen Bonus ab!';
  } else if (/^Streak Expiring Soon/i.test(title)) {
    title = 'Serie läuft bald ab';
  } else if (/^Order Placed/i.test(title)) {
    title = 'Bestellung aufgegeben';
  } else if (/^Order Cancelled/i.test(title)) {
    title = 'Bestellung storniert';
  } else if (/^Order Updated/i.test(title)) {
    title = 'Bestellung aktualisiert';
  } else if (/^Leaderboard Reward/i.test(title)) {
    title = 'Bestenlisten Belohnung';
  }

  // ─── 2. MESSAGE LOCALIZATION (German) ───

  // VIP Status Level Up
  if ((m = message.match(/^Congratulations!\s*You(?:'ve|\s*have)\s*reached\s+(.*?)\s+VIP\s*status\.\s*Check your progress on the (?:VIP page|VIP Seite)\.?$/i))) {
    message = `Herzlichen Glückwunsch! Du hast den VIP-Status ${m[1]} erreicht. Sieh dir deinen Fortschritt auf der VIP Seite an.`;
    metadata.linkText = 'VIP Seite';
  } else if ((m = message.match(/^Congratulations!\s*You(?:'ve|\s*have)\s*reached\s+(.*?)\s+VIP\s*status\.\s*Claim your\s+([\d,.]+)\s+coin bonus on the (?:VIP page|VIP Seite)\.?$/i))) {
    message = `Herzlichen Glückwunsch! Du hast den VIP-Status ${m[1]} erreicht. Hole dir deinen Bonus von ${m[2]} Coins auf der VIP Seite ab.`;
    metadata.linkText = 'VIP Seite';
  } else if ((m = message.match(/^🎉\s*You reached\s+(.*?)!\s*Claim your\s+([\d,.]+)\s+coin bonus on the (?:VIP page|VIP Seite)\.?$/i))) {
    message = `🎉 Du hast ${m[1]} erreicht! Hole dir deinen Bonus von ${m[2]} Coins auf der VIP Seite ab.`;
    metadata.linkText = 'VIP Seite';
  } else if ((m = message.match(/^🎉\s*You reached\s+(.*?)\s+VIP status!\s*Check your progress on the (?:VIP page|VIP Seite)\.?$/i))) {
    message = `🎉 Du hast den VIP-Status ${m[1]} erreicht! Sieh dir deinen Fortschritt auf der VIP Seite an.`;
    metadata.linkText = 'VIP Seite';
  } else if ((m = message.match(/^You claimed\s+([\d,.]+)\s+coins for reaching\s+(.*?)\.?$/i))) {
    message = `Du hast ${m[1]} Coins für das Erreichen von ${m[2]} abgeholt.`;
  }

  // Offer Approved
  else if ((m = message.match(/^Your proof for\s*["'„](.*?)["'“]\s*was approved!\s*\+([\d,.]+)\s*coins\.?$/i))) {
    message = `Dein Nachweis für „${m[1]}“ wurde bestätigt! +${m[2]} Coins.`;
  } else if ((m = message.match(/^Your manual proof for\s*["'„](.*?)["'“]\s*was approved!\s*\+([\d,.]+)\s*coins\.?$/i))) {
    message = `Dein manueller Nachweis für „${m[1]}“ wurde bestätigt! +${m[2]} Coins.`;
  } else if ((m = message.match(/^Your submission for\s*['"„](.*?)['"“]\s*was approved!\s*\+([\d,.]+)\s*coins placed on hold for\s*(\d+)\s*days\.?$/i))) {
    message = `Deine Einreichung für „${m[1]}“ wurde bestätigt! +${m[2]} Coins für ${m[3]} Tage in Wartestellung.`;
  } else if ((m = message.match(/^Your submission for\s*['"„](.*?)['"“]\s*was approved!\s*\+([\d,.]+)\s*coins\.?$/i))) {
    message = `Deine Einreichung für „${m[1]}“ wurde bestätigt! +${m[2]} Coins.`;
  }

  // Offer Rejected
  else if ((m = message.match(/^Your proof for\s*["'„](.*?)["'“]\s*was rejected\.\s*Reason:\s*(.*)$/i))) {
    message = `Dein Nachweis für „${m[1]}“ wurde abgelehnt. Grund: ${m[2]}`;
  } else if ((m = message.match(/^Your manual proof for\s*["'„](.*?)["'“]\s*was rejected\.\s*Reason:\s*(.*)$/i))) {
    message = `Dein manueller Nachweis für „${m[1]}“ wurde abgelehnt. Grund: ${m[2]}`;
  } else if ((m = message.match(/^Your submission for\s*['"„](.*?)['"“]\s*was rejected\.(?:\s*Reason:\s*(.*))?$/i))) {
    message = `Deine Einreichung für „${m[1]}“ wurde abgelehnt.${m[2] ? ' Grund: ' + m[2] : ''}`;
  }

  // Withdrawals
  else if ((m = message.match(/^Your payout of\s*([\d,.]+)\s*coins has been approved\.?$/i))) {
    message = `Deine Auszahlung von ${m[1]} Coins wurde genehmigt.`;
  } else if ((m = message.match(/^Your withdrawal of\s*([\d,.]+)\s*coins was rejected\.\s*([\d,.]+)\s*coins refunded\.?$/i))) {
    message = `Deine Auszahlung von ${m[1]} Coins wurde abgelehnt. ${m[2]} Coins erstattet.`;
  }

  // Offer Rewards & Direct Offers
  else if ((m = message.match(/^You earned\s*\+([\d,.]+)\s*coins from\s*(.*?)\.?$/i))) {
    message = `Du hast +${m[1]} Coins von ${m[2]} verdient.`;
  } else if ((m = message.match(/^You earned\s*([\d,.]+)\s*coins from\s*["'„](.*?)["'“]\.?$/i))) {
    message = `Du hast ${m[1]} Coins von „${m[2]}“ verdient.`;
  } else if ((m = message.match(/^You completed an offer from\s*(.*?)\s*for\s*\+([\d,.]+)\s*coins\.\s*The reward is placed on hold for\s*(\d+)\s*days\.?$/i))) {
    message = `Du hast ein Angebot von ${m[1]} über +${m[2]} Coins abgeschlossen. Die Belohnung wird für ${m[3]} Tage zurückgehalten.`;
  }

  // Chargebacks / Reversals
  else if ((m = message.match(/^An offer was automatically reversed:\s*-([\d,.]+)\s*coins/i))) {
    message = `Ein Angebot wurde automatisch rückgebucht: -${m[1]} Coins`;
  } else if ((m = message.match(/^A transaction was reversed and\s*-([\d,.]+)\s*coins were deducted\.?$/i))) {
    message = `Eine Transaktion wurde rückgängig gemacht und -${m[1]} Coins wurden abgezogen.`;
  } else if ((m = message.match(/^A previously approved offer reward was charged back and\s*-([\d,.]+)\s*coins were deducted\.?$/i))) {
    message = `Eine zuvor bestätigte Angebotsbelohnung wurde storniert und -${m[1]} Coins wurden abgezogen.`;
  }

  // Admin Adjustment & Account
  else if ((m = message.match(/^An admin has adjusted your balance by\s*(.*?)\s*coins\.\s*Reason:\s*(.*)$/i))) {
    message = `Ein Administrator hat dein Guthaben um ${m[1]} Coins angepasst. Grund: ${m[2]}`;
  } else if (/^Your account has been suspended by an administrator\.?$/i.test(message)) {
    message = 'Dein Konto wurde von einem Administrator gesperrt.';
  }

  // Referral Holds & Releases
  else if ((m = message.match(/^Your held referral reward of\s*\+([\d,.]+)\s*coins is now available in your wallet!?$/i))) {
    message = `Deine gehaltene Empfehlungsbelohnung von +${m[1]} Coins ist jetzt in deinem Guthaben verfügbar!`;
  } else if ((m = message.match(/^Your held reward for\s*["'„](.*?)["'“]\s*has been released!\s*\+([\d,.]+)\s*coins have been credited to your wallet\.?$/i))) {
    message = `Deine gehaltene Belohnung für „${m[1]}“ wurde freigegeben! +${m[2]} Coins wurden deinem Guthaben gutgeschrieben.`;
  } else if ((m = message.match(/^You earned\s*\+([\d,.]+)\s*coins from\s*(.*?)'s offer\.?$/i))) {
    message = `Du hast +${m[1]} Coins durch das Angebot von ${m[2]} verdient.`;
  } else if ((m = message.match(/^\+([\d,.]+)\s*bonus coins!\s*(.*?)\s*just completed their first offer!?$/i))) {
    message = `+${m[1]} Bonus Coins! ${m[2]} hat gerade das erste Angebot abgeschlossen!`;
  } else if ((m = message.match(/^\+([\d,.]+)\s*coins referral commission from\s*(.*?)\s*has been credited to your wallet\.?$/i))) {
    message = `+${m[1]} Coins Empfehlungsprovision von ${m[2]} wurden deinem Guthaben gutgeschrieben.`;
  } else if ((m = message.match(/^\+([\d,.]+)\s*coins referral commission from\s*(.*?)\s*is on hold for\s*(\d+)\s*day\(s\)\.?$/i))) {
    message = `+${m[1]} Coins Empfehlungsprovision von ${m[2]} ist für ${m[3]} Tag(e) in Wartestellung.`;
  } else if ((m = message.match(/^(.*?)\s*joined using your referral link!?$/i))) {
    message = `${m[1]} hat sich über deinen Empfehlungslink angemeldet!`;
  }

  // Welcome
  else if (/^Welcome to the platform! Start earning coins by completing tasks\.?$/i.test(message)) {
    message = 'Willkommen auf der Plattform! Beginne mit dem Abschließen von Aufgaben, um Coins zu verdienen.';
  }

  // Streak Warning
  else if ((m = message.match(/^Your\s*(\d+)-day streak will reset in\s*(.*?)\s*\(midnight UTC\)\.\s*Complete offers and claim your daily reward before the day ends!?$/i))) {
    message = `Deine ${m[1]}-Tage-Serie wird in ${m[2]} (Mitternacht UTC) zurückgesetzt. Schließe Angebote ab und hole deine tägliche Belohnung ab!`;
  }

  // Book Orders
  else if ((m = message.match(/^Your order for\s*["'„](.*?)["'“]\s*has been successfully placed\.?$/i))) {
    message = `Deine Bestellung für „${m[1]}“ wurde erfolgreich aufgegeben.`;
  } else if ((m = message.match(/^Your order for\s*["'„](.*?)["'“]\s*was cancelled and\s*([\d,.]+)\s*coins have been refunded\.?$/i))) {
    message = `Deine Bestellung für „${m[1]}“ wurde storniert und ${m[2]} Coins wurden erstattet.`;
  } else if ((m = message.match(/^There is an update on your order for\s*["'„](.*?)["'“]\.\s*Status:\s*(.*)$/i))) {
    message = `Es gibt eine Aktualisierung zu deiner Bestellung für „${m[1]}“. Status: ${m[2]}`;
  }

  return { title, message, metadata };
}

