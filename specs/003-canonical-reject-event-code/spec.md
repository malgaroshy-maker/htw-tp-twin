# Spec — Canonical Reject Event Code

## Problem

The engine emits reject events as `PACK_REJECT_DIVERTED` while every spec document and one consumer expect `PACK_REJECT_DISCHARGED`:

- `app/reports/generator.py:30` counts rejects by matching `PACK_REJECT_DISCHARGED` — **real rejects are never counted in generated reports** (latent bug).
- `tests/test_reports.py:18` masks this by manually logging the doc-side code instead of driving the engine.
- `app/dashboard/src/features/simulation/SimulationView2D.tsx:44` consumes `PACK_REJECT_DIVERTED`.
- `docs/specs/Event_Schema.md`, `docs/specs/State_Machine_Spec.md` define `PACK_REJECT_DISCHARGED`.

## Decision

User selected: **`PACK_REJECT_DISCHARGED` is canonical** (matches all docs, symmetric with `PACK_GOOD_DISCHARGED`, fixes report counting with least churn).

## Scope

IN scope:
- Rename emission in `app/simulator/engine.py`.
- Update consumer string in `SimulationView2D.tsx`.

OUT of scope:
- Rewriting `tests/test_reports.py` to drive full engine cycles (works correctly post-fix).
- Doc changes (already correct).

## Constraints

- No other event codes touched.
- Tests green, ruff clean, dashboard lint passes.

## Verification

- Repo-wide grep: zero remaining `PACK_REJECT_DIVERTED` references.
- `pytest` green; `ruff check app/simulator/engine.py` clean; `npm run lint` clean.
