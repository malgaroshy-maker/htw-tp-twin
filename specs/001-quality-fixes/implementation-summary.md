# Implementation Summary — Engine Code Quality Fixes

## Result

All planned changes implemented and verified. No behavioral changes to simulation logic.

## Changes

### `app/simulator/engine.py`

1. **Logging for rejected tag writes** (T1, T2)
   - Added module-level `log = logging.getLogger(__name__)`, matching the existing convention in `app/shared/persistence.py:21`.
   - All six controlled-write helpers (`_w_sts`, `_w_out`, `_w_sns`, `_w_fault`, `_w_warn`, `_w_inputs`) now log a WARNING with group, key, value, and validation message instead of silently passing.

2. **Validated writes in manual jog handlers** (T3)
   - `_process_manual_jog_commands` no longer mutates tag dicts directly:
     - `out["grouped_count"] += 1` → `self._w_out(...)`
     - `sts["cycle_phase"] = ...` → `self._w_sts(...)` (blank feed jog, pack advance, error fallback)
     - `sts["cycle_phase_progress"] = 0.0` → `self._w_sts(...)`
   - Removed the now-unused `sts` local.

3. **Pre-existing lint debt removed** (T7, added during verification)
   - `ruff check` reported 3 F841 unused-variable errors that were verified pre-existing on HEAD (confirmed via `git stash` + re-check). Removed dead locals: `sns` in `_update_virtual_sensors`, `inputs` in `_process_commands`, `sts` in `_trigger_fault`.

## Verification Evidence

| Check | Result |
|---|---|
| `pytest -q` | 159 passed in 3.71s |
| `ruff check app\simulator\engine.py` | All checks passed |
| Spot-check invalid writes (`cycle_phase_progress=5.0`, `grouped_count=-1`, unknown sns key, invalid enum) | 4/4 produced visible WARNING log records |

## Notes

- No new warning noise appeared during the test run — confirming no latent invalid writes exist on normal execution paths.
- Out-of-scope findings (spec re-sync, README drift, magic-number extraction) remain open and were intentionally not touched per scope decision.
