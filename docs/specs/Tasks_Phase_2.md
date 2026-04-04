# Tasks — Phase 2

## Phase 2 Goal
Build the **operations dashboard and AI foundation** on top of the simulator MVP.

At the end of Phase 2, the project should have:
- a working web dashboard connected to simulator data
- live machine state and counter visibility
- event log browsing and basic analytics views
- scenario controls for training/testing
- a first AI assistant layer for summaries and fault explanation
- a stable data contract between simulator, dashboard, and AI modules

Phase 2 focuses on **visibility, analytics, and assistant features**, not full Siemens integration yet.

---

## Phase 2 Scope

### In scope
- simulator API or adapter layer
- dashboard app structure
- live machine state panel
- counters and KPI cards
- alarms and recent event views
- downtime and reject trend charts
- scenario selector / controls
- structured event storage improvements
- AI-ready log/query layer
- shift summary generation
- fault explanation assistant
- prompt and context packaging for AI features
- baseline report export capability

### Out of scope
- real PLC hardware integration
- WinCC screen implementation
- full maintenance mobile app
- advanced RAG/search over large manual sets
- multi-machine line simulation
- production deployment hardening

---

## Phase 2 Deliverables

### Required files and modules
- `docs/Dashboard_App_Spec.md`
- `docs/AI_Features_Spec.md`
- `docs/Logging_And_Reporting_Spec.md`
- `docs/Training_Scenarios_Spec.md`
- `docs/Tag_Interface_Spec.md`
- `docs/Event_Schema.md` (updated if needed)
- `src/dashboard/`
- `src/api/`
- `src/ai/`
- `src/shared/`
- `src/reports/`
- `data/events/`
- `data/scenarios/`
- `tests/dashboard/`
- `tests/ai/`

### Required working behaviors
- dashboard shows current machine state and counters live or near-live
- recent faults and events are visible in a clean UI
- downtime and reject charts render correctly from simulator data
- at least 3 training scenarios can be selected and run
- AI can generate a shift summary from structured event data
- AI can explain common faults using project-defined machine logic
- exported summary/report uses structured simulator data, not guessed free text

---

## Execution order

### Step 1 — Shared contracts and data access
Stabilize the event schema, tag interface, and simulator-to-app adapter.

### Step 2 — Dashboard foundation
Create the dashboard shell, live machine overview, counters, and event log views.

### Step 3 — Analytics and scenarios
Add charts, trends, and scenario controls.

### Step 4 — AI foundation
Implement the AI context builder, shift summary generation, and fault explanation assistant.

### Step 5 — Reporting and polish
Add exports, quality checks, and UI polish for demo readiness.

---

# Detailed task list

## 1. Shared data contracts
- [ ] Freeze the minimum simulator event schema for dashboard/AI use.
- [ ] Freeze the minimum tag/status contract for dashboard display.
- [ ] Define canonical field names for timestamps, states, recipes, faults, counters, and durations.
- [ ] Add shared Python models or TypeScript interfaces for events and tags.
- [ ] Define versioning or compatibility notes for schema changes.
- [ ] Document assumptions and edge cases.

### Definition of done
- dashboard and AI use the same schema definitions
- field names are stable and documented
- sample payloads exist for testing

---

## 2. Simulator adapter/API layer
- [ ] Decide initial transport method for Phase 2 (`local file polling`, `HTTP`, `WebSocket`, or lightweight in-process bridge).
- [ ] Implement a simulator data publisher/adapter.
- [ ] Expose live machine snapshot data.
- [ ] Expose recent event history.
- [ ] Expose summary metrics (good packs, rejects, runtime, downtime, current recipe).
- [ ] Add mock endpoints or fixtures for front-end work when simulator is offline.

### Definition of done
- dashboard can consume simulator data without directly coupling to engine internals
- front-end can be developed against mock data
- data flow path is documented

---

## 3. Dashboard app shell
- [ ] Select front-end structure and routing conventions.
- [ ] Create dashboard layout with header, main panels, and navigation.
- [ ] Create machine overview page shell.
- [ ] Add state indicator component.
- [ ] Add counters/KPI cards.
- [ ] Add recipe/status panel.
- [ ] Add empty/error/loading states.

### Definition of done
- dashboard launches locally
- key overview panels render correctly
- visual state feedback is clear and industrial-style

---

## 4. Live overview and recent events
- [ ] Display current machine state.
- [ ] Display current phase and recipe.
- [ ] Display good count, reject count, cycles, runtime, and downtime.
- [ ] Display active fault/warning banner.
- [ ] Display recent event list with filtering basics.
- [ ] Highlight important events such as `FAULT_TRIGGERED`, `FAULT_RESET`, `RECIPE_CHANGED`, and `PACK_REJECTED`.

### Definition of done
- user can understand current machine status at a glance
- recent event feed matches simulator behavior
- event importance is visually distinguishable

---

## 5. Analytics views
- [ ] Add downtime by cause chart.
- [ ] Add rejects over time chart.
- [ ] Add state duration breakdown.
- [ ] Add event count by fault type.
- [ ] Add simple recipe comparison metrics.
- [ ] Add time range selection or session selection.

### Definition of done
- charts are driven by structured data
- metrics are internally consistent with source events
- analytics are useful for demo and learning purposes

---

## 6. Training scenarios
Create at least these baseline scenarios:
- [ ] normal production
- [ ] intermittent product starvation
- [ ] blank supply instability
- [ ] downstream blockage
- [ ] high reject startup behavior

For each scenario:
- [ ] define trigger/setup inputs
- [ ] define expected machine behavior
- [ ] define expected events/log patterns
- [ ] define success criteria for demo/testing

### Definition of done
- scenarios can be selected and executed repeatedly
- scenario behavior is explainable and consistent
- logs clearly show the scenario effects

---

## 7. Logging and storage improvements
- [ ] Decide storage strategy for Phase 2 (`JSONL`, `SQLite`, or both).
- [ ] Add session identifiers to all events.
- [ ] Add scenario identifiers where relevant.
- [ ] Add report-friendly aggregation helpers.
- [ ] Add retention/cleanup rules for local dev data.
- [ ] Add sample datasets for AI and dashboard testing.

### Definition of done
- event history is reusable across sessions
- analytics queries are practical to implement
- sample data exists for front-end and AI testing

---

## 8. AI context builder
- [ ] Define the structured input package for AI features.
- [ ] Build a context-preparation module from events, counters, faults, and scenario metadata.
- [ ] Separate raw logs from cleaned summaries.
- [ ] Add deterministic ordering and truncation rules.
- [ ] Add guardrails to prevent unsupported claims.
- [ ] Document what the AI is allowed to infer versus what must be cited from structured data.

### Definition of done
- AI receives stable, compact, useful context
- prompts do not depend on ad-hoc manual formatting
- context builder can be tested independently

---

## 9. AI feature 1 — Shift summary generator
- [ ] Define summary input schema.
- [ ] Define summary output template.
- [ ] Implement prompt or generation pipeline.
- [ ] Include counts, downtime causes, major faults, rejects, and recipe info.
- [ ] Add optional operator/technician notes field.
- [ ] Add tests using sample event sessions.

### Definition of done
- summary is based on structured data
- result is technically plausible and easy to read
- different sessions produce meaningfully different summaries

---

## 10. AI feature 2 — Fault explanation assistant
- [ ] Define supported fault explanation intents.
- [ ] Create a machine fault knowledge base from project docs.
- [ ] Implement explanation templates or prompt flow.
- [ ] Support at minimum:
  - “What does this fault mean?”
  - “What should be checked first?”
  - “Did the machine stop or reject only?”
  - “What recent events likely led to this?”
- [ ] Add tests with common fault scenarios.

### Definition of done
- assistant explanations stay within known project logic
- guidance is practical and maintenance-oriented
- explanations reference recent events when available

---

## 11. Report generation
- [ ] Define a simple report schema for session/shift reports.
- [ ] Create markdown or HTML report template.
- [ ] Include machine metadata, recipe, counters, rejects, downtime, and fault summary.
- [ ] Add AI-generated narrative section.
- [ ] Add export path for local files.
- [ ] Add sample generated reports to demo assets if useful.

### Definition of done
- report can be generated from a completed session
- report includes both structured metrics and readable narrative
- report content is consistent with dashboard data

---

## 12. Developer experience for OpenCode agents
- [ ] Create agent-friendly README sections for dashboard and AI modules.
- [ ] Add prompts/examples for generating new scenarios and tests.
- [ ] Add mock datasets and sample event logs.
- [ ] Add clear task labels by subsystem (`simulator`, `dashboard`, `ai`, `shared`).
- [ ] Document boundaries so agents do not mix safety-critical control with AI suggestions.

### Definition of done
- agents can work on one subsystem without needing the whole project in memory
- prompts and examples reduce ambiguity
- repo is easy to navigate

---

## 13. Testing
- [ ] Add contract tests for event schema.
- [ ] Add API/adapter tests.
- [ ] Add dashboard component tests for core panels.
- [ ] Add summary generation snapshot tests.
- [ ] Add fault explanation tests.
- [ ] Add scenario regression tests.

### Definition of done
- critical data paths are covered
- UI regressions are easier to catch
- AI output quality is tested against stable expectations where possible

---

## 14. Demo readiness
- [ ] Prepare one polished demo dataset.
- [ ] Prepare one live demo scenario flow.
- [ ] Prepare screenshots or GIFs of dashboard views.
- [ ] Prepare example AI prompts/questions for demo.
- [ ] Create short demo narrative for portfolio use.

### Definition of done
- Phase 2 can be demonstrated without setup confusion
- dashboard and AI clearly add value over simulator-only mode
- demo assets are reusable in README and presentations

---

# Phase 2 exit criteria
Phase 2 is complete when all of the following are true:
- the dashboard displays live or replayed simulator status clearly
- recent faults, counters, and session metrics are visible
- at least three analytics views are working
- training scenarios can be selected and run
- AI can generate a credible shift summary from simulator data
- AI can explain the main machine faults using project knowledge and session events
- report generation works from structured session data
- shared schemas/contracts are documented and stable enough for the next phase

---

# Recommended next files after this phase plan
1. `Tasks_Phase_3.md`
2. `Architecture.md`
3. `Event_Schema.md`
4. `Tag_Interface_Spec.md`
5. `AI_Features_Spec.md`
6. `Dashboard_App_Spec.md`
