# Spec — Engine Code Quality Fixes

## Problem

Two defects were identified in `app/simulator/engine.py` during project review:

1. **Silent validation swallowing**: All controlled-write helpers (`_w_sts`, `_w_out`, `_w_sns`, `_w_fault`, `_w_warn`, `_w_inputs`) catch `TagValidationError` and pass silently. Contract violations between the engine and the tag store become invisible, defeating the purpose of the ownership/validation layer.

2. **Unvalidated writes in manual jog handlers**: `_process_manual_jog_commands` mutates tag dicts directly (`out["grouped_count"] += 1`, `sts["cycle_phase"] = ...`, `sts["cycle_phase_progress"] = ...`), bypassing the validated write methods and the ownership model they enforce.

## Scope

IN scope:
- Log rejected tag writes (WARNING level) instead of silent `pass`.
- Convert jog-handler direct mutations to validated write helpers.

OUT of scope:
- Spec document re-sync (CAPTURED/TRANSFER phases, warning model).
- README updates.
- Magic-number extraction.
- Any behavior change to simulation logic.

## Constraints

- No behavioral change: writes that succeed today must succeed identically after the fix; only failure visibility changes.
- Follow existing logging convention from `app/shared/persistence.py`: module-level `log = logging.getLogger(__name__)`.
- All 159 existing tests must continue to pass.

## Verification

- `pytest` passes (159+ tests).
- Manual check: an intentionally invalid write produces a log record, not silence.
