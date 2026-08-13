// ---------------------------------------------------------------------------
// MUSCLE-GROUP READINESS — a general recovery-time guideline based only on
// days since that muscle group was last trained. This is NOT a personalized
// fatigue measurement: real recovery depends on sleep, stress, nutrition and
// training history the app has no way to track.
// ---------------------------------------------------------------------------

import { daysSince, maxDate } from './dateUtils.js';

export function getMuscleGroupLastTrainedDate(muscleGroup, logs, exerciseMeta) {
  const dates = logs
    .filter((l) => (exerciseMeta[l.exerciseName] || l.muscleGroup) === muscleGroup)
    .map((l) => l.date);
  return maxDate(dates);
}

export function classifyReadiness(days) {
  if (days === null) {
    return {
      status: 'new',
      label: 'No data yet',
      reason: `This muscle group has no logged sessions yet — nothing to recover from.`,
    };
  }
  if (days <= 1) {
    return {
      status: 'recovering',
      label: 'Recovering',
      reason: `Trained ${days === 0 ? 'today' : '1 day ago'} — most lifters need ~48h before pushing more load on the same muscle group.`,
    };
  }
  if (days <= 4) {
    return {
      status: 'optimal',
      label: 'Optimal',
      reason: `${days} days since last trained — inside the standard well-supported training frequency window.`,
    };
  }
  if (days <= 10) {
    return {
      status: 'ready',
      label: 'Ready',
      reason: `${days} days since last trained — fully recovered.`,
    };
  }
  return {
    status: 'layoff',
    label: 'Layoff',
    reason: `${days} days since last trained — strength holds up fine over short layoffs, but treat the first set as a readiness check before loading up.`,
  };
}

export function getMuscleGroupReadiness(muscleGroup, logs, exerciseMeta) {
  const lastDate = getMuscleGroupLastTrainedDate(muscleGroup, logs, exerciseMeta);
  const days = lastDate ? daysSince(lastDate) : null;
  return { ...classifyReadiness(days), days, lastDate };
}
