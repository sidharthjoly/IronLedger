// ---------------------------------------------------------------------------
// SET-BY-SET PLAN GENERATOR — turns a progression verdict + session type into
// an actual table of sets to perform. Evidence-informed heuristics (double
// progression, Epley 1RM estimation, %1RM ramps), not personalized medical or
// coaching advice — treat every number here as a sensible starting point, not
// a guarantee, and stop any lift where bar speed or form breaks down.
// ---------------------------------------------------------------------------

import { repRangeForGoal, repRangeMidpoint, getWorkingSets } from './progression.js';
import { roundToPlate } from './units.js';

// Epley formula, capped at 12 reps for estimation accuracy (higher-rep sets
// make 1RM estimates increasingly unreliable).
export function epley1RM(weight, reps) {
  const cappedReps = Math.min(Number(reps) || 0, 12);
  return (Number(weight) || 0) * (1 + cappedReps / 30);
}

function defaultSetCount(lastSession) {
  return lastSession && lastSession.sets && lastSession.sets.length > 0
    ? lastSession.sets.length
    : 3;
}

/**
 * Straight-sets hypertrophy day: same working weight across all sets, last
 * set flagged as an AMRAP/autoregulation set.
 */
export function generateHypertrophyPlan({ nextWeight, setCount, goal }) {
  const targetReps = repRangeMidpoint(goal);
  const sets = [];
  for (let i = 0; i < setCount; i++) {
    const isLast = i === setCount - 1;
    sets.push({
      setNumber: i + 1,
      weight: nextWeight,
      targetReps,
      note: isLast ? 'Push close to failure (0–2 reps in reserve)' : '',
    });
  }
  return { sessionType: 'hypertrophy', sets, caveat: null };
}

/**
 * Periodized strength-test day: warm-up ramp -> working single at ~102% of
 * an Epley-estimated 1RM -> back-off sets.
 */
export function generateStrengthTestPlan({ recentHypertrophySessions, unit }) {
  // Best recent set = highest estimated 1RM among working sets across the
  // last (up to) 3 hypertrophy sessions.
  let best = null;
  for (const session of recentHypertrophySessions.slice(0, 3)) {
    const workingSets = getWorkingSets(session.sets);
    for (const s of workingSets) {
      const est = epley1RM(s.weight, s.reps);
      if (!best || est > best.est) best = { est, weight: s.weight, reps: s.reps };
    }
  }

  if (!best) {
    return {
      sessionType: 'strength',
      sets: [],
      estimated1RM: null,
      caveat: 'Not enough hypertrophy history to estimate a 1RM yet — log a couple more sessions first.',
    };
  }

  const estimated1RM = best.est;
  const workingSingle = roundToPlate(estimated1RM * 1.02, unit);

  const sets = [
    { setNumber: 1, weight: roundToPlate(workingSingle * 0.4, unit), targetReps: 5, note: 'Warm-up' },
    { setNumber: 2, weight: roundToPlate(workingSingle * 0.6, unit), targetReps: 3, note: 'Warm-up' },
    { setNumber: 3, weight: roundToPlate(workingSingle * 0.75, unit), targetReps: 2, note: 'Warm-up' },
    { setNumber: 4, weight: roundToPlate(workingSingle * 0.85, unit), targetReps: 1, note: 'Warm-up' },
    { setNumber: 5, weight: workingSingle, targetReps: 1, note: 'Working single — use a spotter or safety bars' },
  ];

  const backoffWeight = roundToPlate(workingSingle * 0.85, unit);
  for (let i = 0; i < 3; i++) {
    const isLast = i === 2;
    sets.push({
      setNumber: 6 + i,
      weight: backoffWeight,
      targetReps: '3–5',
      note: isLast ? 'Back-off set — push to near failure' : 'Back-off set',
    });
  }

  return {
    sessionType: 'strength',
    sets,
    estimated1RM,
    workingSingle,
    caveat: 'This 1RM estimate is a ballpark from a rep-max formula, not a tested max — stop any attempt where bar speed or form breaks down.',
  };
}

export { defaultSetCount };
