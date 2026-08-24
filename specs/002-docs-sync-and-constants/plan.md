# Plan — Docs Sync & Constants Extraction

## A. Spec re-sync (docs follow code)

Authoritative facts (from `app/shared/enums.py`, `configs/faults.json`, engine):

- CyclePhase enum: `IDLE, GROUPING, CAPTURED, BLANK_FEED, TRANSFER, PACKING, DISCHARGE`
  - CAPTURED: formation captured by stopper/terminal; waits for transfer gap + blank before BLANK_FEED
  - TRANSFER: blank moved from feed position into pack zone
  - Reject handling occurs inside DISCHARGE sub-phases (no separate REJECT_DISCHARGE phase)
- Warnings: `BLANK_LOW` (<20 blanks), `BLANK_EMPTY` (0 blanks / supply off); escalate to latched `BLANK_MISSING` after 3 production cycles unresolved
- Additional configured faults: `REJECT_BIN_FULL` (FAULT, latching, reset denied until bin cleared), `REJECT_BIN_NEAR_FULL` (WARNING at 2 accumulated rejects), `TRANSPORT_CHAIN_GAP` (FAULT during discharge outlet check)

Edits:
1. `State_Machine_Spec.md` §6 — insert CAPTURED and TRANSFER definitions; note internal sub-sequences; extend §10 fault set with the three new faults.
2. `Tag_Interface_Spec.md` — STS_CYCLE_PHASE row + enumeration list.
3. `PLC_Tag_List.md` — DB_STS.CyclePhase row + CyclePhase enumeration.
4. `Simulation_Specifications.md` §9/§10 — replace REJECT_DISCHARGE with CAPTURED/TRANSFER; align cycle flow steps.
5. `Fault_Model.md` — add warning escalation section; add three faults to §7 set, §13 response table, and brief definitions.

## B. README corrections

- Badge React 18 → 19.
- Limitations: replace "In-Memory Storage" with accurate statement (events/sessions persisted to SQLite `data/events.db`; live tags remain in-process).
- Roadmap item 2 (persistence) → mark SQLite done, reframe as retention/PostgreSQL hardening.
- Features: mention 2D top-down + 3D machine visualization under HMI bullet.

## C. Constants extraction (`app/simulator/engine.py`)

Add module constants (values identical to current literals):

```python
STARTUP_TIME_SEC = 1.0
CAPTURE_TIME_SEC = 0.3
BLANK_MAGAZINE_CHECK_SEC = 0.05
BLANK_SUCTION_SPLIT = 0.40
BLANK_POSITION_SPLIT = 0.40
BLANK_PROG_OFFSET_SUCTION = 0.05
BLANK_PROG_OFFSET_POSITION = 0.45
DISCHARGE_OUTLET_CHECK_SPLIT = 0.20
DISCHARGE_QUALITY_SPLIT = 0.30
DISCHARGE_TRAVEL_SPLIT = 0.50
```

Substitute at use sites only; no logic restructuring.

## Risks

- Doc edits could introduce contradictions if partial — mitigated by final grep audit for stale enumerations.
- Constant extraction is mechanical; pytest guards behavior.
