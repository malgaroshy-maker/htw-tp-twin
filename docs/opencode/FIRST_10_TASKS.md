# First 10 Tasks for OpenCode

These are the first tasks agents should execute in order.

---

## Task 1 — Validate and clean shared models

Goal:
make sure `app/shared/enums.py`, `models.py`, and `tag_store.py` match the specs.

Required work:
- review current enums
- add missing fields if necessary
- ensure default tag snapshot matches the tag interface spec
- add docstrings and types

Done when:
- tag store snapshot is stable
- no obvious naming mismatch with specs

---

## Task 2 — Add config loader for scenarios

Goal:
complete configuration loading foundation.

Required work:
- extend `config_loader.py` to load `scenarios.json`
- add basic validation for recipes/faults/scenarios

Done when:
- all three config files load cleanly
- invalid structures fail clearly

---

## Task 3 — Add event helper utilities

Goal:
standardize event creation.

Required work:
- create helper for building `EventRecord`
- standardize event codes and timestamps
- create minimal in-memory event log list/store

Done when:
- simulator can emit structured events consistently

---

## Task 4 — Complete simulator state transitions

Goal:
make core top-level states behave correctly.

Required work:
- implement STOPPED, STARTING, RUNNING, RUN_EMPTY, STARVED, BLOCKED, FAULTED
- ensure transitions follow `State_Machine_Spec.md`

Done when:
- start/stop/reset flow works
- starved/blocked/faulted are distinguishable

---

## Task 5 — Implement cycle phase logic

Goal:
make the machine actually behave like a tray packer.

Required work:
- implement IDLE, GROUPING, BLANK_FEED, PACKING, DISCHARGE
- use recipe target counts
- increment grouped count and counters properly

Done when:
- simulator produces believable cycles

---

## Task 6 — Implement V1 faults and reject behavior

Goal:
add realistic abnormal behavior.

Required work:
- implement STARVATION
- implement DOWNSTREAM_BLOCK
- implement BLANK_MISSING
- implement GAP_CONTROL_JAM
- implement reject-only events for INCOMPLETE_PACK / OPEN_FLAP

Done when:
- faults affect machine state correctly
- reject events do not stop the machine

---

## Task 7 — Improve API surface

Goal:
make the system easy to inspect and control.

Required work:
- keep `/health`
- keep `/state`
- keep `/command`
- keep `/recipe`
- add `/events`
- add simple session/reset endpoint if needed

Done when:
- frontend or test scripts can fully drive the simulator through API

---

## Task 8 — Add integration tests

Goal:
lock down machine behavior.

Required work:
- start transition test
- stop/run-empty test
- reset test
- blank missing test
- jam fault test
- recipe change restriction test

Done when:
- tests cover main behavioral contract

---

## Task 9 — Build basic dashboard UI

Goal:
make the project visible and interactive.

Required work:
- show machine state
- show recipe
- show grouped count
- show good/reject counters
- add Start / Stop / Reset
- show active fault text

Done when:
- a user can run a full demo through the UI

---

## Task 10 — Add AI context and summary actions

Goal:
deliver the first “modern” layer of the product.

Required work:
- build current-state context builder
- build fault explanation prompt
- build session summary prompt
- expose a basic route or action for these

Done when:
- the system can explain a stop and summarize a session
