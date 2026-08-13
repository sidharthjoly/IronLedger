// ---------------------------------------------------------------------------
// PERIODIZATION — decides whether the next session for an exercise should be
// a standard hypertrophy day or a periodized strength-test day. Heuristic,
// not a prescribed program: it's a reasonable default cadence, not a rule
// tuned to your individual recovery or competition calendar.
// ---------------------------------------------------------------------------

import { daysSince } from './dateUtils.js';

const MIN_HYPERTROPHY_SESSIONS = 2;
const STRENGTH_TEST_COOLDOWN_DAYS = 14;

export function recommendSessionType({ exerciseName, logs, muscleGroupReadiness }) {
  const exerciseLogs = logs.filter((l) => l.exerciseName === exerciseName);
  const hypertrophyLogs = exerciseLogs.filter((l) => l.type === 'hypertrophy');
  const strengthTestLogs = exerciseLogs.filter((l) => l.type === 'strength');

  if (hypertrophyLogs.length < MIN_HYPERTROPHY_SESSIONS) {
    return {
      type: 'hypertrophy',
      reason: `Only ${hypertrophyLogs.length} hypertrophy session${hypertrophyLogs.length === 1 ? '' : 's'} logged for this exercise — need ${MIN_HYPERTROPHY_SESSIONS} before a strength test is advisable.`,
    };
  }

  const lastTestDate = strengthTestLogs.reduce((latest, l) => (!latest || l.date > latest ? l.date : latest), null);
  const daysSinceTest = lastTestDate ? daysSince(lastTestDate) : null;
  const eligibleByCooldown = lastTestDate === null || daysSinceTest >= STRENGTH_TEST_COOLDOWN_DAYS;
  const muscleRecovering = muscleGroupReadiness.status === 'recovering';

  if (eligibleByCooldown && !muscleRecovering) {
    const why = lastTestDate === null
      ? 'no strength test has been logged for this exercise yet'
      : `it's been ${daysSinceTest} days since the last one`;
    return {
      type: 'strength',
      reason: `Strength test recommended — ${why}, and ${muscleGroupReadiness.status === 'new' ? 'this muscle group has no recent fatigue on record' : `the muscle group is ${muscleGroupReadiness.status}, not recovering`}.`,
    };
  }

  if (muscleRecovering) {
    return {
      type: 'hypertrophy',
      reason: `Staying on hypertrophy — this muscle group is still recovering from a recent session, even though the strength-test cooldown has ${eligibleByCooldown ? 'elapsed' : 'not yet elapsed'}.`,
    };
  }

  const daysRemaining = STRENGTH_TEST_COOLDOWN_DAYS - daysSinceTest;
  return {
    type: 'hypertrophy',
    reason: `Staying on hypertrophy — ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'} until another strength test is advisable.`,
  };
}
