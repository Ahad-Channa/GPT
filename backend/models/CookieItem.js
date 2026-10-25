const mongoose = require('mongoose');

const DEFAULT_COOKIES = [
  {
    name: 'firebase:authUser:...',
    provider: 'TaskMint / Firebase',
    category: 'essential',
    duration: 'Persistent until logout',
    description_en: 'Keeps the user logged in securely. Without this, user authentication cannot function.',
    description_de: 'Ermöglicht die sichere Anmeldung und Sitzungsverwaltung. Ohne diese Daten ist kein Login möglich.',
    isDefault: true,
    isActive: true,
    order: 1,
  },
  {
    name: 'twoFactorToken',
    provider: 'TaskMint',
    category: 'essential',
    duration: 'Session only',
    description_en: 'Temporary security token used to verify 2-Factor Authentication (2FA) during login.',
    description_de: 'Temporäres Sicherheitstoken zur Verifizierung der Zwei-Faktor-Authentifizierung (2FA).',
    isDefault: true,
    isActive: true,
    order: 2,
  },
  {
    name: 'taskmint_cookie_consent',
    provider: 'TaskMint',
    category: 'essential',
    duration: '12 months',
    description_en: 'Stores your cookie consent preferences so the consent banner does not reappear on every page visit.',
    description_de: 'Speichert Ihre getroffenen Cookie-Einwilligungen, damit das Banner nicht bei jedem Seitenaufruf erneut erscheint.',
    isDefault: true,
    isActive: true,
    order: 3,
  },
  {
    name: '__tm_did',
    provider: 'TaskMint',
    category: 'essential',
    duration: '12 months',
    description_en: 'Cryptographically secure device identifier used for fraud prevention, multi-account abuse detection, and account protection.',
    description_de: 'Kryptografisch sichere Gerätekennung zur Betrugsprävention, Erkennung unzulässiger Mehrfachkonten und zum Kontoschutz.',
    isDefault: true,
    isActive: true,
    order: 4,
  },
  {
    name: 'taskmint_theme',
    provider: 'TaskMint',
    category: 'functional',
    duration: 'Persistent',
    description_en: 'Remembers whether you selected Dark Mode or Light Mode theme.',
    description_de: 'Speichert, ob Sie den Dark Mode oder Light Mode als Farbschema gewählt haben.',
    isDefault: true,
    isActive: true,
    order: 4,
  },
  {
    name: 'i18nextLng',
    provider: 'TaskMint',
    category: 'functional',
    duration: 'Persistent',
    description_en: 'Remembers your preferred language selection (English or German).',
    description_de: 'Speichert Ihre bevorzugte Spracheinstellung (Deutsch oder Englisch).',
    isDefault: true,
    isActive: true,
    order: 5,
  },
  {
    name: 'chatOpen',
    provider: 'TaskMint',
    category: 'functional',
    duration: 'Persistent',
    description_en: 'Remembers whether the community chat sidebar is open or minimized.',
    description_de: 'Speichert, ob die Community-Chatleiste geöffnet oder minimiert ist.',
    isDefault: true,
    isActive: true,
    order: 6,
  },
  {
    name: 'ref',
    provider: 'TaskMint',
    category: 'marketing',
    duration: '30 days',
    description_en: 'Stores the inviter referral code from an affiliate link to ensure proper credit for signup bonuses.',
    description_de: 'Speichert den Empfehlungscode eines Affiliate-Links, um Empfehlungsprämien bei der Registrierung korrekt zuzuordnen.',
    isDefault: true,
    isActive: true,
    order: 7,
  },
];

const cookieItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      default: 'TaskMint',
    },
    category: {
      type: String,
      required: true,
      enum: ['essential', 'functional', 'marketing'],
      default: 'essential',
      index: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
      default: 'Persistent',
    },
    description_en: {
      type: String,
      required: true,
      trim: true,
      default: '',
    },
    description_de: {
      type: String,
      required: true,
      trim: true,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Static method to ensure default cookies exist
cookieItemSchema.statics.getOrSeedAll = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(DEFAULT_COOKIES);
  } else {
    // Automatically seed any missing default cookies (like __tm_did)
    for (const def of DEFAULT_COOKIES) {
      const exists = await this.findOne({ name: def.name });
      if (!exists) {
        await this.create(def);
      }
    }
  }
  return this.find({}).sort({ order: 1, createdAt: 1 });
};

module.exports = mongoose.model('CookieItem', cookieItemSchema);
