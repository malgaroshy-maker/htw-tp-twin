# Implementation Summary — Docs Sync & Constants Extraction

## Result

All three open findings resolved. No behavioral changes.

## A. Spec Re-Sync (docs now match implementation)

| File | Change |
|---|---|
| `docs/specs/Tag_Interface_Spec.md` | STS_CYCLE_PHASE row + enumeration now include CAPTURED, TRANSFER |
| `docs/specs/PLC_Tag_List.md` | DB_STS.CyclePhase row + CyclePhase enumeration updated |
| `docs/specs/State_Machine_Spec.md` | §6: CAPTURED/TRANSFER definitions, BLANK_FEED/DISCHARGE internal sub-sequences documented; §10: REJECT_BIN_NEAR_FULL, REJECT_BIN_FULL, TRANSPORT_CHAIN_GAP added |
| `docs/specs/Simulation_Specifications.md` | §9: nonexistent REJECT_DISCHARGE removed, CAPTURED/TRANSFER added with descriptions; §10 cycle flow steps aligned |
| `docs/specs/Fault_Model.md` | §7 set extended to 9 faults; §13 response table extended; new §13.1 Warning Escalation Model (BLANK_LOW / BLANK_EMPTY → latched BLANK_MISSING after 3 cycles) |

## B. README Corrections

- React badge 18 → 19.
- "In-Memory Storage" limitation replaced with accurate statement: events/sessions persist to SQLite (`data/events.db`); live tags/counters remain in-process.
- Roadmap item 2 reframed from "replace in-memory logger" (done) to retention/query hardening + optional PostgreSQL.
- Key Features now mention 2D top-down + 3D visualizations and session persistence.

## C. Constants Extraction (`app/simulator/engine.py`)

11 inline literals replaced with named module constants: `STARTUP_TIME_SEC`, `CAPTURE_TIME_SEC`, `BLANK_MAGAZINE_CHECK_SEC`, `BLANK_SUCTION_SPLIT`, `BLANK_POSITION_SPLIT`, `BLANK_PROG_OFFSET_SUCTION`, `BLANK_PROG_OFFSET_POSITION`, `DISCHARGE_OUTLET_CHECK_SPLIT`, `DISCHARGE_QUALITY_SPLIT`, `DISCHARGE_TRAVEL_SPLIT`. Values verified identical to originals via assertion script.

## Verification Evidence

| Check | Result |
|---|---|
| `pytest -q` | 159 passed |
| `ruff check app/simulator/engine.py` | All checks passed |
| Constants equal original literals | asserted OK |
| Stale-enumeration audit (`REJECT_DISCHARGE`, `IDLE, GROUPING, BLANK_FEED`) | only legitimate event-code matches remain |

## Newly Discovered (out of scope, noted for future)

- Engine emits event code `PACK_REJECT_DIVERTED` while docs reference `PACK_REJECT_DISCHARGED`. Resolving requires deciding whether to rename the code (consumers: dashboard/AI/tests) or update docs — left untouched deliberately.
