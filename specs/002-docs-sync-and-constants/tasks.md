# Tasks — Docs Sync & Constants Extraction

- [x] T1: Tag_Interface_Spec.md — STS_CYCLE_PHASE row + enumeration updated
- [x] T2: PLC_Tag_List.md — DB_STS.CyclePhase row + CyclePhase enumeration updated
- [x] T3: State_Machine_Spec.md §6 — CAPTURED/TRANSFER definitions added; sub-sequences documented; §10 fault set extended with 3 configured faults
- [x] T4: Simulation_Specifications.md §9/§10 — REJECT_DISCHARGE removed, CAPTURED/TRANSFER added, cycle flow aligned
- [x] T5: Fault_Model.md — §7 set extended, §13 response table extended, §13.1 Warning Escalation Model added
- [x] T6: README — React 19 badge, accurate persistence limitation, roadmap item 2 reframed, features mention 2D/3D visualization + SQLite persistence
- [x] T7: engine.py — 11 timing literals extracted to named module constants (values unchanged)
- [x] T8: Verify — pytest 159 passed; ruff clean; constants assert-equal to original literals; stale-enumeration grep audit clean
