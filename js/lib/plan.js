// Orchestrator: combines progression + readiness + periodization into the
// single "Today's Plan" the UI renders. This is the one place all four
// heuristic modules meet, including the readiness override rule.

import { computeProgression } from './progression.js';
import { getMuscleGroupReadiness } from './readiness.js';
import { recommendSessionType } from './periodization.js';
import { generateHypertrophyPlan, generateStrengthTestPlan, defaultSetCount } from './planGenerator.js';
import { convertSessionToUnit } from './units.js';

export function buildTodaysPlan({ exerciseName, muscleGroup, goal, sessionTypeOverride, logs, exerciseMeta, profile }) {
  const unit = profile.unit || 'kg';
  const exerciseLogs = logs
    .filter((l) => l.exerciseName === exerciseName)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // Double progression is a hypertrophy-day concept: it tracks whether you're
  // adding reps/weight at a submaximal working weight over time. A strength
  // test's near-1RM single is a different kind of number entirely (1 rep, at
  // ~102% of estimated max) — feeding it into the same rep-range check would
  // read as "missed the bottom of the range" and back off from your near-max
  // lift. So progression and default set count always look at the most recent
  // hypertrophy-type session specifically, never just "the last session,"
  // mirroring how the strength-test plan already sources its own history.
  const lastHypertrophySessionRaw = exerciseLogs.find((l) => l.type === 'hypertrophy') || null;
  const lastSession = convertSessionToUnit(lastHypertrophySessionRaw, unit);

  const readiness = getMuscleGroupReadiness(muscleGroup, logs, exerciseMeta);
  const sessionRec = recommendSessionType({ exerciseName, logs, muscleGroupReadiness: readiness });
  const sessionType = sessionTypeOverride || sessionRec.type;

  const progression = computeProgression({ lastSession, exerciseName, unit });

  // Recovery guardrail: never prescribe a load increase onto a muscle group
  // that isn't ready for it, regardless of what the rep/RPE numbers alone say.
  let finalProgression = progression;
  if (progression.decision === 'increase' && (readiness.status === 'recovering' || readiness.status === 'layoff')) {
    finalProgression = {
      ...progression,
      decision: 'hold-override',
      nextWeight: progression.workingWeight,
      reason: `Rep/RPE numbers would normally call for more load (${progression.reason}) but this muscle group is currently "${readiness.status}" — holding steady instead so load doesn't outpace recovery.`,
    };
  }

  const setCount = defaultSetCount(lastSession);

  let plan;
  if (sessionType === 'strength') {
    const recentHypertrophySessions = exerciseLogs
      .filter((l) => l.type === 'hypertrophy')
      .slice(0, 3)
      .map((s) => convertSessionToUnit(s, unit));
    plan = generateStrengthTestPlan({ recentHypertrophySessions, unit });
  } else {
    plan = generateHypertrophyPlan({
      nextWeight: finalProgression.nextWeight,
      setCount,
      goal: goal || lastSession?.goal || 'hypertrophy',
    });
  }

  return {
    exerciseName,
    muscleGroup,
    unit,
    readiness,
    sessionRec,
    sessionType,
    progression: finalProgression,
    plan,
    lastSession,
  };
}
