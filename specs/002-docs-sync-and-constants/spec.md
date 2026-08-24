# Spec — Docs Sync & Constants Extraction

## Problem

Three findings from project review remain open:

1. **Specs lag behind code**: Implemented `CyclePhase` enum includes `CAPTURED` and `TRANSFER`, but spec documents still list the old 5-phase model (`IDLE, GROUPING, BLANK_FEED, PACKING, DISCHARGE` — Simulation_Specifications additionally lists a nonexistent `REJECT_DISCHARGE`). The warning escalation model (`BLANK_LOW` → `BLANK_EMPTY` → latched `BLANK_MISSING`) and three configured faults (`REJECT_BIN_FULL`, `REJECT_BIN_NEAR_FULL`, `TRANSPORT_CHAIN_GAP`) are absent from `Fault_Model.md`.
2. **README drift**: Claims in-memory-only storage while SQLite persistence exists (`data/events.db`); React badge says 18, dashboard uses React 19; feature list omits the 2D/3D machine visualization.
3. **Magic numbers**: Cycle timing constants in `app/simulator/engine.py` (startup time, capture time, blank-feed and discharge sub-phase splits) are inline literals.

## Scope

IN scope:
- Update phase enumerations/definitions in: State_Machine_Spec, Tag_Interface_Spec, PLC_Tag_List, Simulation_Specifications.
- Add warning escalation + missing faults to Fault_Model.
- README corrections (badge, limitations, roadmap, features).
- Extract inline timing literals in engine.py to named module constants.

OUT of scope:
- Any behavior change to simulation timing (constants must equal current literal values).
- Config schema changes (no new recipe/config fields).
- OPC UA/WebSocket work.

## Constraints

- Code refactor is behavior-preserving: same values, same execution order.
- Specs describe what IS implemented (docs follow code this time, per review decision).
- All 159 tests must pass; ruff clean.

## Verification

- `pytest` green; `ruff check app/simulator/engine.py` clean.
- Grep audit: no spec file still lists the stale 5-phase enumeration.
