// Iron Ledger — app controller. Vanilla JS, no framework/build step: wires
// the DOM to the algorithm modules in js/lib and persists via js/lib/storage.

import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, searchLibrary, findInLibrary, guessMuscleGroup } from './data/exerciseLibrary.js';
import {
  loadLogs, appendSession, loadExerciseMeta, upsertExerciseMeta, loadProfile, saveProfile,
  setActiveUser, getActiveUser, migrateLocalDataToCloud, countLocalSessions, clearLocalData,
} from './lib/storage.js';
import {
  isSupabaseConfigured, hasCachedSupabaseSession, isOAuthRedirectInProgress,
  getCurrentUser, signInWithGoogle, signOut,
} from './lib/supabaseClient.js';
import { buildTodaysPlan } from './lib/plan.js';
import { getMuscleGroupReadiness } from './lib/readiness.js';
import { recommendSessionType } from './lib/periodization.js';
import { renderPlateStack } from './components/plateStack.js';
import { renderWeightTrendChart, renderVolumeChart } from './components/progressChart.js';
import { formatWeight, convertWeight } from './lib/units.js';
import { getWorkingSets } from './lib/progression.js';
import { todayStr, formatDateDisplay } from './lib/dateUtils.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let logs = [];
let exerciseMeta = {};
let profile = { bodyweight: null, height: null, unit: 'kg' };

let currentExercise = null;
let currentPlanResult = null;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const exerciseInput = document.getElementById('exercise-input');
const suggestionsEl = document.getElementById('exercise-suggestions');
const muscleGroupSelect = document.getElementById('muscle-group-select');
const goalSelect = document.getElementById('goal-select');
const sessionTypeSelect = document.getElementById('session-type-select');

const planEmptyEl = document.getElementById('plan-empty');
const todayPlanEl = document.getElementById('today-plan');
const sessionTypeBadge = document.getElementById('session-type-badge');
const sessionReasonEl = document.getElementById('session-reason');
const readinessBadge = document.getElementById('readiness-badge');
const readinessReasonEl = document.getElementById('readiness-reason');
const progressionBadge = document.getElementById('progression-badge');
const progressionReasonEl = document.getElementById('progression-reason');
const platePreviewEl = document.getElementById('plate-preview');
const planTableBody = document.getElementById('plan-table-body');
const planCaveatEl = document.getElementById('plan-caveat');

const setCountInput = document.getElementById('set-count');
const usePlanBtn = document.getElementById('use-plan-btn');
const addSetBtn = document.getElementById('add-set-btn');
const setsGrid = document.getElementById('sets-grid');
const saveSessionBtn = document.getElementById('save-session-btn');
const saveStatusEl = document.getElementById('save-status');

const historyExerciseSelect = document.getElementById('history-exercise-select');
const historyTableBody = document.getElementById('history-table-body');
const historyEmptyEl = document.getElementById('history-empty');
const chartSectionEl = document.getElementById('chart-section');
const chartEmptyEl = document.getElementById('chart-empty');
const weightTrendChartEl = document.getElementById('weight-trend-chart');
const volumeChartEl = document.getElementById('volume-chart');

const profileBodyweight = document.getElementById('profile-bodyweight');
const profileHeight = document.getElementById('profile-height');
const profileUnit = document.getElementById('profile-unit');
const saveProfileBtn = document.getElementById('save-profile-btn');
const bodyweightUnitLabel = document.getElementById('bodyweight-unit-label');
const heightUnitLabel = document.getElementById('height-unit-label');

const authStatusText = document.getElementById('auth-status-text');
const authActionBtn = document.getElementById('auth-action-btn');
const migrateBanner = document.getElementById('migrate-banner');
const migrateCountEl = document.getElementById('migrate-count');
const migrateYesBtn = document.getElementById('migrate-yes-btn');
const migrateNoBtn = document.getElementById('migrate-no-btn');

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  MUSCLE_GROUPS.forEach((mg) => {
    const opt = document.createElement('option');
    opt.value = mg;
    opt.textContent = MUSCLE_GROUP_LABELS[mg];
    muscleGroupSelect.appendChild(opt);
  });

  wireEvents();
  wireAuthEvents();

  // Only pay the (lazy-loaded) Supabase network cost when there's actually a
  // reason to: a cached session from a previous sign-in, or landing back
  // here as the target of a Google OAuth redirect. A first-time or
  // never-signed-in visitor never loads the SDK at all.
  if (isSupabaseConfigured() && (hasCachedSupabaseSession() || isOAuthRedirectInProgress())) {
    try {
      const user = await getCurrentUser();
      setActiveUser(user);
      updateAuthUI(user);
      maybeOfferMigration(user);
    } catch (err) {
      console.error('Failed to resume Supabase session:', err);
      showAuthStatus('Sync unavailable — working locally.', 'sync-error');
    }
  }

  await loadAndRenderAll();
}

async function loadAndRenderAll() {
  try {
    [logs, exerciseMeta, profile] = await Promise.all([loadLogs(), loadExerciseMeta(), loadProfile()]);
  } catch (err) {
    console.error('Failed to load data:', err);
    showAuthStatus('Sync failed — showing local data only.', 'sync-error');
    setActiveUser(null);
    updateAuthUI(null);
    [logs, exerciseMeta, profile] = await Promise.all([loadLogs(), loadExerciseMeta(), loadProfile()]);
  }

  profileBodyweight.value = profile.bodyweight ?? '';
  profileHeight.value = profile.height ?? '';
  profileUnit.value = profile.unit || 'kg';
  updateProfileUnitLabels();

  buildBlankGrid(3);
  renderHistorySelectOptions();
  renderHistoryTable(historyExerciseSelect.value || null);
  if (currentExercise) recomputePlan();
}

function wireEvents() {
  exerciseInput.addEventListener('input', onExerciseInput);
  exerciseInput.addEventListener('blur', onExerciseBlur);
  suggestionsEl.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (!item) return;
    exerciseInput.value = item.dataset.name;
    selectExercise(item.dataset.name);
    suggestionsEl.classList.remove('open');
  });

  muscleGroupSelect.addEventListener('change', async () => {
    if (currentExercise) {
      exerciseMeta[currentExercise] = muscleGroupSelect.value;
      try {
        await upsertExerciseMeta(currentExercise, muscleGroupSelect.value);
      } catch (err) {
        showAuthStatus('Sync failed for that change.', 'sync-error');
      }
    }
    recomputePlan();
  });
  goalSelect.addEventListener('change', () => recomputePlan());
  sessionTypeSelect.addEventListener('change', () => recomputePlan());

  usePlanBtn.addEventListener('click', () => {
    if (!currentPlanResult || currentPlanResult.plan.sets.length === 0) return;
    applyPlanToGrid(currentPlanResult.plan.sets);
  });
  addSetBtn.addEventListener('click', () => {
    const rows = readSetRows();
    rows.push({});
    renderSetsRows(rows);
  });
  setCountInput.addEventListener('change', () => {
    let n = parseInt(setCountInput.value, 10) || 3;
    n = Math.max(1, Math.min(10, n));
    const rows = readSetRows();
    while (rows.length < n) rows.push({});
    rows.length = n;
    renderSetsRows(rows);
  });

  saveSessionBtn.addEventListener('click', saveSession);

  historyExerciseSelect.addEventListener('change', () => {
    renderHistoryTable(historyExerciseSelect.value || null);
  });

  profileUnit.addEventListener('change', updateProfileUnitLabels);

  saveProfileBtn.addEventListener('click', async () => {
    profile = {
      bodyweight: profileBodyweight.value ? Number(profileBodyweight.value) : null,
      height: profileHeight.value ? Number(profileHeight.value) : null,
      unit: profileUnit.value,
    };
    try {
      await saveProfile(profile);
      saveStatusFlash(saveProfileBtn, 'Saved.');
    } catch (err) {
      saveStatusFlash(saveProfileBtn, 'Save failed (sync unavailable).', true);
    }
    if (currentExercise) recomputePlan();
  });
}

// ---------------------------------------------------------------------------
// Auth (Supabase — Google sign-in, opt-in cloud sync)
// ---------------------------------------------------------------------------

function showAuthStatus(text, cls = '') {
  authStatusText.textContent = text;
  authStatusText.className = `auth-status ${cls}`.trim();
}

function updateAuthUI(user) {
  if (user) {
    showAuthStatus(`Synced as ${user.email || 'signed in'}`, 'synced');
    authActionBtn.textContent = 'Sign out';
  } else {
    showAuthStatus('Working locally — not synced', '');
    authActionBtn.textContent = 'Sign in with Google to sync';
  }
}

function maybeOfferMigration(user) {
  const count = user ? countLocalSessions() : 0;
  if (!user || count === 0) {
    migrateBanner.classList.add('hidden');
    return;
  }
  migrateCountEl.textContent = String(count);
  migrateBanner.classList.remove('hidden');
}

function wireAuthEvents() {
  if (!isSupabaseConfigured()) {
    authActionBtn.disabled = true;
    showAuthStatus('Sync not configured', '');
    return;
  }

  authActionBtn.addEventListener('click', async () => {
    authActionBtn.disabled = true;
    if (getActiveUser()) {
      try {
        await signOut();
        setActiveUser(null);
        updateAuthUI(null);
        migrateBanner.classList.add('hidden');
        await loadAndRenderAll();
      } catch (err) {
        showAuthStatus('Sign-out failed.', 'sync-error');
      } finally {
        authActionBtn.disabled = false;
      }
      return;
    }
    showAuthStatus('Redirecting to Google…', '');
    try {
      await signInWithGoogle();
      // The browser navigates away here — nothing after this line runs.
    } catch (err) {
      showAuthStatus('Sign-in failed.', 'sync-error');
      authActionBtn.disabled = false;
    }
  });

  migrateYesBtn.addEventListener('click', async () => {
    const user = getActiveUser();
    if (!user) return;
    migrateBanner.classList.add('hidden');
    showAuthStatus('Importing your local data…', '');
    try {
      await migrateLocalDataToCloud(user.id);
      clearLocalData();
      await loadAndRenderAll();
      showAuthStatus(`Synced as ${user.email || 'signed in'}`, 'synced');
    } catch (err) {
      showAuthStatus('Import failed — your local data is untouched.', 'sync-error');
    }
  });

  migrateNoBtn.addEventListener('click', () => {
    migrateBanner.classList.add('hidden');
  });
}

// Height is a length, not a weight — it never shares kg/lb's unit, so it
// follows the conventional metric/imperial pairing (kg -> cm, lb -> in)
// instead of literally reusing the weight unit.
function updateProfileUnitLabels() {
  const unit = profileUnit.value;
  bodyweightUnitLabel.textContent = unit;
  heightUnitLabel.textContent = unit === 'lb' ? 'in' : 'cm';
}

// ---------------------------------------------------------------------------
// Exercise picker
// ---------------------------------------------------------------------------

function onExerciseInput() {
  const q = exerciseInput.value;
  if (!q.trim()) {
    suggestionsEl.classList.remove('open');
    return;
  }
  const results = searchLibrary(q, 8);
  renderSuggestions(results);
}

function renderSuggestions(results) {
  if (results.length === 0) {
    suggestionsEl.classList.remove('open');
    suggestionsEl.innerHTML = '';
    return;
  }
  suggestionsEl.innerHTML = results
    .map((r) => `<div class="suggestion-item" data-name="${escapeHtml(r.name)}"><span>${escapeHtml(r.name)}</span><span class="mg-tag">${MUSCLE_GROUP_LABELS[r.muscleGroup]}</span></div>`)
    .join('');
  suggestionsEl.classList.add('open');
}

function onExerciseBlur() {
  // Slight delay so a suggestion click (mousedown) registers before the list closes.
  setTimeout(() => {
    suggestionsEl.classList.remove('open');
    const name = exerciseInput.value.trim();
    if (name) selectExercise(name);
  }, 120);
}

function selectExercise(name) {
  currentExercise = name;
  const mg = exerciseMeta[name] || findInLibrary(name)?.muscleGroup || guessMuscleGroup(name) || MUSCLE_GROUPS[0];
  muscleGroupSelect.value = mg;
  recomputePlan({ resetSelectors: true });
  if ([...historyExerciseSelect.options].some((o) => o.value === name)) {
    historyExerciseSelect.value = name;
    renderHistoryTable(name);
  }
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function recomputePlan({ resetSelectors = false } = {}) {
  if (!currentExercise) {
    planEmptyEl.classList.remove('hidden');
    todayPlanEl.classList.add('hidden');
    currentPlanResult = null;
    return;
  }

  const muscleGroup = muscleGroupSelect.value;

  if (resetSelectors) {
    // Default the goal dropdown from the last HYPERTROPHY-type session specifically —
    // not just whatever session happened most recently. Otherwise a strength-test
    // session (goal 'strength', 3-6 reps) would leak its rep-range goal onto the
    // next hypertrophy day's default, mismatching the plan actually being built.
    const exerciseLogs = logs.filter((l) => l.exerciseName === currentExercise).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const lastHypertrophySession = exerciseLogs.find((l) => l.type === 'hypertrophy');
    const readiness = getMuscleGroupReadiness(muscleGroup, logs, exerciseMeta);
    const rec = recommendSessionType({ exerciseName: currentExercise, logs, muscleGroupReadiness: readiness });
    sessionTypeSelect.value = rec.type;
    goalSelect.value = rec.type === 'strength' ? 'strength' : (lastHypertrophySession?.goal || 'hypertrophy');
  }

  const result = buildTodaysPlan({
    exerciseName: currentExercise,
    muscleGroup,
    goal: goalSelect.value,
    sessionTypeOverride: sessionTypeSelect.value,
    logs,
    exerciseMeta,
    profile,
  });
  currentPlanResult = result;
  renderPlan(result);
}

function renderPlan(result) {
  planEmptyEl.classList.add('hidden');
  todayPlanEl.classList.remove('hidden');

  const isStrength = result.sessionType === 'strength';
  sessionTypeBadge.textContent = isStrength ? 'Strength Test Day' : 'Hypertrophy Day';
  sessionTypeBadge.className = `tag ${isStrength ? 'tag-strength' : 'tag-hypertrophy'}`;
  sessionReasonEl.textContent = result.sessionRec.reason;

  readinessBadge.textContent = result.readiness.label;
  readinessBadge.className = `tag tag-${result.readiness.status}`;
  readinessReasonEl.textContent = result.readiness.reason;

  const decision = result.progression.decision;
  const decisionLabels = {
    increase: 'Add Load',
    decrease: 'Back Off',
    hold: 'Hold Steady',
    'hold-override': 'Hold Steady (recovery override)',
    seed: 'Establish Baseline',
  };
  progressionBadge.textContent = decisionLabels[decision] || decision;
  progressionBadge.className = `tag tag-${decision}`;
  progressionReasonEl.textContent = result.progression.reason;

  const headlineWeight = isStrength ? result.plan.workingSingle : result.plan.sets[0]?.weight;
  platePreviewEl.innerHTML = renderPlateStack(headlineWeight ?? null, result.unit);

  planTableBody.innerHTML = result.plan.sets
    .map((s) => {
      const rowClass = s.note?.toLowerCase().includes('failure') ? (isStrength ? 'set-backoff' : 'set-amrap') : '';
      return `<tr class="${rowClass}">
        <td>${s.setNumber}</td>
        <td>${formatWeight(s.weight, result.unit)}</td>
        <td>${s.targetReps}</td>
        <td class="set-note">${s.note || ''}</td>
      </tr>`;
    })
    .join('');

  if (result.plan.caveat) {
    planCaveatEl.innerHTML = `<p class="caveat">${escapeHtml(result.plan.caveat)}</p>`;
  } else {
    planCaveatEl.innerHTML = '';
  }
}

// ---------------------------------------------------------------------------
// Sets grid (log form)
// ---------------------------------------------------------------------------

function readSetRows() {
  return [...setsGrid.children].map((row) => ({
    weight: row.querySelector('.set-weight').value,
    reps: row.querySelector('.set-reps').value,
    rpe: row.querySelector('.set-rpe').value,
  }));
}

function renderSetsRows(rows) {
  setsGrid.innerHTML = rows
    .map(
      (r, i) => `
    <div class="set-row">
      <span class="set-index">${i + 1}</span>
      <input type="number" step="0.5" class="set-weight" value="${r.weight ?? ''}" placeholder="${r.weightPlaceholder ?? 'kg'}">
      <input type="number" step="1" class="set-reps" value="${r.reps ?? ''}" placeholder="${r.repsPlaceholder ?? 'reps'}">
      <input type="number" step="0.5" min="1" max="10" class="set-rpe" value="${r.rpe ?? ''}" placeholder="RPE">
      <button type="button" class="remove-set" data-index="${i}">&times;</button>
    </div>`
    )
    .join('');
  setCountInput.value = rows.length;
  setsGrid.querySelectorAll('.remove-set').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      const rows2 = readSetRows();
      rows2.splice(idx, 1);
      if (rows2.length === 0) rows2.push({});
      renderSetsRows(rows2);
    });
  });
}

function buildBlankGrid(n) {
  renderSetsRows(Array.from({ length: n }, () => ({})));
}

function applyPlanToGrid(planSets) {
  const rows = planSets.map((s) => ({
    weight: s.weight !== null && s.weight !== undefined ? s.weight : '',
    repsPlaceholder: String(s.targetReps),
  }));
  renderSetsRows(rows);
}

// ---------------------------------------------------------------------------
// Save session
// ---------------------------------------------------------------------------

function parseNumOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

async function saveSession() {
  if (!currentExercise) {
    saveStatusFlash(saveSessionBtn, 'Pick an exercise first.', true);
    return;
  }

  const sets = readSetRows()
    .map((r) => ({ weight: parseNumOrNull(r.weight), reps: parseNumOrNull(r.reps), rpe: parseNumOrNull(r.rpe) }))
    .filter((s) => s.weight !== null && s.reps !== null);

  if (sets.length === 0) {
    saveStatusFlash(saveSessionBtn, 'Enter at least one set (weight + reps).', true);
    return;
  }

  const entry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    date: todayStr(),
    exerciseName: currentExercise,
    goal: goalSelect.value,
    type: sessionTypeSelect.value,
    muscleGroup: muscleGroupSelect.value,
    unit: profile.unit || 'kg',
    sets,
  };

  saveSessionBtn.disabled = true;
  try {
    await appendSession(entry);
    logs.push(entry);
    await upsertExerciseMeta(currentExercise, muscleGroupSelect.value);
    exerciseMeta[currentExercise] = muscleGroupSelect.value;
    saveStatusFlash(saveSessionBtn, 'Session saved.');
  } catch (err) {
    saveStatusFlash(saveSessionBtn, 'Save failed — check your connection and try again.', true);
    return;
  } finally {
    saveSessionBtn.disabled = false;
  }

  recomputePlan({ resetSelectors: true });
  renderHistorySelectOptions();
  historyExerciseSelect.value = currentExercise;
  renderHistoryTable(currentExercise);
  buildBlankGrid(Math.max(1, Math.min(10, parseInt(setCountInput.value, 10) || 3)));
}

function saveStatusFlash(nearEl, text, isWarning = false) {
  saveStatusEl.textContent = text;
  saveStatusEl.style.color = isWarning ? 'var(--warn)' : 'var(--good)';
  clearTimeout(saveStatusFlash._t);
  saveStatusFlash._t = setTimeout(() => {
    saveStatusEl.textContent = '';
  }, 3500);
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function distinctExerciseNames() {
  const names = new Set(logs.map((l) => l.exerciseName));
  Object.keys(exerciseMeta).forEach((n) => names.add(n));
  return [...names].sort((a, b) => a.localeCompare(b));
}

function renderHistorySelectOptions() {
  const names = distinctExerciseNames();
  const prevValue = historyExerciseSelect.value;
  historyExerciseSelect.innerHTML = names.length
    ? names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')
    : '<option value="">— no exercises logged yet —</option>';
  if (names.includes(prevValue)) historyExerciseSelect.value = prevValue;
}

function renderHistoryTable(exerciseName) {
  const rows = logs
    .filter((l) => l.exerciseName === exerciseName)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!exerciseName || rows.length === 0) {
    historyTableBody.innerHTML = '';
    historyEmptyEl.classList.remove('hidden');
    return;
  }
  historyEmptyEl.classList.add('hidden');

  const currentUnit = profile.unit || 'kg';
  historyTableBody.innerHTML = rows
    .map((l) => {
      // Convert into the currently-selected unit rather than relabeling raw
      // numbers — a session logged in lb before a switch to kg must not be
      // displayed as if the same number were kg.
      const loggedUnit = l.unit || currentUnit;
      const setsText = l.sets
        .map((s) => `${formatWeight(convertWeight(s.weight, loggedUnit, currentUnit), currentUnit)}×${s.reps}`)
        .join(', ');
      const rpeValues = l.sets.map((s) => s.rpe).filter((v) => v !== null && v !== undefined && v !== '');
      const avgRpe = rpeValues.length ? (rpeValues.reduce((a, b) => a + Number(b), 0) / rpeValues.length) : null;
      const typeLabel = l.type === 'strength' ? 'Strength Test' : 'Hypertrophy';
      const goalLabel = l.type !== l.goal ? ` <span class="dim">(${l.goal} goal)</span>` : '';
      return `<tr>
        <td>${formatDateDisplay(l.date)}</td>
        <td>${typeLabel}${goalLabel}</td>
        <td>${setsText}</td>
        <td class="${avgRpe !== null && avgRpe >= 9.5 ? 'avg-rpe-high' : ''}">${avgRpe !== null ? avgRpe.toFixed(1) : '—'}</td>
      </tr>`;
    })
    .join('');

  renderHistoryCharts(exerciseName);
}

function computeChartPoints(exerciseName) {
  const currentUnit = profile.unit || 'kg';
  const ascending = logs
    .filter((l) => l.exerciseName === exerciseName)
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  // Working-weight trend is a hypertrophy-day concept (the submaximal weight
  // double progression tracks) — mixing in a strength test's near-1RM single
  // would read as a wild spike, the same cross-contamination bug already
  // fixed in the progression engine itself.
  const weightTrendPoints = ascending
    .filter((l) => l.type === 'hypertrophy')
    .map((l) => {
      const loggedUnit = l.unit || currentUnit;
      const convertedSets = l.sets.map((s) => ({ ...s, weight: convertWeight(s.weight, loggedUnit, currentUnit) }));
      const working = getWorkingSets(convertedSets);
      if (working.length === 0) return null;
      return { date: l.date, value: Math.round(working[0].weight * 100) / 100 };
    })
    .filter(Boolean);

  // Volume load (Σ weight×reps) is additive and comparable across session
  // types, so it includes both hypertrophy and strength-test sessions.
  const volumePoints = ascending.map((l) => {
    const loggedUnit = l.unit || currentUnit;
    const volume = l.sets.reduce((sum, s) => sum + convertWeight(s.weight, loggedUnit, currentUnit) * (Number(s.reps) || 0), 0);
    return { date: l.date, value: Math.round(volume) };
  });

  return { weightTrendPoints, volumePoints, unit: currentUnit };
}

function renderHistoryCharts(exerciseName) {
  if (!exerciseName) {
    chartSectionEl.classList.add('hidden');
    chartEmptyEl.classList.add('hidden');
    return;
  }

  const { weightTrendPoints, volumePoints, unit } = computeChartPoints(exerciseName);

  if (volumePoints.length < 2) {
    chartSectionEl.classList.add('hidden');
    chartEmptyEl.classList.remove('hidden');
    return;
  }
  chartEmptyEl.classList.add('hidden');
  chartSectionEl.classList.remove('hidden');

  renderWeightTrendChart(weightTrendChartEl, weightTrendPoints, unit);
  renderVolumeChart(volumeChartEl, volumePoints, unit);
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
