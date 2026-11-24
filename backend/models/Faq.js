const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    // Translations
    questionDe: { type: String, default: '' },
    answerDe: { type: String, default: '' },
    questionUr: { type: String, default: '' },
    answerUr: { type: String, default: '' },
    questionFr: { type: String, default: '' },
    answerFr: { type: String, default: '' },
    questionEs: { type: String, default: '' },
    answerEs: { type: String, default: '' },
    questionRu: { type: String, default: '' },
    answerRu: { type: String, default: '' },
    questionPt: { type: String, default: '' },
    answerPt: { type: String, default: '' },
    questionIt: { type: String, default: '' },
    answerIt: { type: String, default: '' },
    questionPl: { type: String, default: '' },
    answerPl: { type: String, default: '' },
    questionTr: { type: String, default: '' },
    answerTr: { type: String, default: '' },

    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Faq', faqSchema);
