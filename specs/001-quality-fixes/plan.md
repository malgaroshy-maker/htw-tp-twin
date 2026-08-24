# Plan — Engine Code Quality Fixes

## Approach

Minimal, surgical edits confined to `app/simulator/engine.py`.

### Change 1 — Logging in write helpers

Add at module level (matching `app/shared/persistence.py:21`):

```python
import logging
log = logging.getLogger(__name__)
```

Replace each `except TagValidationError: pass` block with a WARNING log that
includes the tag group, key, value, and validation message:

```python
except TagValidationError as exc:
    log.warning("Rejected %s write %s=%r: %s", "<group>", key, value, exc)
```

Affected helpers: `_w_sts`, `_w_out`, `_w_sns`, `_w_fault`, `_w_warn`, `_w_inputs`.

### Change 2 — Validated writes in jog handlers

In `_process_manual_jog_commands`:

| Current (direct mutation) | Replacement |
|---|---|
| `out["grouped_count"] += 1` | `self._w_out("grouped_count", out["grouped_count"] + 1)` |
| `sts["cycle_phase"] = CyclePhase.BLANK_FEED.value` | `self._w_sts("cycle_phase", CyclePhase.BLANK_FEED.value)` |
| `sts["cycle_phase_progress"] = 0.0` | `self._w_sts("cycle_phase_progress", 0.0)` |
| `sts["cycle_phase"] = new_phase.value` | `self._w_sts("cycle_phase", new_phase.value)` |
| `sts["cycle_phase"] = CyclePhase.IDLE.value` (except branch) | `self._w_sts("cycle_phase", CyclePhase.IDLE.value)` |

Pre-verified against `TagStore` validation rules (tag_store.py:193-215):
`cycle_phase` accepts enum string values; `cycle_phase_progress` accepts floats
in [0.0, 1.0]; `grouped_count` is a non-negative counter. All replacements are
valid, so no new log noise is expected in normal operation.

## Risks

- Latent invalid writes would now surface as warnings — this is the intended
  effect (defect detection), not a regression.
- None otherwise; no signatures or behavior change.

## Test strategy

1. Full suite: `pytest` (baseline: 159 passed).
2. Spot-check: trigger a deliberately invalid write via a small script and
   confirm a warning is logged.
3. Exercise manual jog paths via existing tests (`tests/test_manual_mode.py`).
