# Implementation Summary — Canonical Reject Event Code

## Decision

`PACK_REJECT_DISCHARGED` is the canonical reject event code (user-selected).

## Changes

| File | Change |
|---|---|
| `app/simulator/engine.py` | Reject discharge event now emitted as `PACK_REJECT_DISCHARGED` |
| `app/dashboard/src/features/simulation/SimulationView2D.tsx` | Transient-pack animation consumer updated to match |

No changes needed in:
- `app/reports/generator.py` — its existing `PACK_REJECT_DISCHARGED` match now receives real engine events, **fixing the latent bug where generated reports never counted rejects**.
- Spec docs — already defined `PACK_REJECT_DISCHARGED`.
- `tests/test_reports.py` — remains valid; previously masked the mismatch by logging the doc-side code directly.

## Verification Evidence

| Check | Result |
|---|---|
| `pytest -q` | 159 passed |
| `ruff check app/simulator/engine.py` | All checks passed |
| `npm run lint` (dashboard) | Clean |
| Repo-wide grep for `PACK_REJECT_DIVERTED` | Only historical mentions inside spec-folder docs; zero code references |
