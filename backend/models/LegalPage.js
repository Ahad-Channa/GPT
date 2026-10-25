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
    });
  } else if (!page.content_en && !page.content_de) {
    // If empty record was previously created, populate with template
    page.title_en = page.title_en || template.title_en || '';
    page.content_en = page.content_en || template.content_en || '';
    page.title_de = page.title_de || template.title_de || '';
    page.content_de = page.content_de || template.content_de || '';
    await page.save();
  } else if (slug === 'cookie-policy' && (!page.content_en.includes('__tm_did') || !page.content_de.includes('__tm_did'))) {
    // Automatically inject the updated cookie policy with __tm_did device identifier
    page.content_en = template.content_en;
    page.content_de = template.content_de;
    page.title_en = template.title_en || page.title_en;
    page.title_de = template.title_de || page.title_de;
    await page.save();
  }
  return page;
};

module.exports = mongoose.model('LegalPage', legalPageSchema);
