const mongoose = require('mongoose');

const offerwallWebhookReceiptSchema = new mongoose.Schema(
  {
    providerId: { type: String, required: true, trim: true, lowercase: true },
    webhookId: { type: String, required: true, trim: true, maxlength: 200 },
    event: { type: String, required: true, enum: ['approved', 'pending', 'rejected'] },
    transactionId: { type: String, default: '', trim: true, maxlength: 160 },
    receivedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

offerwallWebhookReceiptSchema.index({ providerId: 1, webhookId: 1 }, { unique: true });

module.exports =
  mongoose.models.OfferwallWebhookReceipt ||
  mongoose.model('OfferwallWebhookReceipt', offerwallWebhookReceiptSchema);
