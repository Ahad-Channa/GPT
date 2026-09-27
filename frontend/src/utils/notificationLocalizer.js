/**
 * Utility to localize notification titles, messages, and links
 * dynamically based on the current active language (e.g., 'de' or 'en').
 */

export function localizeNotification(notif, lang = 'en') {
  if (!notif) return { title: '', message: '', metadata: notif?.metadata };

  const isDe = lang === 'de';
  let title = notif.title || '';
  let message = notif.message || '';
  let metadata = notif.metadata ? { ...notif.metadata } : {};

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
