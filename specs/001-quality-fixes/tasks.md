# Tasks — Engine Code Quality Fixes

- [x] T1: Add module-level logger to `app/simulator/engine.py` (match persistence.py convention)
- [x] T2: Replace silent `except TagValidationError: pass` with WARNING logs in all six `_w_*` helpers
- [x] T3: Convert `_process_manual_jog_commands` direct dict mutations to validated write helpers
- [x] T4: Run full test suite (`pytest`) — 159 passed
- [x] T5: Verify invalid writes now log (spot-check script) — 4/4 rejected writes produced WARNING records
- [x] T6: Write implementation-summary.md
- [x] T7 (added): Remove 3 pre-existing unused locals flagged by `ruff check` so the lint gate passes
