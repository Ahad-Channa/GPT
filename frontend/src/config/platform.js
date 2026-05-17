// ─── Platform Currency Configuration ───────────────────────────
// Change CURRENCY_NAME here and it updates across the entire UI.
// Replace with the final name once the client decides.

export const CURRENCY_NAME  = '';    // Kept for backward compatibility
export const CURRENCY_SHORT = '';    
export const CURRENCY_SYMBOL = '';   

// Formatting helper — e.g. formatCoins(1500) => "1,500"
export const formatCoins = (amount, compact = false) => {
  const n = Number(amount) || 0;
  if (compact && n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return `${n.toLocaleString()}`;
};
