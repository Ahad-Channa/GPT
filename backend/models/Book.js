const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },       // URL to cover image
    previewImages: { type: [String], default: [] },  // up to 5 preview page URLs
    coinCost: { type: Number, required: true, min: 1 },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Book', bookSchema);
