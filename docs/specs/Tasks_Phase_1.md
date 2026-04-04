# Tasks — Phase 1

## Phase 1 Goal
Build the **foundation and simulator MVP** for the Simplified Tray Packer Digital Twin Platform.

At the end of Phase 1, the project should have:
- a clean repository structure
- a working Python simulator app
- a finite-state machine for machine behavior
- core recipe support
- basic faults and recovery behavior
- structured event logging
- a usable animated demo
- baseline docs and configuration files

Phase 1 intentionally focuses on the **simulator foundation**, not the full dashboard, AI module, or Siemens integration.

---

## Phase 1 Scope

### In scope
- repository structure
- coding conventions
- simulator architecture skeleton
- machine state model
- cycle logic
- grouping logic
- blank feed logic
- pack creation
- reject path
- base recipes
- core faults
- run/start/stop/reset/run-empty behavior
- structured event generation
- local file logging
- simple 2D animation
- developer-friendly configuration files

### Out of scope
- full web dashboard
- advanced AI assistant
- OPC UA/MQTT live integration
- Siemens PLC implementation
- WinCC HMI implementation
- advanced training mode
- motion-accurate continuous kinematics

---

## Phase 1 Deliverables

### Required files and modules
- `README.md`
- `docs/Architecture.md`
- `docs/Event_Schema.md`
- `docs/Assumptions.md`
- `docs/Decisions.md`
- `src/simulator/main.py`
- `src/simulator/engine/`
- `src/simulator/models/`
- `src/simulator/config/recipes/`
- `src/simulator/config/faults/`
- `src/simulator/logging/`
- `src/simulator/ui/`
- `tests/`

### Required working behaviors
- machine can start, stop, reset, and run empty
- machine can switch between at least 3 recipes
- products visibly enter and group
- pack cycles occur when conditions are met
- good packs and rejected packs are counted separately
- at least 4 core fault scenarios are supported
- logs are emitted as structured events
- simulator UI clearly shows current state and counters

---

## Execution order

### Step 1 — Foundation
Set up the repository, project layout, coding standards, and configuration structure.

### Step 2 — Core machine logic
Implement the state machine, machine commands, cycle phases, and fault handling.

### Step 3 — Flow and animation
Implement product spawning, grouping, pack discharge, reject flow, and visual rendering.

### Step 4 — Logging and validation
Implement structured logs, local persistence, and basic tests.

### Step 5 — MVP polish
Improve usability, debug behavior, and document assumptions.

---

# Detailed task list

## 1. Repository and project setup
- [ ] Create top-level project folders for docs, simulator code, configs, tests, and assets.
- [ ] Define Python version target.
- [ ] Create dependency file (`requirements.txt` or equivalent).
- [ ] Add formatter/linter configuration.
- [ ] Define naming conventions for modules, configs, events, and tags.
- [ ] Create starter README with project overview and run instructions.
- [ ] Add `.gitignore` for Python, editor files, logs, and temporary outputs.

### Definition of done
- repo structure exists
- project runs locally with one command
- base developer docs exist

---

## 2. Simulator architecture skeleton
- [ ] Create simulator entry point.
- [ ] Create `MachineEngine` skeleton.
- [ ] Create `FlowEngine` skeleton.
- [ ] Create UI/rendering module skeleton.
- [ ] Create event logger skeleton.
- [ ] Create configuration loader for recipes and faults.
- [ ] Add central simulation clock/tick loop.

### Definition of done
- simulator launches successfully
- app loop runs without machine behavior yet
- architecture is separated into clear modules

---

## 3. Machine state model
- [ ] Define canonical machine states:
  - `STOPPED`
  - `STARTING`
  - `RUNNING`
  - `STARVED`
  - `BLOCKED`
  - `FAULTED`
  - `MANUAL`
  - `RUN_EMPTY`
- [ ] Define allowed state transitions.
- [ ] Implement state transition rules.
- [ ] Emit event log on every state change.
- [ ] Document transition assumptions in `docs/Assumptions.md`.

### Definition of done
- state changes are explicit and testable
- invalid transitions are blocked
- state changes appear in logs and UI

---

## 4. Core machine commands
- [ ] Implement `start` command.
- [ ] Implement `stop` command.
- [ ] Implement `reset` command.
- [ ] Implement `run_empty` command.
- [ ] Implement recipe select command.
- [ ] Define what commands are allowed in each state.
- [ ] Log all operator command events.

### Definition of done
- commands work consistently
- invalid command attempts are handled safely
- commands are visible in logs

---

## 5. Recipe system
- [ ] Define recipe schema.
- [ ] Create at least 3 recipe files:
  - `24-pack`
  - `27-pack`
  - `30-pack`
- [ ] Include per-recipe values for:
  - product count
  - grouping shape
  - cycle time
  - reject probability
  - jam probability
  - product arrival rate
- [ ] Implement runtime recipe loading.
- [ ] Implement recipe switching.
- [ ] Log recipe change events.

### Definition of done
- recipes are externalized in config files
- simulator behavior changes when recipe changes
- invalid recipe data is detected gracefully

---

## 6. Product flow and grouping
- [ ] Implement product spawning on infeed.
- [ ] Implement product movement through visible infeed path.
- [ ] Implement capture of products into grouping zone.
- [ ] Implement grouping completion logic based on recipe count.
- [ ] Implement product starvation behavior when feed is unavailable.
- [ ] Define visual grouping layout by recipe.

### Definition of done
- products visibly appear and move
- products accumulate into grouped formation
- machine waits for enough product before cycle start

---

## 7. Blank feed and cycle initiation
- [ ] Implement blank availability flag.
- [ ] Implement blank feed stage before packing.
- [ ] Implement blank-missing behavior.
- [ ] Animate blank entering pack zone.
- [ ] Prevent cycle start when blank is unavailable.

### Definition of done
- blank is part of the visible cycle
- machine cannot complete a cycle without blank availability
- blank shortage behavior is clearly visible and logged

---

## 8. Pack cycle and discharge
- [ ] Implement cycle phase model:
  - `idle`
  - `blank_in`
  - `packing`
  - `discharge`
- [ ] Implement simplified pack creation.
- [ ] Implement good pack discharge.
- [ ] Implement reject discharge lane.
- [ ] Increment counters correctly.
- [ ] Log cycle start and cycle complete events.

### Definition of done
- machine produces visible packs
- packs go to good or reject path
- counters are consistent with visible events

---

## 9. Fault model — MVP
Implement at minimum these faults:
- [ ] `NO_PRODUCT / STARVED`
- [ ] `BLANK_MISSING`
- [ ] `INCOMPLETE_FORMATION`
- [ ] `DOWNSTREAM_BLOCKED`
- [ ] `GAP_CONTROL_JAM`

For each fault:
- [ ] define trigger condition
- [ ] define machine response
- [ ] define whether it is reject-only or stop-causing
- [ ] define reset/recovery logic
- [ ] define event payload

### Definition of done
- each MVP fault can be triggered naturally or manually
- machine response matches the specification
- reset/recovery path is visible and testable

---

## 10. Counters and metrics
- [ ] Implement cycle count.
- [ ] Implement good pack count.
- [ ] Implement reject count.
- [ ] Implement runtime timer.
- [ ] Implement downtime timer.
- [ ] Implement active fault indicator.
- [ ] Implement current phase indicator.

### Definition of done
- counters update correctly
- timers reflect state behavior reasonably
- metrics match visible simulation behavior

---

## 11. Event logging
- [ ] Define base event schema.
- [ ] Implement event emission for:
  - state changes
  - operator commands
  - recipe changes
  - cycle start
  - cycle complete
  - good pack complete
  - reject event
  - fault trigger
  - fault reset
- [ ] Add local JSONL or CSV export.
- [ ] Create session log directory structure.
- [ ] Timestamp every event.

### Definition of done
- logs are structured and machine-readable
- a complete session can be reviewed after runtime
- event stream is usable later by dashboard and AI modules

---

## 12. Animation and user interface
- [ ] Create basic machine layout:
  - infeed
  - grouping zone
  - blank magazine
  - pack zone
  - outfeed
  - reject lane
- [ ] Add color-coded machine state panel.
- [ ] Add status/counter panel.
- [ ] Add fault/message area.
- [ ] Add keyboard or button controls for commands.
- [ ] Ensure animation remains readable and smooth.

### Definition of done
- user can understand machine behavior visually
- state, counters, and faults are visible without reading logs
- interface is stable during normal operation and faults

---

## 13. Manual controls and demo controls
- [ ] Add manual toggles for product feed on/off.
- [ ] Add manual toggle for blank availability.
- [ ] Add manual toggle for downstream blocked/free.
- [ ] Add manual recipe selection.
- [ ] Add manual fault injection shortcuts.
- [ ] Document controls in README.

### Definition of done
- demo scenarios can be reproduced quickly
- controls make testing easier

---

## 14. Tests and validation
- [ ] Add unit tests for state transitions.
- [ ] Add tests for cycle completion logic.
- [ ] Add tests for counter correctness.
- [ ] Add tests for fault-to-state behavior.
- [ ] Add simple smoke test for simulator startup.
- [ ] Validate recipe loading and schema handling.

### Definition of done
- core machine logic has automated coverage
- major regressions are caught early

---

## 15. Documentation updates during Phase 1
- [ ] Create `docs/Architecture.md`.
- [ ] Create `docs/Event_Schema.md`.
- [ ] Create `docs/Assumptions.md`.
- [ ] Create `docs/Decisions.md`.
- [ ] Update README with setup, controls, and simulator scope.
- [ ] Document known simplifications and non-goals.

### Definition of done
- agents and humans can understand how the MVP works without reverse-engineering the code

---

# Suggested folder structure for Phase 1

```text
project-root/
├─ docs/
│  ├─ Architecture.md
│  ├─ Event_Schema.md
│  ├─ Assumptions.md
│  └─ Decisions.md
├─ src/
│  └─ simulator/
│     ├─ main.py
│     ├─ engine/
│     │  ├─ machine_engine.py
│     │  ├─ flow_engine.py
│     │  ├─ state_machine.py
│     │  └─ timing.py
│     ├─ models/
│     │  ├─ recipe.py
│     │  ├─ fault.py
│     │  ├─ product.py
│     │  └─ pack.py
│     ├─ config/
│     │  ├─ recipes/
│     │  └─ faults/
│     ├─ logging/
│     │  ├─ event_logger.py
│     │  └─ session_writer.py
│     └─ ui/
│        ├─ renderer.py
│        ├─ layout.py
│        └─ controls.py
├─ tests/
├─ assets/
├─ requirements.txt
└─ README.md
```

---

# Priority order inside Phase 1

## P0 — must finish for MVP
- repository structure
- simulator skeleton
- machine state model
- core commands
- recipe system
- product flow and grouping
- blank feed
- pack cycle
- 4–5 base faults
- counters
- structured logs
- basic animation

## P1 — strong improvements inside Phase 1
- better UI polish
- runtime recipe switching
- manual fault injection
- local session export
- automated tests
- richer assumptions and decisions docs

## P2 — only if time remains
- visual polish
- sound/alert effects
- save/load session state
- more nuanced startup/warmup behavior

---

# Phase 1 exit criteria
Phase 1 is complete when all of the following are true:

1. The simulator launches and runs reliably.
2. The machine can start, stop, reset, and run empty.
3. At least three recipes are selectable and influence behavior.
4. Products visibly group before each cycle.
5. A visible blank feed is part of the cycle.
6. Good packs and rejected packs are separated correctly.
7. At least four meaningful fault scenarios are implemented.
8. State changes, faults, recipe changes, and cycle events are logged in structured format.
9. The UI clearly communicates machine status and counters.
10. The codebase is organized well enough for OpenCode agents to continue Phase 2.

---

# Recommended next file after this
After finishing this file, the next best file is:
- `Tasks_Phase_2.md`

Then:
- `Architecture.md`
- `Event_Schema.md`
- `Tag_Interface_Spec.md`
- `AI_Features_Spec.md`
