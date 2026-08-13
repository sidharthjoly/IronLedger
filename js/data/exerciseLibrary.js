// Searchable exercise library: ~90+ common gym movements across 10 muscle
// groups. Machine names are movement-based (e.g. "Chest Press", "Low Row
// Machine") rather than brand-specific, since that's the naming convention
// shared across gym80, Panatta, Technogym, etc. — any commercial machine that
// performs that movement counts.

export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

export const MUSCLE_GROUP_LABELS = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
};

export const EXERCISE_LIBRARY = [
  // Chest
  { name: 'Barbell Bench Press', muscleGroup: 'chest' },
  { name: 'Incline Barbell Bench Press', muscleGroup: 'chest' },
  { name: 'Decline Barbell Bench Press', muscleGroup: 'chest' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest' },
  { name: 'Chest Press Machine', muscleGroup: 'chest' },
  { name: 'Incline Chest Press Machine', muscleGroup: 'chest' },
  { name: 'Pec Deck / Chest Fly Machine', muscleGroup: 'chest' },
  { name: 'Cable Fly', muscleGroup: 'chest' },
  { name: 'Push-Up', muscleGroup: 'chest' },
  { name: 'Dip (Chest Focus)', muscleGroup: 'chest' },

  // Back
  { name: 'Deadlift', muscleGroup: 'back' },
  { name: 'Pull-Up', muscleGroup: 'back' },
  { name: 'Chin-Up', muscleGroup: 'back' },
  { name: 'Lat Pulldown', muscleGroup: 'back' },
  { name: 'Wide-Grip Lat Pulldown', muscleGroup: 'back' },
  { name: 'Close-Grip Lat Pulldown', muscleGroup: 'back' },
  { name: 'Barbell Row', muscleGroup: 'back' },
  { name: 'Pendlay Row', muscleGroup: 'back' },
  { name: 'Dumbbell Row', muscleGroup: 'back' },
  { name: 'T-Bar Row', muscleGroup: 'back' },
  { name: 'Low Row Machine', muscleGroup: 'back' },
  { name: 'Seated Cable Row', muscleGroup: 'back' },
  { name: 'Straight-Arm Pulldown', muscleGroup: 'back' },
  { name: 'Assisted Pull-Up Machine', muscleGroup: 'back' },

  // Shoulders
  { name: 'Overhead Press (Barbell)', muscleGroup: 'shoulders' },
  { name: 'Seated Dumbbell Shoulder Press', muscleGroup: 'shoulders' },
  { name: 'Shoulder Press Machine', muscleGroup: 'shoulders' },
  { name: 'Arnold Press', muscleGroup: 'shoulders' },
  { name: 'Landmine Press', muscleGroup: 'shoulders' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders' },
  { name: 'Cable Lateral Raise', muscleGroup: 'shoulders' },
  { name: 'Lateral Raise Machine', muscleGroup: 'shoulders' },
  { name: 'Front Raise', muscleGroup: 'shoulders' },
  { name: 'Rear Delt Fly', muscleGroup: 'shoulders' },
  { name: 'Rear Delt Machine', muscleGroup: 'shoulders' },
  { name: 'Face Pull', muscleGroup: 'shoulders' },
  { name: 'Upright Row', muscleGroup: 'shoulders' },

  // Biceps
  { name: 'Barbell Curl', muscleGroup: 'biceps' },
  { name: 'EZ-Bar Curl', muscleGroup: 'biceps' },
  { name: 'Dumbbell Curl', muscleGroup: 'biceps' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'biceps' },
  { name: 'Hammer Curl', muscleGroup: 'biceps' },
  { name: 'Cable Curl', muscleGroup: 'biceps' },
  { name: 'Preacher Curl Machine', muscleGroup: 'biceps' },
  { name: 'Concentration Curl', muscleGroup: 'biceps' },

  // Triceps
  { name: 'Triceps Pushdown', muscleGroup: 'triceps' },
  { name: 'Overhead Triceps Extension (Cable)', muscleGroup: 'triceps' },
  { name: 'Overhead Triceps Extension (Dumbbell)', muscleGroup: 'triceps' },
  { name: 'Skull Crusher', muscleGroup: 'triceps' },
  { name: 'Close-Grip Bench Press', muscleGroup: 'triceps' },
  { name: 'Triceps Dip Machine', muscleGroup: 'triceps' },
  { name: 'Cable Triceps Kickback', muscleGroup: 'triceps' },
  { name: 'Triceps Extension Machine', muscleGroup: 'triceps' },

  // Quads
  { name: 'Back Squat', muscleGroup: 'quads' },
  { name: 'Front Squat', muscleGroup: 'quads' },
  { name: 'Vertical Leg Press', muscleGroup: 'quads' },
  { name: 'Leg Press', muscleGroup: 'quads' },
  { name: 'Hack Squat', muscleGroup: 'quads' },
  { name: 'Leg Extension', muscleGroup: 'quads' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'quads' },
  { name: 'Walking Lunge', muscleGroup: 'quads' },
  { name: 'Goblet Squat', muscleGroup: 'quads' },
  { name: 'Zercher Squat', muscleGroup: 'quads' },
  { name: 'Sissy Squat', muscleGroup: 'quads' },

  // Hamstrings
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings' },
  { name: 'Stiff-Leg Deadlift', muscleGroup: 'hamstrings' },
  { name: 'Seated Leg Curl', muscleGroup: 'hamstrings' },
  { name: 'Lying Leg Curl', muscleGroup: 'hamstrings' },
  { name: 'Good Morning', muscleGroup: 'hamstrings' },
  { name: 'Nordic Curl', muscleGroup: 'hamstrings' },
  { name: 'Glute-Ham Raise', muscleGroup: 'hamstrings' },

  // Glutes
  { name: 'Hip Thrust', muscleGroup: 'glutes' },
  { name: 'Glute Bridge', muscleGroup: 'glutes' },
  { name: 'Cable Glute Kickback', muscleGroup: 'glutes' },
  { name: 'Hip Abductor Machine', muscleGroup: 'glutes' },
  { name: 'Hip Adductor Machine', muscleGroup: 'glutes' },
  { name: 'Step-Up', muscleGroup: 'glutes' },
  { name: 'Sumo Deadlift', muscleGroup: 'glutes' },

  // Calves
  { name: 'Standing Calf Raise', muscleGroup: 'calves' },
  { name: 'Seated Calf Raise', muscleGroup: 'calves' },
  { name: 'Calf Press (Leg Press Machine)', muscleGroup: 'calves' },
  { name: 'Donkey Calf Raise', muscleGroup: 'calves' },
  { name: 'Single-Leg Calf Raise', muscleGroup: 'calves' },

  // Core
  { name: 'Plank', muscleGroup: 'core' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core' },
  { name: 'Cable Crunch', muscleGroup: 'core' },
  { name: 'Ab Crunch Machine', muscleGroup: 'core' },
  { name: 'Weighted Sit-Up', muscleGroup: 'core' },
  { name: 'Russian Twist', muscleGroup: 'core' },
  { name: 'Ab Rollout', muscleGroup: 'core' },
  { name: 'Cable Woodchopper', muscleGroup: 'core' },
  { name: 'Side Plank', muscleGroup: 'core' },
  { name: 'Pallof Press', muscleGroup: 'core' },
  { name: 'Flutter Kicks', muscleGroup: 'core' },
  { name: 'Toe Touches', muscleGroup: 'core' },
];

// Ordered, most-specific-first keyword patterns for guessing a muscle group
// from a freely typed exercise name. Order matters: e.g. "romanian deadlift"
// must be matched as hamstrings before the generic "deadlift" -> back rule.
const GUESS_PATTERNS = [
  // Hamstrings / glutes deadlift variants before the generic "deadlift" rule
  { pattern: /romanian|rdl|stiff.?leg|good morning|nordic|glute.?ham/, group: 'hamstrings' },
  { pattern: /sumo/, group: 'glutes' },
  { pattern: /hip thrust|glute bridge|hip abduct|hip adduct|step.?up/, group: 'glutes' },
  { pattern: /deadlift/, group: 'back' },

  // Triceps before chest (close-grip bench press contains "bench")
  { pattern: /tricep|pushdown|skull|close.?grip bench/, group: 'triceps' },
  { pattern: /bench|chest|pec|fly|push.?up|dip/, group: 'chest' },

  { pattern: /pull.?up|chin.?up|row|pulldown|lat\s/, group: 'back' },

  { pattern: /shoulder|overhead press|delt|lateral raise|face pull|upright row|arnold|landmine press/, group: 'shoulders' },

  { pattern: /leg curl/, group: 'hamstrings' },
  { pattern: /bicep|curl/, group: 'biceps' },

  { pattern: /leg extension|squat|leg press|lunge|hack squat|split squat|sissy|zercher/, group: 'quads' },

  { pattern: /calf/, group: 'calves' },

  { pattern: /\bab\b|\babs\b|crunch|plank|core|oblique|russian twist|sit.?up|rollout|woodchop|pallof|leg raise|flutter|toe touch/, group: 'core' },
];

export function guessMuscleGroup(exerciseName) {
  const n = (exerciseName || '').toLowerCase();
  for (const { pattern, group } of GUESS_PATTERNS) {
    if (pattern.test(n)) return group;
  }
  return null;
}

export function findInLibrary(exerciseName) {
  const n = (exerciseName || '').trim().toLowerCase();
  return EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === n) || null;
}

export function searchLibrary(query, limit = 10) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return EXERCISE_LIBRARY
    .filter((e) => e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q))
    .slice(0, limit);
}
