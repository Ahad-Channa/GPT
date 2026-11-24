// Goal Keys are the internal event_type value of a multi-step goal. The admin form
// generates one from the step label so nobody has to invent it; it stays editable.
// Rules mirror the server (backend/utils/offerGoals.js GOAL_KEY_RE).
export const GOAL_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

// "Reach Level 10!" -> "reach_level_10". Returns '' when nothing usable is left.
// `takenKeys` are the keys of the other steps; a clash gets _2, _3, ...
export const slugifyGoalKey = (label, takenKeys = []) => {
  let base = String(label || '')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    .replace(/_+$/, '');
  if (!base) return '';
  if (/^[0-9]/.test(base)) base = `step_${base}`;

  const taken = new Set((Array.isArray(takenKeys) ? takenKeys : []).map((key) => String(key || '').trim().toLowerCase()));
  let candidate = base;
  let counter = 2;
  while (taken.has(candidate)) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }
  return candidate;
};
