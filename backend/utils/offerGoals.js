// Optional multi-step / goal support for direct offers.
//
// Backward compatibility rules:
//   * No goals configured  -> existing single-reward behavior is untouched.
//   * Goals configured     -> the postback `eventType` selects the goal and the
//                             reward amount comes from the trusted click-time snapshot.
//   * Unknown/disabled goal -> never rewarded.
//   * A goal rewards at most once per (provider transaction, goalKey).

const GOAL_KEY_RE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const MAX_LABEL_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_GOALS = 25;

const toSafeAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
};

// Display-only goal time in days. Optional: blank/absent -> null. When present
// it must be a positive integer; anything else is rejected (HTTP 400). This is
// the authoritative validation layer (not the Mongoose `min` rule, which would
// still accept decimals). It drives a visual label only — no expiry/enforcement.
const parseTimeLimitDays = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    const error = new Error('Goal time (days) must be a positive integer.');
    error.statusCode = 400;
    throw error;
  }
  return num;
};

// Normalizes admin-provided goals for storage on a DirectOffer.
const normalizeGoals = (goals) => {
  if (!Array.isArray(goals)) return [];

  const seen = new Set();
  const normalized = [];

  for (const raw of goals) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;

    const goalKey = String(raw.goalKey || raw.key || '').trim();
    if (!GOAL_KEY_RE.test(goalKey)) continue;

    const dedupeKey = goalKey.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    const rewardAmount = toSafeAmount(raw.rewardAmount);
    if (rewardAmount === null) continue;

    seen.add(dedupeKey);
    normalized.push({
      goalKey,
      label: String(raw.label || raw.title || goalKey).trim().slice(0, MAX_LABEL_LENGTH) || goalKey,
      labelDe: String(raw.labelDe || raw.titleDe || '').trim().slice(0, MAX_LABEL_LENGTH),
      description: String(raw.description || '').trim().slice(0, MAX_DESCRIPTION_LENGTH),
      descriptionDe: String(raw.descriptionDe || '').trim().slice(0, MAX_DESCRIPTION_LENGTH),
      rewardAmount,
      payoutAmount: toSafeAmount(raw.payoutAmount) || 0,
      timeLimitDays: parseTimeLimitDays(raw.timeLimitDays),
      enabled: raw.enabled === undefined ? true : Boolean(raw.enabled),
    });

    if (normalized.length >= MAX_GOALS) break;
  }

  return normalized;
};

const getEnabledGoals = (goals) => (Array.isArray(goals) ? goals : []).filter((goal) => goal && goal.enabled !== false);

// Immutable click-time snapshot of enabled goals. Returns null when the offer has
// no enabled goals so single-step offers keep storing exactly what they did before.
const buildGoalsSnapshot = (goals) => {
  const enabled = getEnabledGoals(goals);
  if (!enabled.length) return null;

  const snapshot = {};
  for (const goal of enabled) {
    const amount = toSafeAmount(goal.rewardAmount);
    if (amount === null) continue;
    snapshot[goal.goalKey] = {
      amount,
      payoutAmount: toSafeAmount(goal.payoutAmount) || 0,
      label: goal.label || goal.goalKey,
    };
  }

  return Object.keys(snapshot).length ? snapshot : null;
};

// Resolves the reward for a postback against the trusted click-time snapshot.
const resolveGoal = ({ goalsSnapshot, eventType } = {}) => {
  const hasGoals = Boolean(goalsSnapshot && Object.keys(goalsSnapshot).length);
  if (!hasGoals) {
    return { hasGoals: false, matched: true, goalKey: null, amount: null, payoutAmount: 0, reason: '' };
  }

  const goalKey = String(eventType || '').trim();
  const goal = goalsSnapshot[goalKey];
  if (!goal) {
    return {
      hasGoals: true,
      matched: false,
      goalKey: goalKey || null,
      amount: null,
      payoutAmount: 0,
      reason: 'Unknown or disabled goal.',
    };
  }

  return {
    hasGoals: true,
    matched: true,
    goalKey,
    amount: Number(goal.amount),
    payoutAmount: Number(goal.payoutAmount) || 0,
    label: goal.label || goalKey,
    reason: '',
  };
};

module.exports = {
  GOAL_KEY_RE,
  buildGoalsSnapshot,
  getEnabledGoals,
  normalizeGoals,
  parseTimeLimitDays,
  resolveGoal,
};
