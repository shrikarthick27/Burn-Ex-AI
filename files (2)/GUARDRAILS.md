# GUARDRAILS.md — Forbidden Actions & Constraints

## Data Guardrails
- External datasets ARE permitted (hackathon organizers explicitly allowed this due
  to time constraints). Any external dataset used MUST be accurately cited by name
  and source in the pitch/documentation — NEVER present external data as
  self-generated or self-recorded.
- NEVER call an external fitness/calorie API (Fitbit, Google Fit, MyFitnessPal, etc)
  at runtime. The problem statement explicitly forbids external API reliance for
  the live product — this is separate from the training-data sourcing question above.
- NEVER fabricate MET values, or silently invent participant/assumed weights beyond
  what's explicitly documented. If a dataset requires an assumed constant (e.g. no
  real per-person weight data available), that assumption must be stated in the
  script output and in `references/dataset_format.md` — not hidden.
- NEVER store or transmit raw video frames beyond what's needed for real-time pose
  extraction in the live demo — this breaks the privacy-preserving claim the product
  is built on. (This applies to the live product's own webcam input, separate from
  offline training-data sourcing.)

## Model Guardrails
- NEVER present the model's calorie output as medically precise. All UI copy showing
  calorie estimates should read as an estimate (e.g. "~220 kcal (estimate)"), not an
  exact figure.
- NEVER claim the avatar feature predicts actual physical body transformation. UI
  copy must frame it as illustrative/motivational only, not a literal forecast.

## Code Guardrails
- NEVER introduce a new major dependency not listed in AGENTS.md without flagging it
  to the user first — installing unexpected packages mid-hackathon risks breaking
  the environment under time pressure.
- NEVER silently change the feature set (Phase 1 outputs) after the training script
  (Phase 3) already depends on a fixed feature schema — this breaks the pipeline.
  If a feature needs to change, update both scripts together and note it.
- NEVER remove or bypass error handling around "no pose detected" states in the live
  demo — an uncaught crash during a live judged demo is the single worst failure mode.

## Scope Guardrails
- Do NOT expand to activities/exercises outside the fixed list in PRD.md without
  the user explicitly requesting it — scope creep is the biggest risk to finishing
  in a single hackathon session.
- Do NOT start Phase 5 (avatar) work before Phase 4 (live demo pipeline) is confirmed
  working end-to-end.
