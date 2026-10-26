const mongoose = require('mongoose');
const { LEGAL_TEMPLATES } = require('./legalTemplates');

const legalPageSchema = new mongoose.Schema(
  {
    // Unique slug: 'impressum', 'terms-of-use', 'privacy-policy'
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ['impressum', 'terms-of-use', 'privacy-policy', 'affiliate-policy', 'cookie-policy'],
    },
    // English content
    title_en: {
      type: String,
      default: '',
    },
    content_en: {
      type: String,
      default: '',
    },
    // German content
    title_de: {
      type: String,
      default: '',
    },
    content_de: {
      type: String,
      default: '',
    },
    // Urdu content
    title_ur: {
      type: String,
      default: '',
    },
    content_ur: {
      type: String,
      default: '',
    },
    // Last edited by (admin user ID)
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Static: get or create a legal page by slug with default templates
legalPageSchema.statics.getBySlug = async function (slug) {
  let page = await this.findOne({ slug });
  const template = LEGAL_TEMPLATES[slug] || {};

  if (!page) {
    page = await this.create({
      slug,
      title_en: template.title_en || '',
      content_en: template.content_en || '',
      title_de: template.title_de || '',
      content_de: template.content_de || '',
      title_ur: template.title_ur || '',
      content_ur: template.content_ur || '',
    });
  } else {
    let changed = false;
    if (!page.content_en && !page.content_de) {
      // If empty record was previously created, populate with template
      page.title_en = page.title_en || template.title_en || '';
      page.content_en = page.content_en || template.content_en || '';
      page.title_de = page.title_de || template.title_de || '';
      page.content_de = page.content_de || template.content_de || '';
      changed = true;
    }
    if (!page.content_ur && template.content_ur) {
      page.title_ur = template.title_ur || '';
      page.content_ur = template.content_ur || '';
      changed = true;
    }
    if (slug === 'cookie-policy' && (!page.content_en.includes('__tm_did') || !page.content_de.includes('__tm_did'))) {
      page.content_en = template.content_en;
      page.content_de = template.content_de;
      page.title_en = template.title_en || page.title_en;
      page.title_de = template.title_de || page.title_de;
      if (!page.content_ur && template.content_ur) {
        page.title_ur = template.title_ur;
        page.content_ur = template.content_ur;
      }
      changed = true;
    }
    if (changed) {
      await page.save();
    }
  }
  return page;
};

module.exports = mongoose.model('LegalPage', legalPageSchema);
