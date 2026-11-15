const clean = (value) => String(value ?? '').trim();

const looksMachineStyle = (value) => {
  if (value.includes('_')) return true;
  // Hyphenated machine IDs (fight-20-battles) usually contain digits. Do not
  // touch brand-style hyphens such as "Coca-Cola".
  return /^[^\s]+$/.test(value) && /\d/.test(value) && value.includes('-');
};

// Display-only humanizer for goal/event labels. Stored goal keys, event IDs and
// transaction metadata must never be mutated.
const humanizeDisplayLabel = (value) => {
  const raw = clean(value);
  if (!raw || !looksMachineStyle(raw)) return raw;

  return raw
    .replace(/_+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
};

// Replaces only machine-style tokens inside a sentence, preserving normal text
// casing and punctuation. Used as a fallback for already-stored messages.
const humanizeMachineTokensInText = (value) => {
  const text = String(value ?? '');
  return text.replace(/\b[a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)+\b/g, (token) => humanizeDisplayLabel(token));
};

module.exports = { humanizeDisplayLabel, humanizeMachineTokensInText };
