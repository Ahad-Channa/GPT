const mongoose = require('mongoose');

const bookOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    bookTitle: { type: String, required: true },
    coinCost: { type: Number, required: true },
    // Shipping details
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    zipcode: { type: String, required: true },
    // Signature
    wantsSignature: { type: Boolean, default: false },
    signatureName: { type: String, default: '' },
    // Order status: pending → shipped → delivered | cancelled
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    // Admin notes / tracking
    adminNote: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    // Link to the wallet transaction
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BookOrder', bookOrderSchema);
