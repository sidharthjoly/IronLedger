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

const KG_PER_LB = 0.45359237;

// Converts a weight logged under one unit into another. Needed because a
// session's weight numbers are only meaningful alongside the unit they were
// actually entered in — reusing them under today's currently-selected unit
// without converting would silently treat e.g. "100" logged in lb as if it
// were 100kg.
export function convertWeight(weight, fromUnit, toUnit) {
  if (weight === null || weight === undefined || Number.isNaN(weight)) return weight;
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'kg' && toUnit === 'lb') return weight / KG_PER_LB;
  if (fromUnit === 'lb' && toUnit === 'kg') return weight * KG_PER_LB;
  return weight;
}

// Re-expresses a logged session's sets in a target unit, defaulting the
// session's own unit to `toUnit` for legacy entries logged before unit
// tagging existed (treated as already being in the target unit).
export function convertSessionToUnit(session, toUnit) {
  if (!session) return session;
  const fromUnit = session.unit || toUnit;
  if (fromUnit === toUnit) return session;
  return {
    ...session,
    sets: session.sets.map((s) => ({ ...s, weight: convertWeight(s.weight, fromUnit, toUnit) })),
  };
}
