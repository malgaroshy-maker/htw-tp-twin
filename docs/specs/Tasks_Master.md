# Tasks Master

## Purpose
This file is the master execution backlog for the tray packer digital twin platform. It is written for coding agents and human contributors so work can be split into small, safe, well-scoped tasks.

This project includes:
- a simplified behavioral Python tray packer simulator
- a lightweight animated machine view
- a web dashboard
- AI-assisted reporting and troubleshooting
- PLC-style control specifications
- HMI design and a PLC-to-simulation connection model

## Task management rules
- Prefer small tasks that can be completed and reviewed independently.
- Keep machine behavior realistic from the outside, but simplify internal mechanics.
- Do not introduce high-fidelity motion physics unless explicitly requested.
- Use structured event logs as the main source of truth for analytics and AI features.
- Keep control logic deterministic and rule-based; AI must not control safety or machine state transitions directly.
- Maintain compatibility with future Siemens-style PLC/HMI integration.

## Priority legend
- **P0**: required for project foundation
- **P1**: core feature for first usable version
- **P2**: important enhancement
- **P3**: optional / polish / future

## Status legend
- **TODO**
- **IN PROGRESS**
- **BLOCKED**
- **DONE**

---

# Phase overview

## Phase 1 — Foundation and domain modeling
Goal: define scope, architecture, machine behavior, state model, tags, logs, faults, and file structure.

## Phase 2 — Simulator MVP
Goal: implement the Python tray packer simulator with simplified animation, recipes, core faults, counters, and logs.

## Phase 3 — Dashboard and AI foundation
Goal: add a web dashboard, event viewer, reporting, and AI analysis features that read structured simulator outputs.

## Phase 4 — PLC/HMI specification and connection layer
Goal: define PLC logic, HMI screens, tags, and the simulation interface for future Siemens or PLCSIM integration.

## Phase 5 — Validation, polish, and portfolio packaging
Goal: harden the project, improve UX, validate scenarios, and prepare a high-quality demo repository.

---

# Global cross-cutting tasks

## Documentation
- [ ] **P0 / TODO** Keep `PRD.md` aligned with all major scope decisions.
- [ ] **P0 / TODO** Keep `Simulation_Specifications.md` aligned with actual implementation behavior.
- [ ] **P1 / TODO** Create architecture diagrams and keep them updated.
- [ ] **P1 / TODO** Maintain a running `DECISIONS.md` file for all major tradeoffs.
- [ ] **P1 / TODO** Maintain `ASSUMPTIONS.md` for estimated values and simplifications.
- [ ] **P2 / TODO** Add onboarding notes for new coding agents.

## Code quality
- [ ] **P0 / TODO** Standardize folder structure and naming conventions.
- [ ] **P0 / TODO** Add linting/formatting rules for Python and frontend code.
- [ ] **P1 / TODO** Add type hints to Python simulator code.
- [ ] **P1 / TODO** Add unit tests for the state machine and event generation.
- [ ] **P2 / TODO** Add integration tests for simulator ↔ dashboard data flow.

## Event/log consistency
- [ ] **P0 / TODO** Define the canonical event schema.
- [ ] **P0 / TODO** Define the machine state enumeration.
- [ ] **P0 / TODO** Define the recipe schema.
- [ ] **P1 / TODO** Add validation for event payloads.
- [ ] **P1 / TODO** Add versioning for schemas and configs.

## AI safety and scope
- [ ] **P0 / TODO** Document that AI is advisory only.
- [ ] **P0 / TODO** Prevent AI outputs from directly altering safety-critical machine behavior.
- [ ] **P1 / TODO** Create prompt templates for summary, troubleshooting, and training generation.
- [ ] **P2 / TODO** Add confidence / uncertainty language rules for AI outputs.

---

# Detailed task backlog

## 1. Product and architecture
- [ ] **P0 / TODO** Finalize product positioning: digital twin prototype + training simulator + AI-assisted analytics platform.
- [ ] **P0 / TODO** Define system modules and responsibilities.
- [ ] **P0 / TODO** Define repository structure.
- [ ] **P1 / TODO** Define external interfaces between simulator, dashboard, AI module, and future PLC adapter.
- [ ] **P1 / TODO** Define deployment modes: local-only dev, demo mode, future PLC-connected mode.

## 2. Machine behavior model
- [ ] **P0 / TODO** Finalize simplified tray packer process flow.
- [ ] **P0 / TODO** Finalize machine states.
- [ ] **P0 / TODO** Finalize state transitions.
- [ ] **P0 / TODO** Define run/start/stop/reset/run-empty behavior.
- [ ] **P0 / TODO** Define grouped product logic.
- [ ] **P0 / TODO** Define blank availability behavior.
- [ ] **P1 / TODO** Define downstream blocked behavior.
- [ ] **P1 / TODO** Define reject-only vs stop-causing faults.
- [ ] **P1 / TODO** Define startup slowdown / warmup behavior.
- [ ] **P2 / TODO** Define microstoppage behavior.

## 3. Recipes and machine parameters
- [ ] **P0 / TODO** Define recipe data model.
- [ ] **P0 / TODO** Create initial recipes: 24-pack, 27-pack, 30-pack.
- [ ] **P0 / TODO** Define timing parameters per recipe.
- [ ] **P0 / TODO** Define fault probabilities per recipe.
- [ ] **P1 / TODO** Define optional recipe-specific reject behavior.
- [ ] **P1 / TODO** Add validation rules for recipe files.
- [ ] **P2 / TODO** Create a recipe editor UI.

## 4. Fault model
- [ ] **P0 / TODO** Define initial fault list.
- [ ] **P0 / TODO** Define fault categories: starvation, blocked, reject-only, stop faults.
- [ ] **P0 / TODO** Define recovery paths and reset logic.
- [ ] **P1 / TODO** Define average recovery times.
- [ ] **P1 / TODO** Add fault injection controls for test/demo mode.
- [ ] **P1 / TODO** Add fault severity and operator guidance metadata.
- [ ] **P2 / TODO** Add intermittent faults and nuisance faults.

## 5. Event schema and logging
- [ ] **P0 / TODO** Define event types.
- [ ] **P0 / TODO** Implement structured event emission from simulator.
- [ ] **P0 / TODO** Define counters and metrics model.
- [ ] **P1 / TODO** Add CSV/JSONL event export.
- [ ] **P1 / TODO** Add SQLite event storage.
- [ ] **P1 / TODO** Add event replay support.
- [ ] **P2 / TODO** Add session archive import/export.

## 6. Python simulator engine
- [ ] **P0 / TODO** Create simulator app skeleton.
- [ ] **P0 / TODO** Implement main game/simulation loop.
- [ ] **P0 / TODO** Implement machine state controller.
- [ ] **P0 / TODO** Implement product feed and grouping logic.
- [ ] **P0 / TODO** Implement blank feed logic.
- [ ] **P0 / TODO** Implement cycle completion logic.
- [ ] **P0 / TODO** Implement counters.
- [ ] **P1 / TODO** Implement configurable fault injection.
- [ ] **P1 / TODO** Implement recipe switching at runtime.
- [ ] **P1 / TODO** Implement startup and run-empty modes.
- [ ] **P2 / TODO** Implement save/load session state.

## 7. Animated visual layer
- [ ] **P0 / TODO** Create 2D layout for infeed, grouping, blank feed, pack zone, outfeed, reject lane.
- [ ] **P0 / TODO** Animate products entering and grouping.
- [ ] **P0 / TODO** Animate blank arrival.
- [ ] **P0 / TODO** Animate pack discharge.
- [ ] **P1 / TODO** Animate reject flow.
- [ ] **P1 / TODO** Add color-coded machine state display.
- [ ] **P1 / TODO** Add on-screen counters and message area.
- [ ] **P2 / TODO** Improve visual fidelity to look more industrial.
- [ ] **P2 / TODO** Add simple sound/alarm indicators.

## 8. Dashboard app
- [ ] **P1 / TODO** Define dashboard MVP scope.
- [ ] **P1 / TODO** Select frontend stack and create app shell.
- [ ] **P1 / TODO** Build machine overview page.
- [ ] **P1 / TODO** Build production counters panel.
- [ ] **P1 / TODO** Build fault/event timeline panel.
- [ ] **P1 / TODO** Build recipe/status panel.
- [ ] **P2 / TODO** Build charts for downtime and rejects.
- [ ] **P2 / TODO** Build scenario control panel.
- [ ] **P3 / TODO** Add multi-session comparison page.

## 9. AI assistant
- [ ] **P1 / TODO** Define AI assistant scope and boundaries.
- [ ] **P1 / TODO** Create structured input format for AI.
- [ ] **P1 / TODO** Implement shift summary generation.
- [ ] **P1 / TODO** Implement fault explanation workflow.
- [ ] **P2 / TODO** Implement training scenario generation.
- [ ] **P2 / TODO** Implement natural-language log queries.
- [ ] **P2 / TODO** Implement report export drafts.
- [ ] **P3 / TODO** Add retrieval from project docs and fault definitions.

## 10. Training mode
- [ ] **P2 / TODO** Define training mode objectives.
- [ ] **P2 / TODO** Create scenario definitions.
- [ ] **P2 / TODO** Add guided fault scenarios.
- [ ] **P2 / TODO** Add operator actions and scoring rules.
- [ ] **P3 / TODO** Add quizzes and post-scenario summaries.

## 11. PLC control specification
- [ ] **P1 / TODO** Define PLC control scope.
- [ ] **P1 / TODO** Define machine commands from PLC to simulator.
- [ ] **P1 / TODO** Define machine status feedback from simulator to PLC.
- [ ] **P1 / TODO** Define PackML-style controller logic.
- [ ] **P2 / TODO** Write Siemens Structured Text-style pseudocode.
- [ ] **P2 / TODO** Write fault reset and permissive logic.
- [ ] **P2 / TODO** Write recipe handling logic.
- [ ] **P3 / TODO** Add manual/jog mode behavior spec.

## 12. HMI specification
- [ ] **P1 / TODO** Define HMI screen list.
- [ ] **P1 / TODO** Define overview screen behavior.
- [ ] **P1 / TODO** Define alarms screen behavior.
- [ ] **P1 / TODO** Define recipe screen behavior.
- [ ] **P1 / TODO** Define diagnostics screen behavior.
- [ ] **P2 / TODO** Define maintenance/status screen behavior.
- [ ] **P2 / TODO** Define navigation flow.
- [ ] **P3 / TODO** Define WinCC Unified-style screen layout details.

## 13. PLC ↔ simulation connection
- [ ] **P1 / TODO** Choose primary integration protocol for design.
- [ ] **P1 / TODO** Define tag contract.
- [ ] **P1 / TODO** Define connection state handling.
- [ ] **P2 / TODO** Create a local mock adapter.
- [ ] **P2 / TODO** Add OPC UA design notes.
- [ ] **P2 / TODO** Add MQTT alternative design notes.
- [ ] **P3 / TODO** Prepare PLCSIM-style mapping notes.

## 14. Portfolio/demo packaging
- [ ] **P1 / TODO** Create a clean README.
- [ ] **P1 / TODO** Prepare screenshots and GIF captures.
- [ ] **P2 / TODO** Create a demo walkthrough script.
- [ ] **P2 / TODO** Prepare architecture visuals.
- [ ] **P2 / TODO** Prepare a short feature video plan.
- [ ] **P3 / TODO** Add bilingual presentation assets if needed.

---

# Recommended next execution order

## Immediate next files to create
1. `Tasks_Phase_1.md`
2. `Tasks_Phase_2.md`
3. `Architecture.md`
4. `Event_Schema.md`
5. `Tag_Interface_Spec.md`
6. `AI_Features_Spec.md`

## Immediate next coding tasks
1. Create project folder structure
2. Implement minimal simulator state machine
3. Implement event logging schema
4. Create recipe config files
5. Extend the Pygame demo into a structured app

---

# Definition of done for MVP
The MVP is complete when all of the following are true:
- The simulator can start, run, stop, reset, and run empty.
- At least three recipes are supported.
- Products are visibly grouped and packed in a simplified animation.
- Good packs and rejected packs are counted separately.
- At least four fault scenarios are supported.
- Structured event logs are generated.
- A basic dashboard can show machine state, counters, and recent faults.
- AI can generate a shift summary and explain common faults using structured logs.
- PLC/HMI connection behavior is specified clearly, even if not fully implemented.

