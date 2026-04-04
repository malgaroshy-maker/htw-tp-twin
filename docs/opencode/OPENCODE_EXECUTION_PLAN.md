# OpenCode Execution Plan

## Purpose

This file gives OpenCode agents a practical execution order for building the tray packer digital twin project.

It is designed to reduce:
- architectural drift
- duplicated work
- overengineering
- confusion between simulator, PLC-style control, dashboard, and AI layers

This plan assumes the repo scaffold already exists.

---

## Core Build Principle

Build the project in this order:

1. shared foundations
2. simulator behavior
3. API and live state access
4. dashboard/HMI
5. AI explanation/reporting
6. PLC-style control refinement
7. scenarios, logging, and polish

Do not start with:
- advanced AI
- industrial protocol adapters
- exact PLC/HMI vendor implementation
- detailed animation polish

---

## Phase 0 — Read and Align

Before coding, every agent should read:

1. `docs/specs/PRD.md`
2. `docs/specs/Simulation_Specifications.md`
3. `docs/specs/State_Machine_Spec.md`
4. `docs/specs/Tag_Interface_Spec.md`
5. `docs/specs/Fault_Model.md`
6. `docs/specs/Recipe_Model.md`
7. `docs/specs/PLC_Control_Spec.md`
8. `docs/specs/HMI_Spec.md`
9. `docs/specs/AI_Features_Spec.md`
10. `docs/specs/Decisions_and_Assumptions.md`

Deliverable:
- no code changes yet
- shared understanding of scope and boundaries

---

## Phase 1 — Shared Foundations

Goal:
establish a stable data model used by every layer.

Build:
- enums
- dataclasses/models
- tag store
- recipe loader
- fault loader
- scenario loader
- event record utilities
- simple validation helpers

Required outputs:
- stable shared types
- stable tag snapshot structure
- configs loading cleanly
- tests for config loading and core model validity

Do not add:
- UI
- network complexity
- advanced animation

---

## Phase 2 — Simulator Core

Goal:
build a believable behavioral tray packer machine engine.

Build:
- top-level machine states
- internal cycle phases
- recipe-driven grouping logic
- cycle timing
- fault injection hooks
- reject behavior
- runtime/downtime counting
- event emission
- run-empty behavior

Required outputs:
- engine update loop
- start/stop/reset behavior
- recipe change behavior
- faulted/starved/blocked behavior
- events generated consistently

Do not add:
- full 2D animation complexity yet
- exact mechanical physics
- real industrial protocol integrations

---

## Phase 3 — API and Live Access

Goal:
make simulator state and commands accessible.

Build:
- status endpoint
- command endpoint
- recipe endpoint
- health endpoint
- optional tick or run control endpoint
- consistent JSON responses

Required outputs:
- API returns shared state snapshot
- command handling respects PLC-style rules
- basic integration tests

Do not add:
- authentication
- multi-user complexity
- database dependency unless needed

---

## Phase 4 — Dashboard / HMI

Goal:
create a usable operator-facing web UI.

Build:
- Overview page
- Control section
- Fault banner/panel
- Recipe view
- Production counters panel
- Diagnostics panel
- AI placeholder panel

Required outputs:
- Start / Stop / Reset flow works
- state is visible live
- machine feels like an industrial interface
- colors and labels align with specs

Do not add:
- overly complex charting first
- too many pages before main flow works

---

## Phase 5 — AI Foundation

Goal:
make the project feel modern and useful.

Build:
- AI context builder
- fault explanation prompt pipeline
- session summary prompt pipeline
- basic log Q&A context pipeline
- report-ready structured summaries

Required outputs:
- explain current fault
- summarize session
- answer basic operational questions using structured context

Do not add:
- direct machine command execution by AI
- speculative reasoning without structured grounding

---

## Phase 6 — PLC-Style Control Refinement

Goal:
make the control layer feel more industrial and explicit.

Build:
- stronger permissive evaluation
- clearer mode handling
- recipe gating rules
- reset gating rules
- HMI helper flags
- controller tests

Required outputs:
- PLC-style control is distinct from simulator
- command ownership is clear
- HMI button enable logic is stable

Do not add:
- full vendor-specific PLC code unless explicitly requested

---

## Phase 7 — Scenarios, Logging, and Reports

Goal:
make the project richer for demos, training, and AI.

Build:
- scenario loader/runtime hooks
- structured session logging
- event history storage
- markdown/JSON summary generation
- training session outputs

Required outputs:
- training scenarios can modify machine behavior
- logs can produce readable reports
- AI summaries become more useful

---

## Phase 8 — Polish and Optional Extensions

Possible additions:
- richer animation
- dashboard charts
- maintenance notes
- industrial protocol bridge
- OPC UA proof of concept
- MQTT proof of concept
- Siemens-style naming mirror
- PDF export
- multi-session comparison

Only do these after earlier phases are stable.

---

## Recommended Agent Order

### Agent 1
Shared foundations

### Agent 2
Simulator core

### Agent 3
API and integration tests

### Agent 4
Dashboard/HMI

### Agent 5
AI assistant foundation

### Agent 6
PLC-style controller refinement

### Agent 7
Scenarios and reporting

These can overlap only after interfaces stabilize.

---

## Definition of “Phase Done”

A phase is done only when:
- code exists
- tests exist or were updated
- behavior matches specs
- filenames and public interfaces are stable
- no later phase has to guess hidden design intent

---

## Final Guidance

If an agent has to choose between:
- adding more complexity
- keeping the shared contract stable

choose shared contract stability.

The key rule is:
**finish the vertical slice from structured machine truth to visible product behavior before adding sophistication.**
