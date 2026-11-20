// Display-only formatting for a Direct Offer goal's optional time label.
// Returns null when there is no valid positive integer so callers render no
// badge. There is NO expiry/deadline/countdown behavior behind this value.
export const formatGoalTimeLimit = (days) => {
  if (days === undefined || days === null || days === '') return null;
  const num = Number(days);
  if (!Number.isInteger(num) || num < 1) return null;
  return `${num}D`;
};
