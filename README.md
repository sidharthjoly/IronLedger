# Iron Ledger

[![tests](https://github.com/SidharthJoly/IronLedger/actions/workflows/tests.yml/badge.svg)](https://github.com/SidharthJoly/IronLedger/actions/workflows/tests.yml)

A personal strength-training log that tells you exactly what to lift next
session — full set-by-set prescriptions, not just one number — instead of
just recording what you did.

## The idea

Most training logs are spreadsheets: you write down what happened, and
figuring out what to do *next* is on you. Iron Ledger logs the same data
(exercise, per-set weight/reps/RPE) but also acts on it — applying
evidence-informed progression principles a coach would use, then handing
back an actual plan:

- **Double progression + RPE autoregulation** — decides whether to add
  weight, hold steady and chase more reps, or back off, based on whether
  your working sets hit the top or bottom of the target rep range and how
  hard they felt (RPE).
- **Muscle-group readiness** — tracks how long it's been since each muscle
  group was last trained and won't prescribe a load increase onto a group
  that hasn't recovered yet, even if the numbers alone say to.
- **Periodization** — decides whether a session should be a standard
  hypertrophy day or a periodized strength-test day (a 1RM estimate off
  recent hypertrophy sets, a warm-up ramp, a working single, and back-off
  sets), on its own cadence.
- **Plate-loading visual** — renders the prescribed weight as a stack of
  plates, biggest closest to the collar, the way you'd actually load the bar.
- **Progress charts** — a working-weight trend line (hypertrophy sessions
  only — a strength test's near-1RM single is a different kind of number and
  would otherwise read as a spike) and a per-session volume-load bar chart.

Every recommendation shows its reasoning in plain text, and the app is
explicit that this is a general heuristic, not personalized medical or
coaching advice — it doesn't know your sleep, stress, or injury history. See
[METHODOLOGY.md](METHODOLOGY.md) for the sports-science background behind
each heuristic and its citations.

## Stack

Vanilla HTML/CSS/JS (ES modules, no framework, no build step) + localStorage
for persistence. Same no-build-step philosophy as
[ClassSniper](https://github.com/SidharthJoly/ClassSniper).

## Running it

Any static file server works, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Testing

No test framework or Node dependency — tests are plain HTML pages
(`tests/unit.html`, `tests/dom.html`) that assert into the DOM and run in a
real browser, headless in CI:

```
bash tests/run.sh
```

`tests/unit.html` exercises every heuristic module directly (progression,
readiness, periodization, the strength/hypertrophy plan generator, the
exercise-library guesser, unit conversion, the plate stack and progress
charts). `tests/dom.html` drives the actual app end to end in an iframe —
selecting an exercise, logging sessions, and checking what lands in
`localStorage` and the rendered DOM.

## Data model

- **Exercise entry** (per logged session): `{ date, goal, type, sets: [{ weight, reps, rpe }] }`
  — weight is tracked per set (not one flat number per session) to support
  ramping/pyramid sets, warm-ups, and drop sets.
- **Exercise metadata**: muscle group, either picked from the built-in
  ~90-exercise library or guessed from the exercise name.
- **Profile** (optional, never required): bodyweight, height, and a kg/lb
  unit toggle. Height is tracked in cm or in — paired with the weight unit's
  metric/imperial convention, never literally reused as kg/lb. Bodyweight and
  height are informational only right now; nothing in the app currently
  calculates from them.

All data stays in the browser's `localStorage`; nothing is sent anywhere.

## License

MIT — see [LICENSE](LICENSE).
