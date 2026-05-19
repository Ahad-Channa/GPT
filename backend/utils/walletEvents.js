/**
 * walletEvents.js
 * ───────────────
 * Keeps a live map of   firebaseUid  →  Set<socket>
 * and exposes helpers used by every route that credits coins.
 */

/** @type {Map<string, Set<import('socket.io').Socket>>} */
const userSockets = new Map();

/**
 * Register a socket for a given Firebase UID.
 * Called from server.js when the client emits 'identify'.
 */
function registerSocket(firebaseUid, socket) {
  if (!userSockets.has(firebaseUid)) {
    userSockets.set(firebaseUid, new Set());
  }
  userSockets.get(firebaseUid).add(socket);

  socket.on('disconnect', () => {
    const sockets = userSockets.get(firebaseUid);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) userSockets.delete(firebaseUid);
    }
  });
}

/**
 * Push a balance update to all open tabs for a user.
 * @param {string} firebaseUid
 * @param {number} newBalance
 */
function emitWalletUpdate(firebaseUid, newBalance) {
  const sockets = userSockets.get(firebaseUid);
  if (!sockets || sockets.size === 0) return;
  for (const socket of sockets) {
    socket.emit('walletUpdate', { walletBalance: newBalance });
  }
}

module.exports = { registerSocket, emitWalletUpdate };
