# Phased Agent Prompts

Use these prompts in OpenCode, one phase at a time.

---

## Phase 1 Prompt — Shared Foundations

Read:
- `docs/specs/Simulation_Specifications.md`
- `docs/specs/State_Machine_Spec.md`
- `docs/specs/Tag_Interface_Spec.md`
- `docs/specs/Fault_Model.md`
- `docs/specs/Recipe_Model.md`

Task:
Improve the shared foundation layer.

Requirements:
- clean up `app/shared/enums.py`
- clean up `app/shared/models.py`
- clean up `app/shared/tag_store.py`
- extend config loading to support recipes, faults, and scenarios
- add lightweight validation helpers
- keep naming aligned with the written specs
- do not add UI or network complexity

Deliver:
- updated shared modules
- unit tests for config loading and tag store defaults

---

## Phase 2 Prompt — Simulator Core

Read:
- `docs/specs/Simulation_Specifications.md`
- `docs/specs/State_Machine_Spec.md`
- `docs/specs/Fault_Model.md`
- `docs/specs/Event_Schema.md`

Task:
Implement the behavioral tray packer simulator engine.

Requirements:
- implement top-level machine states
- implement internal cycle phases
- use recipes from config
- implement V1 faults
- implement reject-only events
- emit structured events
- keep the model behavioral, not mechanically exact

Deliver:
- improved `app/simulator/engine.py`
- any helper modules needed
- tests for transitions and faults

---

## Phase 3 Prompt — API Layer

Read:
- `docs/specs/Tag_Interface_Spec.md`
- `docs/specs/PLC_Sim_Connection_Spec.md`
- `docs/specs/HMI_Spec.md`

Task:
Build the API surface needed for dashboard and AI integration.

Requirements:
- expose state snapshot
- expose events
- accept command actions
- accept recipe selection
- keep JSON responses stable
- avoid auth and complex infrastructure in V1

Deliver:
- updated `app/api/server.py`
- integration tests for the main endpoints

---

## Phase 4 Prompt — Dashboard / HMI

Read:
- `docs/specs/HMI_Spec.md`
- `docs/specs/HMI_Screen_Flow.md`
- `docs/specs/Dashboard_App_Spec.md`

Task:
Create the first usable dashboard/HMI.

Requirements:
- Overview page first
- Start / Stop / Reset controls
- machine state badge
- active recipe display
- grouped count vs target
- good/reject counters
- active fault banner
- simple industrial dark theme
- respect PLC-style button enable logic

Deliver:
- dashboard app scaffold
- clear instructions to run it
- no extra pages unless the main flow works first

---

## Phase 5 Prompt — AI Foundation

Read:
- `docs/specs/AI_Features_Spec.md`
- `docs/specs/AI_Assistant_Scope.md`
- `docs/specs/Logging_and_Reporting_Spec.md`
- `docs/specs/Event_Schema.md`

Task:
Build the AI context and reporting foundation.

Requirements:
- current-state explanation context
- fault explanation prompt builder
- session summary prompt builder
- basic log Q&A context builder
- no direct machine control by AI

Deliver:
- improved `app/ai/context_builder.py`
- any helper modules needed
- simple tests for structured context output

---

## Phase 6 Prompt — PLC-Style Control Refinement

Read:
- `docs/specs/PLC_Control_Spec.md`
- `docs/specs/PLC_Tag_List.md`
- `docs/specs/Tag_Interface_Spec.md`

Task:
Refine the PLC-style controller layer.

Requirements:
- explicit permissive evaluation
- reset gating
- recipe change gating
- mode handling
- HMI helper flags
- keep control layer separate from simulator internals

Deliver:
- improved `app/control/controller.py`
- additional tests for control logic
