const mongoose = require('mongoose');

const canAttemptMongoTransaction = () =>
  mongoose.connection.readyState === 1 && typeof mongoose.startSession === 'function';

const isUnsupportedTransactionError = (error) =>
  error?.code === 20 ||
  error?.codeName === 'IllegalOperation' ||
  /Transaction numbers are only allowed on a replica set member or mongos/i.test(error?.message || '') ||
  /This MongoDB deployment does not support retryable writes/i.test(error?.message || '');

const isTransientTransactionError = (error) =>
  typeof error?.hasErrorLabel === 'function' && (
    error.hasErrorLabel('TransientTransactionError') ||
    error.hasErrorLabel('UnknownTransactionCommitResult')
  );

const runAtomic = async (operation, options = {}) => {
  if (typeof options.runInTransaction === 'function') {
    return options.runInTransaction(operation);
  }

  if (!options.forceTransactionAttempt && !canAttemptMongoTransaction()) {
    return operation({ session: null, strategy: 'fallback' });
  }

  const maxAttempts = options.transactionAttempts || 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let value;
      await session.withTransaction(async () => {
        value = await operation({ session, strategy: 'transaction' });
      });
      return value;
    } catch (error) {
      if (isUnsupportedTransactionError(error)) {
        return operation({ session: null, strategy: 'fallback' });
      }
      if (isTransientTransactionError(error) && attempt < maxAttempts) {
        continue;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
  return operation({ session: null, strategy: 'fallback' });
};

const withSession = (query, session) =>
  session && query && typeof query.session === 'function' ? query.session(session) : query;

const createOne = async (model, payload, session) => {
  if (session && typeof model.create === 'function') {
    const docs = await model.create([payload], { session });
    return docs[0];
  }
  return model.create(payload);
};

module.exports = {
  canAttemptMongoTransaction,
  createOne,
  isTransientTransactionError,
  isUnsupportedTransactionError,
  runAtomic,
  withSession,
};
