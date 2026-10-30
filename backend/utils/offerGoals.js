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
const MAX_EVENT_VALUE_LENGTH = 120;
const MAX_EVENT_ALIASES = 20;
const MAX_GOALS = 25;

const normalizeEventValue = (value) => String(value || '').trim().replace(/\s+/g, ' ');

// Safe fallback comparison: trims, lowercases and collapses internal whitespace.
// No fuzzy/partial matching is performed.
const normalizeEventLookupValue = (value) =>
  normalizeEventValue(value).toLowerCase();

const normalizeEventAliases = (aliases) => {
  const source = Array.isArray(aliases)
    ? aliases
    : (typeof aliases === 'string' ? aliases.split(',') : []);
  const seen = new Set();
  const normalized = [];
  for (const raw of source) {
    const alias = normalizeEventValue(raw).slice(0, MAX_EVENT_VALUE_LENGTH);
    if (!alias) continue;
    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(alias);
    if (normalized.length >= MAX_EVENT_ALIASES) break;
  }
  return normalized;
};

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
      externalEventId: normalizeEventValue(raw.externalEventId).slice(0, MAX_EVENT_VALUE_LENGTH),
      externalEventAliases: normalizeEventAliases(raw.externalEventAliases),
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
      labelDe: goal.labelDe || '',
      externalEventId: normalizeEventValue(goal.externalEventId),
      externalEventAliases: normalizeEventAliases(goal.externalEventAliases),
    };
  }

  return Object.keys(snapshot).length ? snapshot : null;
};

const collectMatches = (entries, predicate) => {
  const matches = [];
  const seenGoals = new Set();
  for (const [goalKey, goal] of entries) {
    if (!predicate(goal, goalKey)) continue;
    if (seenGoals.has(goalKey)) continue;
    seenGoals.add(goalKey);
    matches.push({ goalKey, goal });
  }
  return matches;
};

const matchedResult = (hasGoals, goalKey, goal) => ({
  hasGoals,
  matched: true,
  goalKey,
  amount: Number(goal.amount),
  payoutAmount: Number(goal.payoutAmount) || 0,
  label: goal.label || goalKey,
  reason: '',
});

const unmatchedResult = (hasGoals, goalKey, reason) => ({
  hasGoals,
  matched: false,
  goalKey: goalKey || null,
  amount: null,
  payoutAmount: 0,
  reason,
});

// Resolves the reward for a postback against the trusted click-time snapshot.
//
// Resolution order (each stage must resolve to exactly one goal):
//   1. exact internal goalKey
//   2. exact externalEventId
//   3. exact alias
//   4. safe normalized fallback (trim/lowercase/collapse whitespace)
// Ambiguous or unknown events never reward.
const resolveGoal = ({ goalsSnapshot, eventType } = {}) => {
  const entries = Object.entries(goalsSnapshot && typeof goalsSnapshot === 'object' ? goalsSnapshot : {});
  const hasGoals = entries.length > 0;
  if (!hasGoals) {
    return { hasGoals: false, matched: true, goalKey: null, amount: null, payoutAmount: 0, reason: '' };
  }

  const rawEvent = normalizeEventValue(eventType);
  const goalKey = rawEvent;
  if (!rawEvent) {
    return unmatchedResult(true, null, 'Unknown or disabled goal.');
  }

  // 1. Exact internal goal key (backward compatible).
  const exactGoalKeyMatches = collectMatches(entries, (_goal, key) => key === rawEvent);
  if (exactGoalKeyMatches.length === 1) {
    return matchedResult(true, exactGoalKeyMatches[0].goalKey, exactGoalKeyMatches[0].goal);
  }
  if (exactGoalKeyMatches.length > 1) {
    return unmatchedResult(true, goalKey, 'Ambiguous goal mapping.');
  }

  // 2. Exact external Event ID.
  const exactExternalMatches = collectMatches(
    entries,
    (goal) => normalizeEventValue(goal.externalEventId) === rawEvent
  );
  if (exactExternalMatches.length === 1) {
    return matchedResult(true, exactExternalMatches[0].goalKey, exactExternalMatches[0].goal);
  }
  if (exactExternalMatches.length > 1) {
    return unmatchedResult(true, goalKey, 'Ambiguous goal mapping.');
  }

  // 3. Exact alias.
  const exactAliasMatches = collectMatches(
    entries,
    (goal) => normalizeEventAliases(goal.externalEventAliases).some((alias) => alias === rawEvent)
  );
  if (exactAliasMatches.length === 1) {
    return matchedResult(true, exactAliasMatches[0].goalKey, exactAliasMatches[0].goal);
  }
  if (exactAliasMatches.length > 1) {
    return unmatchedResult(true, goalKey, 'Ambiguous goal mapping.');
  }

  // 4. Safe normalized fallback (case/whitespace only).
  const normalizedEvent = normalizeEventLookupValue(rawEvent);
  const normalizedMatches = collectMatches(entries, (goal, key) => {
    if (normalizeEventLookupValue(key) === normalizedEvent) return true;
    if (normalizeEventLookupValue(goal.externalEventId) === normalizedEvent) return true;
    return normalizeEventAliases(goal.externalEventAliases)
      .some((alias) => normalizeEventLookupValue(alias) === normalizedEvent);
  });
  if (normalizedMatches.length === 1) {
    return matchedResult(true, normalizedMatches[0].goalKey, normalizedMatches[0].goal);
  }
  if (normalizedMatches.length > 1) {
    return unmatchedResult(true, goalKey, 'Ambiguous goal mapping.');
  }

  return unmatchedResult(true, goalKey, 'Unknown or disabled goal.');
};

module.exports = {
  GOAL_KEY_RE,
  buildGoalsSnapshot,
  getEnabledGoals,
  normalizeEventAliases,
  normalizeEventLookupValue,
  normalizeEventValue,
  normalizeGoals,
  parseTimeLimitDays,
  resolveGoal,
};
