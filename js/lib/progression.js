// ---------------------------------------------------------------------------
// PROGRESSION ENGINE — evidence-informed heuristics (double progression +
// RPE autoregulation), not personalized medical or coaching advice. It makes
// a reasonable next-session call from the numbers you logged; it doesn't know
// your injury history, sleep, or how the bar actually felt.
// ---------------------------------------------------------------------------

import { getLoadIncrement, roundToPlate } from './units.js';

export const REP_RANGES = {
  strength: { min: 3, max: 6 },
  hypertrophy: { min: 6, max: 12 },
  endurance: { min: 12, max: 20 },
};

export function repRangeForGoal(goal) {
  return REP_RANGES[goal] || REP_RANGES.hypertrophy;
}

export function repRangeMidpoint(goal) {
  const { min, max } = repRangeForGoal(goal);
  return Math.round((min + max) / 2);
}

// The "working sets" of a session are the sets at the heaviest weight used —
// warm-ups and drop sets below that weight don't count toward the verdict.
export function getWorkingSets(sets) {
  if (!sets || sets.length === 0) return [];
  const maxWeight = Math.max(...sets.map((s) => Number(s.weight) || 0));
  return sets.filter((s) => Math.abs((Number(s.weight) || 0) - maxWeight) < 0.01);
}

function average(values) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Decide next session's working weight for an exercise from its last logged
 * session. Returns { decision, nextWeight, workingWeight, reason }.
 * decision is one of: 'seed' (no history), 'increase', 'decrease', 'hold'.
 */
export function computeProgression({ lastSession, exerciseName, unit }) {
  if (!lastSession || !lastSession.sets || lastSession.sets.length === 0) {
    return {
      decision: 'seed',
      nextWeight: null,
      workingWeight: null,
      reason: 'No history yet for this exercise — log a session to establish a baseline weight.',
    };
  }

  const workingSets = getWorkingSets(lastSession.sets);
  const workingWeight = Number(workingSets[0].weight) || 0;
  const range = repRangeForGoal(lastSession.goal);

  const rpeValues = workingSets.map((s) => s.rpe).filter((v) => v !== null && v !== undefined && v !== '');
  const avgRpe = average(rpeValues.map(Number));

  const allHitTop = workingSets.every((s) => Number(s.reps) >= range.max);
  const rpeOkForIncrease = workingSets.every((s) => s.rpe === null || s.rpe === undefined || s.rpe === '' || Number(s.rpe) <= 8);
  const anyMissedBottom = workingSets.some((s) => Number(s.reps) < range.min);
  const rpeTooHigh = avgRpe !== null && avgRpe >= 9.5;

  if (allHitTop && rpeOkForIncrease) {
    const increment = getLoadIncrement(exerciseName, unit);
    const nextWeight = roundToPlate(workingWeight + increment, unit);
    return {
      decision: 'increase',
      nextWeight,
      workingWeight,
      reason: `Every working set hit the top of the ${range.min}–${range.max} rep range at RPE ≤ 8 last time — adding ${increment}${unit === 'lb' ? 'lb' : 'kg'}.`,
    };
  }

  if (anyMissedBottom || rpeTooHigh) {
    const nextWeight = roundToPlate(workingWeight * 0.92, unit);
    const why = anyMissedBottom
      ? `a working set fell below ${range.min} reps`
      : `average RPE was ${avgRpe.toFixed(1)} (≥ 9.5)`;
    return {
      decision: 'decrease',
      nextWeight,
      workingWeight,
      reason: `Backing off ~8% because ${why} last session.`,
    };
  }

  return {
    decision: 'hold',
    nextWeight: workingWeight,
    workingWeight,
    reason: 'Same weight as last time — chase more reps at this load before adding weight (double progression).',
  };
}
