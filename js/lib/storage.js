// Dual-backend persistence. Signed out (the default): localStorage, exactly
// like the original version — zero network dependency. Signed in: Supabase,
// scoped to the current user by row-level security. Every exported function
// has the same async shape either way, so app.js never needs to know which
// backend is active; it just awaits these calls.
//
// Every function is wrapped in try/catch and returns a safe fallback on
// failure — a full/blocked localStorage (private browsing, quota exceeded)
// or an unreachable Supabase (offline, misconfigured project) should degrade
// gracefully, never crash the UI.

import { getSupabaseClient } from './supabaseClient.js';

const KEYS = {
  logs: 'gymapp:logs',
  exerciseMeta: 'gymapp:exerciseMeta',
  profile: 'gymapp:profile',
};

let activeUser = null;

export function setActiveUser(user) {
  activeUser = user;
}

export function getActiveUser() {
  return activeUser;
}

// --------------------------------------------------------------------------
// Local backend (localStorage)
// --------------------------------------------------------------------------

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

function loadLogsLocal() {
  return loadJSON(KEYS.logs, []);
}

function loadExerciseMetaLocal() {
  return loadJSON(KEYS.exerciseMeta, {});
}

function loadProfileLocal() {
  return loadJSON(KEYS.profile, { bodyweight: null, height: null, unit: 'kg' });
}

// --------------------------------------------------------------------------
// Cloud backend (Supabase) — row <-> client-shape mapping lives entirely
// here, so the rest of the app only ever sees the camelCase client shape.
// --------------------------------------------------------------------------

function rowToSession(row) {
  return {
    id: row.id,
    date: row.date,
    exerciseName: row.exercise_name,
    goal: row.goal,
    type: row.type,
    muscleGroup: row.muscle_group,
    unit: row.unit,
    sets: row.sets,
  };
}

function sessionToRow(entry, userId) {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    exercise_name: entry.exerciseName,
    goal: entry.goal,
    type: entry.type,
    muscle_group: entry.muscleGroup,
    unit: entry.unit,
    sets: entry.sets,
  };
}

async function loadLogsCloud(userId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('sessions').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) throw error;
  return data.map(rowToSession);
}

async function appendSessionCloud(entry, userId) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('sessions').insert(sessionToRow(entry, userId));
  if (error) throw error;
}

async function loadExerciseMetaCloud(userId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('exercise_meta').select('exercise_name, muscle_group').eq('user_id', userId);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.exercise_name, r.muscle_group]));
}

async function upsertExerciseMetaCloud(exerciseName, muscleGroup, userId) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('exercise_meta')
    .upsert({ user_id: userId, exercise_name: exerciseName, muscle_group: muscleGroup, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function loadProfileCloud(userId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('bodyweight, height, unit').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data || { bodyweight: null, height: null, unit: 'kg' };
}

async function saveProfileCloud(profile, userId) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, bodyweight: profile.bodyweight, height: profile.height, unit: profile.unit, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// --------------------------------------------------------------------------
// Unified public API
// --------------------------------------------------------------------------

export async function loadLogs() {
  if (!activeUser) return loadLogsLocal();
  try {
    return await loadLogsCloud(activeUser.id);
  } catch (err) {
    console.error('Failed to load sessions from Supabase:', err);
    throw err;
  }
}

// Appends exactly one newly logged session. Local mode re-persists the whole
// (small, personal-scale) array; cloud mode inserts a single row.
export async function appendSession(entry) {
  if (!activeUser) {
    const logs = loadLogsLocal();
    logs.push(entry);
    return saveJSON(KEYS.logs, logs);
  }
  await appendSessionCloud(entry, activeUser.id);
  return true;
}

export async function loadExerciseMeta() {
  if (!activeUser) return loadExerciseMetaLocal();
  try {
    return await loadExerciseMetaCloud(activeUser.id);
  } catch (err) {
    console.error('Failed to load exercise metadata from Supabase:', err);
    throw err;
  }
}

export async function upsertExerciseMeta(exerciseName, muscleGroup) {
  if (!activeUser) {
    const meta = loadExerciseMetaLocal();
    meta[exerciseName] = muscleGroup;
    return saveJSON(KEYS.exerciseMeta, meta);
  }
  await upsertExerciseMetaCloud(exerciseName, muscleGroup, activeUser.id);
  return true;
}

export async function loadProfile() {
  if (!activeUser) return loadProfileLocal();
  try {
    return await loadProfileCloud(activeUser.id);
  } catch (err) {
    console.error('Failed to load profile from Supabase:', err);
    throw err;
  }
}

export async function saveProfile(profile) {
  if (!activeUser) return saveJSON(KEYS.profile, profile);
  await saveProfileCloud(profile, activeUser.id);
  return true;
}

// One-time import offered right after sign-in when local data exists —
// copies whatever's in this browser's localStorage up to the new account so
// switching to cloud sync doesn't strand a user's existing log.
export async function migrateLocalDataToCloud(userId) {
  const logs = loadLogsLocal();
  const meta = loadExerciseMetaLocal();
  const profile = loadProfileLocal();

  for (const entry of logs) {
    await appendSessionCloud(entry, userId);
  }
  for (const [exerciseName, muscleGroup] of Object.entries(meta)) {
    await upsertExerciseMetaCloud(exerciseName, muscleGroup, userId);
  }
  if (profile.bodyweight !== null || profile.height !== null) {
    await saveProfileCloud(profile, userId);
  }

  return { sessionsImported: logs.length, exercisesImported: Object.keys(meta).length };
}

export function countLocalSessions() {
  return loadLogsLocal().length;
}

// Called after a successful migration — the cloud copy is now the source of
// truth for this signed-in session, so the local copy is cleared rather than
// left around to be re-offered (or to conflict with a different device's
// local data) on a future sign-out.
export function clearLocalData() {
  try {
    localStorage.removeItem(KEYS.logs);
    localStorage.removeItem(KEYS.exerciseMeta);
    localStorage.removeItem(KEYS.profile);
  } catch (err) {
    console.error('Failed to clear local data after migration:', err);
  }
}
