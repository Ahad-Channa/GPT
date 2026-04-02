// ─── Platform Currency Configuration ───────────────────────────
// Change CURRENCY_NAME here and it updates across the entire UI.
// Replace with the final name once the client decides.

export const CURRENCY_NAME  = 'Coins';    // Full name  e.g. "Coins", "Points", "Stars"
export const CURRENCY_SHORT = 'C';        // Abbreviated unit shown in tight spaces
export const CURRENCY_SYMBOL = '🪙';      // Optional emoji representation

// Formatting helper — e.g. formatCoins(1500) => "1,500 Coins"
export const formatCoins = (amount, compact = false) => {
  const n = Number(amount) || 0;
  if (compact && n >= 1000) {
    return `${(n / 1000).toFixed(1)}k ${CURRENCY_SHORT}`;
  }
  return `${n.toLocaleString()} ${CURRENCY_NAME}`;
};
