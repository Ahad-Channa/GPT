const mongoose = require('mongoose');

const canAttemptMongoTransaction = () =>
  mongoose.connection.readyState === 1 && typeof mongoose.startSession === 'function';

const runAtomic = async (operation, options = {}) => {
  if (typeof options.runInTransaction === 'function') {
    return options.runInTransaction(operation);
  }

  if (!canAttemptMongoTransaction()) {
    return operation({ session: null, strategy: 'fallback' });
  }

  const session = await mongoose.startSession();
  try {
    let value;
    await session.withTransaction(async () => {
      value = await operation({ session, strategy: 'transaction' });
    });
    return value;
  } catch (error) {
    if (error?.code === 20 || /Transaction numbers are only allowed|replica set member|Transaction/i.test(error?.message || '')) {
      return operation({ session: null, strategy: 'fallback' });
    }
    throw error;
  } finally {
    await session.endSession();
  }
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
  runAtomic,
  withSession,
};
