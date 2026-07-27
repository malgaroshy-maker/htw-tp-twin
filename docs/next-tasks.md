# Next Tasks & Roadmap
> Updated: 2026-04-07
> Based on: Full codebase re-analysis vs HMI_Spec.md, Roadmap.md, and Tasks_Master.md

This document reflects the **current real state** of the project — what is actually built, what is missing, and the prioritized plan to completion.

---

## ✅ What Is Already Done (Do Not Re-implement)

- **Backend:** FastAPI server, simulator engine, PLC-style controller, tag store, all slash commands (`/start`, `/stop`, `/reset`, `/run_empty`, `/mode_auto`, `/mode_manual`, `/refill_blanks`, `/clear_rejects`, `/recipe`, `/recipe/update`, `/session/reset`, `/plc/scan`, `/plc/status`)
- **Frontend Screens:** Overview, Faults, Recipe (with inline editor), Production (with recharts), Diagnostics (full I/O panel + dev toggles), 2D Simulation View, 3D Simulation View (lazy-loaded)
- **AI Backend:** `/ai/explain-state`, `/ai/explain-fault`, `/ai/session-summary` endpoints + Gemini client
- **AI Frontend:** `AiPanel.tsx`, `ReportViewer.tsx`, `ScenarioSelector.tsx` components wired to Overview
- **Code Quality:** All ESLint errors resolved (0 errors, 0 warnings), `cn` utility centralized, `any` types replaced with `unknown`, hook purities fixed
- **Routing:** React Router with Layout, all 5 core screens navigable
- **Linting/Build:** `npm run lint` clean ✅

---

## 🔴 Phase 1 — Critical Remaining Bugs (Fix Before All Else)

**Status: BLOCKING — must be resolved before any demo or Phase 2 work.**

### 1.1 PLC Spec Violation: Auto-Reset on Blank Refill
- **File:** `app/control/controller.py` → `refill_blanks()`
- **Spec:** `Fault_Model.md` and `PLC_Control_Spec.md` require explicit user RESET after `BLANK_MISSING`. Currently the fault self-clears when blanks are refilled.
- **Fix:** After calling `refill_blanks()`, the machine must stay FAULTED until the operator explicitly presses Reset.

### 1.2 Production Screen: Impure Mock Data
- **File:** `app/dashboard/src/features/production/Production.tsx` lines 18–23
- **Problem:** `mockHistoryData` uses `Math.random()` at module scope — renders non-deterministically and violates React purity rules. Will also cause lint regressions.
- **Fix:** Replace with a static deterministic dataset or derive from the live `out.*` tags as a rolling window. Do not use `Math.random()` at module scope.

### 1.3 Missing SVG `<defs>` in SimulationView2D
- **File:** `app/dashboard/src/features/simulation/SimulationView2D.tsx`
- **Problem:** References to `url(#belt-texture)` and `url(#fault-gradient)` will silently fail if the `<defs>` block is missing or mounted after the element that references it.
- **Fix:** Audit that all referenced gradients/patterns are defined in `<defs>` before any referencing element.

### 1.4 Backend: Replace `print()` with `logging`
- **Files:** `app/simulator/config_loader.py`, scattered in `engine.py`
- **Fix:** Replace all `print()` calls with `import logging; logger = logging.getLogger(__name__)` calls at appropriate severity.

---

## 🟠 Phase 2 — Core Missing UI Features (High Priority)

**Status: Spec-required screens partially implemented but with functional gaps.**

### 2.1 Control Screen — MISSING
- **Spec:** `HMI_Spec.md` Section 7 defines a dedicated Control Screen.
- **Current state:** Start/Stop/Reset exist only on the Overview screen. No dedicated screen for `AUTO/MANUAL` mode toggle, `Run Empty`, or permissive summary.
- **Task:** Create `app/dashboard/src/features/control/Control.tsx` with:
  - Mode toggle buttons: Auto / Manual (call `/command` with `mode_auto` / `mode_manual`)
  - Run Empty button (call `/command` with `run_empty`)
  - Permissive summary panel (bind `hmi.start_permissive_ok`, `sts.ready_to_start`, `sts.start_permissive_ok`)
  - Operator guidance message area (bind `hmi.footer_message`)
  - Button enable/disable driven by `hmi.*_button_enabled` flags
- **Route:** Add `/control` to `App.tsx` and Navigation

### 2.2 Training / Scenario Screen — MISSING
- **Spec:** `HMI_Spec.md` Section 12, `Training_Scenarios_Spec.md`
- **Current state:** `ScenarioSelector` is buried inside Overview as a modal. No dedicated training screen.
- **Task:** Create `app/dashboard/src/features/training/Training.tsx`:
  - Full list of available scenarios from `/scenarios`
  - Scenario launch/stop controls
  - Active scenario status badge (bind `cfg.active_scenario_id`, `cfg.active_scenario_status`)
  - Scenario goal and description display
  - Post-scenario AI summary button (call `askAi('session-summary')`)
- **Route:** Add `/training` to `App.tsx` and Navigation

### 2.3 Fault History Panel in Faults Screen
- **Spec:** `HMI_Spec.md` Section 8 mentions "optional fault history list"
- **Current state:** Faults screen shows only the *current* fault. No history list.
- **Task:** Add a scrollable event log to `Faults.tsx` using the `events` array from `useSimulator`. Filter for severity `FAULT` and `WARNING`. Link to Diagnostics from within the panel.

### 2.4 Navigation: Add `/control` and `/training` Links
- **File:** `app/dashboard/src/components/Navigation.tsx`
- **Task:** Add Control and Training screen links with appropriate icons. Reorder nav to match HMI spec order: Overview → Control → Faults → Production → Recipe → Diagnostics → Training.

### 2.5 Overview: Scenario Selector Cleanup
- Once a dedicated Training screen exists, remove the `ScenarioSelector` modal from `Overview.tsx` and replace it with a "Go to Training" nav link button instead.

---

## 🟡 Phase 3 — Session Persistence (Medium Priority)

**Status: Entirely not started. All event data is in-memory only.**

### 3.1 SQLite Event Persistence
- **Task:** Create `app/shared/persistence.py`
- Implement `EventStore` class wrapping `sqlite3`
- Schema: `events(id, session_id, ts, event_code, category, severity, machine_state, machine_mode, recipe_id, message, metadata_json)`
- Implement `append(event)`, `get_by_session(session_id)`, `get_recent(n)`, `clear_session(session_id)`
- Integrate with `SimulatorEngine._log_event()` to write to both in-memory list and SQLite

### 3.2 Session History API
- **Task:** Add to `app/api/server.py`:
  - `GET /sessions` → list all past session IDs with start/end timestamps, pack counts
  - `GET /events?session_id=<id>&limit=100` → paginated events for a given past session
  - `GET /reports/session?session_id=<id>` → generate report for any past session (not just active)

### 3.3 Event Timeline UI
- **Task:** Create `app/dashboard/src/features/history/History.tsx`
- List past sessions from `/sessions`
- On session select: show paginated event log and session stats
- Session comparison view (side-by-side KPIs for 2 sessions)
- **Route:** Add `/history` to `App.tsx` and Navigation

---

## 🟢 Phase 3.5 — Manual Step Mode (Medium Priority)

**Status: Planned. Extends the existing MANUAL mode from a simple auto-cycle-blocker to a real maintenance/setup mode.**

### 3.5.1 Operator Input Override Panel (Control Screen)
- **File:** `app/dashboard/src/features/control/Control.tsx`
- **What:** When `machine_mode == MANUAL`, render a panel of toggle switches for all 7 machine inputs (`product_available`, `blank_available`, `downstream_available`, `safety_ok`, `estop_ok`, `guards_closed`, `utilities_ok`)
- Each toggle calls `POST /dev/set-input` — the endpoint already exists
- Styled with amber/maintenance color scheme + "MAINTENANCE MODE ACTIVE" banner
- Only visible in MANUAL mode

### 3.5.2 Manual Jog Commands (Backend + Controller)
- **Files:** `controller.py`, `server.py`, `engine.py`, `tag_store.py`
- Add 3 new MANUAL-gated commands:
  - `jog_infeed` → spawn one product into grouping buffer
  - `jog_blank_feed` → manually trigger one blank feed (timer skipped)
  - `jog_pack_advance` → advance current cycle phase by one step
- Commands rejected (return `False`) if `machine_mode != MANUAL`

### 3.5.3 Engine Manual Mode Guard
- **File:** `app/simulator/engine.py`
- Modify `update()` to skip `_process_state_transitions()` and `_process_cycle_phases()` when in MANUAL
## 🟢 Phase 3.5 — Manual Step Mode (Completed)

**Status: Completed.**

- [x] Phase 3.5: Manual Step Mode (Maintenance Overrides & Jogs)
    - [x] Manual Input Panel (Input Overrides)
    - [x] Manual Mode engine guards & `jog_*` commands
    - [x] Manual Mode Visual Indicator (View2D Badge)
    - [x] `tests/test_manual_mode.py`
- `test_jog_rejected_in_auto` — all 3 jog commands return False in AUTO mode
- `test_jog_infeed_increments_grouped_count` — grouped_count increases per call in MANUAL
- `test_engine_no_auto_cycle_in_manual` — engine runs 10s in MANUAL, no phase changes

---

## 🔵 Phase 4 — AI Feature Expansion (Medium Priority)

**Status: 3 AI endpoints exist but are minimally wired into the UI.**

### 4.1 Natural Language Q&A Over Event Log
- **Backend:** Add `POST /ai/question` endpoint accepting `{ question: string }` body
- **Logic:** Pack recent events + current state into a Gemini prompt. Let operator ask free-form questions.
- **Frontend:** Add a chat-style input box to `AiPanel.tsx`. Display message thread with timestamps.

### 4.2 AI-Enhanced Report Export
- **File:** `app/reports/generator.py`
- **Task:** After generating the markdown report, make a final AI call to produce a 2–3 sentence executive summary section. Inject at the top of the report.
- **Frontend:** Add "Download Report" button to Production screen calling `fetchReport()` + triggering browser download.

### 4.3 Recipe Performance Comparison
- **Backend:** Add `GET /ai/compare-recipes?recipe_a=<id>&recipe_b=<id>` using session history
- **Frontend:** Surface in the Recipe screen or History screen as a "Compare" action

### 4.4 AI Panel — Surface on All Screens (Not Just Overview)
- **Current state:** `AiPanel.tsx` is only mounted in `Overview.tsx`
- **Task:** Move `AiPanel` into the `Layout` as a collapsible sidebar or persistent bottom drawer, accessible on all screens.

---

## 🟤 Phase 5 — Hardening & Testing (Medium-Low Priority)

**Status: 17 test files exist, but state machine coverage is critically thin (only 1 test).**

### 5.1 State Machine Transition Tests
- **File:** `tests/test_state_machine.py` (currently 16 lines, 1 test)
- **Add tests for:**
  - STOPPED → STARTING → RUNNING full cycle
  - RUNNING → FAULTED on fault injection
  - FAULTED → STOPPED on reset
  - STARVED state when product feed removed
  - BLOCKED state when downstream removed
  - RUN_EMPTY mode behavior
  - Reject accumulation fault thresholds (2/3 warning, 3/3 fault)

### 5.2 Multi-Cycle Counter Verification Tests
- **File:** New `tests/test_counters.py`
- Assert `good_pack_count`, `reject_pack_count`, `cycle_count` across 5+ full cycles
- Assert `runtime_sec` increments only while RUNNING

### 5.3 Comms Health Simulation Test
- **File:** New `tests/test_comms.py`
- Assert that `plc.comms_healthy = False` is set after timeout
- Assert that dashboard hook `isCommsHealthy` reflects this

### 5.4 Frontend: Snapshot/Integration Tests
- **Tool:** Vitest + React Testing Library (already likely in devDeps)
- Add smoke tests for: Overview renders without crashing, Production screen shows correct KPIs, Recipe screen lists recipes.

---

## 📦 Phase 6 — Portfolio Packaging (Low Priority, Do Last)

**Status: README exists but is sparse. No demo assets.**

### 6.1 README Upgrade
- Add architecture diagram (Mermaid or PNG)
- Add feature GIF / screenshot gallery
- Add "Getting Started" section with exact commands
- Add project goals and "What I Built" narrative for portfolio context

### 6.2 Demo Script
- **File:** `docs/DEMO_GUIDE.md` (exists, needs expanding)
- Write a step-by-step operator demo: Start → Run → Trigger Fault → Reset → Run Empty → AI Summary

### 6.3 Architecture Diagram
- Create `docs/architecture.md` with a Mermaid diagram showing: Frontend → FastAPI → [SimEngine | PLCController | AIAssistant] → TagStore

### 6.4 Deployment / Docker
- Optional: Dockerfile for the FastAPI backend + Vite static build served by nginx

---

## 📊 Priority Summary

| Phase | Focus | Priority | Status |
|-------|-------|----------|--------|
| Phase 1 | Critical bug fixes | 🔴 P0 | Must fix now |
| Phase 2 | Control + Training screens | 🟠 P1 | High — spec-required |
| Phase 3 | SQLite persistence | 🟡 P2 | Medium — enables history/AI |
| Phase 4 | AI expansion | 🔵 P2 | Medium — differentiator |
| Phase 5 | Testing hardening | 🟤 P3 | Medium-Low — quality |
| Phase 6 | Portfolio packaging | ⚪ P4 | Do last |

---

## 🗓️ Recommended Execution Order

1. **Now:** Fix Phase 1 bugs (especially P1.1 PLC spec + P1.2 mock data)
2. **Next:** Build Control Screen (2.1) + wire Training screen (2.2)
3. **Then:** Persistence layer (3.1 → 3.2 → 3.3)
4. **Then:** AI expansion (4.1 Q&A chat, 4.2 report export)
5. **Parallel with 3/4:** Round out test coverage (5.1 state machine tests)
6. **Final:** Portfolio packaging (6.1 README + 6.3 architecture diagram)
