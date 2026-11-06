const compactKey = (value) => String(value || '').toLowerCase().replace(/[\s_-]+/g, '');

export const humanizeGoalKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return words.replace(/\b([a-z])/g, (match) => match.toUpperCase());
};

export const formatGoalLabel = (goal, language = 'en') => {
  const key = String(goal?.goalKey || goal?.key || '').trim();
  const localizedLabel = language.startsWith('de')
    ? String(goal?.labelDe || '').trim()
    : '';
  const label = localizedLabel || String(goal?.label || '').trim();

  if (label && (!key || compactKey(label) !== compactKey(key))) return label;
  return humanizeGoalKey(key || label) || 'Complete step';
};

export const getEnabledGoalRewardTotal = (goals) =>
  (Array.isArray(goals) ? goals : []).reduce((total, goal) => {
    if (!goal || goal.enabled === false) return total;
    const amount = Number(goal.rewardAmount);
    return Number.isSafeInteger(amount) && amount > 0 ? total + amount : total;
  }, 0);
