// localStorage persistence layer. Every read/write is wrapped in try/catch —
// a full or blocked localStorage (private browsing, quota exceeded) should
// degrade to "nothing persists this session," never crash the UI.

const KEYS = {
  logs: 'gymapp:logs',
  exerciseMeta: 'gymapp:exerciseMeta',
  profile: 'gymapp:profile',
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (err) {
    console.error(`Failed to load "${key}" from localStorage:`, err);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Failed to save "${key}" to localStorage:`, err);
    return false;
  }
}

export function loadLogs() {
  return loadJSON(KEYS.logs, []);
}

export function saveLogs(logs) {
  return saveJSON(KEYS.logs, logs);
}

export function loadExerciseMeta() {
  return loadJSON(KEYS.exerciseMeta, {});
}

export function saveExerciseMeta(meta) {
  return saveJSON(KEYS.exerciseMeta, meta);
}

export function loadProfile() {
  return loadJSON(KEYS.profile, { bodyweight: null, height: null, unit: 'kg' });
}

export function saveProfile(profile) {
  return saveJSON(KEYS.profile, profile);
}
