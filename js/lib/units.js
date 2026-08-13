// Unit-aware rounding and load-increment rules used by the progression engine
// and the plan generator. Kept in one place so kg/lb behavior stays consistent
// everywhere a weight gets rounded.

const LOWER_BODY_KEYWORDS = ['squat', 'deadlift', 'leg press', 'lunge'];

export function isLowerBodyCompound(exerciseName) {
  const n = (exerciseName || '').toLowerCase();
  return LOWER_BODY_KEYWORDS.some((k) => n.includes(k));
}

// Standard per-session load jump once double progression says "add weight."
export function getLoadIncrement(exerciseName, unit) {
  const lower = isLowerBodyCompound(exerciseName);
  if (unit === 'lb') return lower ? 10 : 5;
  return lower ? 5 : 2.5;
}

// Nearest loadable plate increment for a given unit (2.5kg / 5lb smallest plate pair).
export function roundToPlate(weight, unit) {
  const step = unit === 'lb' ? 5 : 2.5;
  return Math.round(weight / step) * step;
}

export function formatWeight(weight, unit) {
  if (weight === null || weight === undefined || Number.isNaN(weight)) return '—';
  const rounded = Math.round(weight * 100) / 100;
  return `${rounded}${unit === 'lb' ? 'lb' : 'kg'}`;
}
