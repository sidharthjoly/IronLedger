# Methodology

Iron Ledger's recommendations are **evidence-informed heuristics, not
personalized medical or coaching advice.** Every rule below is a reasonable,
literature-aligned default — not a substitute for a coach who knows your
training history, injuries, sleep, and stress. Where the app makes a specific
numeric choice (an 8% back-off, a 14-day strength-test cooldown, a 2–4 day
"optimal" recovery window), that number is an engineering simplification of a
broader research finding, not something lifted verbatim from a single study.
Treat the citations below as further reading, not as proof that these exact
thresholds are optimal for any individual.

## Double progression

The core loop — chase reps at a fixed weight before adding load, and only add
load once every working set hits the top of the target rep range — is a
standard periodization pattern in strength & conditioning practice. It
gives a lifter a concrete, unambiguous signal for when to progress instead of
adding weight on a fixed schedule regardless of performance.

## RPE / RIR-based autoregulation

The app treats RPE (Rating of Perceived Exertion) as a proxy for Reps in
Reserve (RIR) — RPE 8 ≈ 2 reps left, RPE 9.5+ ≈ effectively at or past
failure — and uses it alongside rep count to decide whether a set was truly
"easy enough to progress" or "hard enough to back off," rather than judging
by rep count alone. This RPE/RIR framework for resistance training (distinct
from the older, cardio-oriented Borg scale) is described in:

- Helms, E.R., Cronin, J., Storey, A., & Zourdos, M.C. — *Application of the
  Repetitions in Reserve-Based Rating of Perceived Exertion Scale for
  Resistance Training*, Strength & Conditioning Journal (2016).
- Zourdos, M.C., et al. — *Novel Resistance Training-Specific Rating of
  Perceived Exertion Scale Measuring Repetitions in Reserve*, Journal of
  Strength and Conditioning Research (2016).

## Hypertrophy rep ranges and load

The app's default hypertrophy range (6–12 reps) is a common convention, not a
hard boundary — the literature broadly finds that hypertrophy occurs across a
wide range of loads (roughly 30–85%+ of 1RM) provided sets are taken close to
failure, with rep range mattering less than historically assumed:

- Schoenfeld, B.J., Grgic, J., Ogborn, D., & Krieger, J.W. — *Strength and
  Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A
  Systematic Review and Meta-analysis*, Journal of Strength and Conditioning
  Research (2017).
- Schoenfeld, B.J. — *The Mechanisms of Muscle Hypertrophy and Their
  Application to Resistance Training*, Journal of Strength and Conditioning
  Research (2010).

## Muscle-group readiness / training frequency

The readiness windows (0–1 days "recovering," 2–4 "optimal," 5–10 "ready,"
11+ "layoff") are a simplified stand-in for the finding that training a
muscle group roughly twice a week tends to out-perform once-weekly training
for hypertrophy, once weekly volume is held constant:

- Schoenfeld, B.J., Ogborn, D., & Krieger, J.W. — *Effects of Resistance
  Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review
  and Meta-Analysis*, Sports Medicine (2016).

This is explicitly **not** a fatigue-tracking system — it only knows the
calendar date of the last logged session for a muscle group, not sleep,
stress, nutrition, or how the last session actually felt. The app says so
directly in the UI.

## 1RM estimation (strength-test days)

The strength-test plan estimates a current one-rep max from a recent
submaximal set using the Epley formula:

```
estimated 1RM = weight × (1 + reps / 30)
```

widely attributed to strength coach Boyd Epley. Like all rep-max formulas, it
gets less accurate as rep count rises, which is why the app caps the reps
term at 12 before applying it, and why the generated plan explicitly caveats
that this is a ballpark estimate, not a tested max — the lift should stop if
bar speed or form breaks down, regardless of what the estimate said.

## What this app deliberately does not do

- It does not track fatigue, soreness, sleep, stress, nutrition, or injury —
  only calendar dates.
- It does not personalize thresholds to the individual; the same rules apply
  regardless of training age, sex, or genetics.
- It does not claim these specific numbers (8% back-off, 14-day cooldown,
  2.5kg/5lb increments) are independently validated — they're reasonable,
  literature-aligned defaults, not the output of a fitted model.
