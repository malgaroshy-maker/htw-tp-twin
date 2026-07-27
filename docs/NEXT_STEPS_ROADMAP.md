> **SUPERSEDED (2026-07-27).** This was a point-in-time audit dated 2026-04-02.
> Several of its findings are now stale — the dashboard screens it calls stubs are
> built, and persistence exists. See `docs/progress.md` for current status and
> `docs/3d-rebuild/` for the active workstream. Kept for history.

# Next Steps Roadmap

> Generated: 2026-04-02
> Based on: Full codebase re-audit

---

## Quick Reference

| Priority | Impact | Effort | Category |
|---|---|---|---|
| **Do Now** | Fix bugs, fake metrics, missing deps | 1-2 hours | Technical quality |
| **Do Soon** | Build 3 missing screens, add persistence | 1-2 days | Portfolio readiness |
| **Do Later** | Charts, AI expansion, test gaps, polish | 3-5 days | Feature depth |

---

## DO NOW — Critical Fixes (1-2 hours)

These are blocking issues that should be fixed before any demo, portfolio review, or further development.

### 1. Add missing dependencies to `pyproject.toml`
**Why it matters:** `pip install -e .` will fail to install `google-genai` and `pytest`, breaking the AI module and test suite for anyone who follows the README setup instructions.
**Files:** `pyproject.toml`
**Category:** Technical quality / Setup
**Actions:**
- Add `google-genai` to `dependencies` list
- Add `pytest` to a new `[project.optional-dependencies]` dev section
- Add `app.reports` to `packages` list

### 2. Fix missing SVG gradients in SimulationView
**Why it matters:** Two visual bugs are immediately visible — the conveyor belt renders without its texture gradient, and the machine frame renders without the fault gradient when faulted. These undermine the otherwise polished animation.
**Files:** `app/dashboard/src/features/simulation/SimulationView.tsx`
**Category:** UI / Dashboard
**Actions:**
- Add `#belt-texture` linearGradient to the `<defs>` block
- Add `#fault-gradient` linearGradient to the `<defs>` block

### 3. Remove hardcoded fake metrics from Overview
**Why it matters:** "Efficiency 94.2%" and "MTBF 14.2h" are hardcoded strings that signal to any technical reviewer that the dashboard isn't fully data-driven. Replace with computed values or remove the labels.
**Files:** `app/dashboard/src/features/overview/Overview.tsx`
**Category:** UI / Dashboard
**Actions:**
- Compute efficiency as `good_packs / (good_packs + reject_packs) * 100` when packs > 0, else show "—"
- Remove MTBF label or compute from fault history (time between faults)
- Fix "Infeed Rate" label to say "Packs/min" since it calculates `60 / cycle_time`

### 4. Clean up DEBUG prints and dead code
**Why it matters:** DEBUG print statements in `config_loader.py` and `scenario_runner.py` look unprofessional. Duplicate `runtime_sec = 0.0` in engine.py is dead code. `time.sleep(0.0)` in runtime.py does nothing.
**Files:** `app/simulator/config_loader.py`, `app/simulator/scenario_runner.py`, `app/simulator/engine.py`, `app/simulator/runtime.py`
**Category:** Simulator / Technical quality
**Actions:**
- Replace `print(f"DEBUG: ...")` with `logging.debug(...)`
- Remove duplicate `runtime_sec = 0.0` line in engine.py
- Remove `time.sleep(0.0)` from runtime.py

### 5. Fix `refill_blanks()` auto-reset behavior
**Why it matters:** The spec explicitly states BLANK_MISSING requires a manual reset. The controller's `refill_blanks()` method auto-resets the machine when it detects a BLANK fault, bypassing this requirement. This is a spec violation.
**Files:** `app/control/controller.py`
**Category:** Controller / PLC-style control
**Actions:**
- Remove the auto-reset logic from `refill_blanks()`
- Keep the blank refill (set `blank_available = True`) but require explicit Reset command to clear the fault

### 6. Fix transient pack ID collision
**Why it matters:** Using ISO timestamp strings as transient pack IDs can cause collisions when two packs discharge in the same millisecond, leading to animation glitches.
**Files:** `app/dashboard/src/features/simulation/SimulationView.tsx`
**Category:** UI / Dashboard
**Actions:**
- Use `event_id` from the event record instead of timestamp
- Or use a simple incrementing counter for transient pack IDs

---

## DO SOON — High-Impact Features (1-2 days)

These items have the highest impact on portfolio readiness and demo quality.

### 7. Build Production Screen
**Why it matters:** This is the single highest-impact remaining UI task. The Production screen is where operators spend most of their time monitoring throughput. Without it, the dashboard feels like a demo, not a product.
**Files:** `app/dashboard/src/features/production/` (new), `app/dashboard/src/App.tsx`
**Category:** UI / Dashboard
**Actions:**
- Create `Production.tsx` component with:
  - Cycle count, good pack count, reject pack count (large KPI cards)
  - Runtime and downtime counters
  - Last cycle time and average cycle time
  - Last pack result (GOOD/REJECT badge)
  - Last reject reason
  - Reject rate percentage
  - Simple bar chart or progress indicators (no charting library needed yet — use CSS bars)
- Add route `/production` in `App.tsx`
- Wire up to existing `useSimulator` hook data

### 8. Build Recipe Screen
**Why it matters:** Recipe selection is a core operator function. The spec requires a dedicated screen showing available recipes, details, and selection controls. Currently only a placeholder exists.
**Files:** `app/dashboard/src/features/recipe/` (new), `app/dashboard/src/App.tsx`
**Category:** UI / Dashboard
**Actions:**
- Create `Recipe.tsx` component with:
  - Recipe list (24-pack, 27-pack, 30-pack) with active recipe highlighted
  - Recipe detail panel showing: products per pack, grid layout (visual preview), nominal cycle time, reject probability, jam probability, notes
  - Select recipe button (enabled only when `hmi.recipe_change_enabled` is true)
  - Disabled state message: "Recipe change not permitted while running"
- Add route `/recipe` in `App.tsx`
- Wire up to `selectRecipe()` from `useSimulator` hook

### 9. Build Diagnostics Screen
**Why it matters:** The Diagnostics screen is essential for troubleshooting and scenario testing. It exposes the raw I/O conditions that drive machine behavior.
**Files:** `app/dashboard/src/features/diagnostics/` (new), `app/dashboard/src/App.tsx`
**Category:** UI / Dashboard
**Actions:**
- Create `Diagnostics.tsx` component with:
  - Safety & Permissives section: Safety OK, E-stop OK, Guards closed, Utilities OK, Start Permissive OK (green/red indicators)
  - Material & Flow section: Product available, Blank available, Downstream available (green/red indicators)
  - Machine Feedback section: machine state, mode, cycle phase, fault active
  - Dev/Test toggles (only visible when in dev mode): toggle product/blank/downstream availability
- Add route `/diagnostics` in `App.tsx`
- Wire up to `setInput()` from `useSimulator` hook for dev toggles

### 10. Add SQLite persistence for events
**Why it matters:** Currently all data is in-memory. Server restart clears everything. Adding SQLite persistence unlocks multi-session history, better reports, and more useful AI summaries. This is the highest-impact backend improvement.
**Files:** `app/shared/events.py` (extend), `app/api/server.py` (modify), new `app/shared/persistence.py`
**Category:** API / Shared / Backend
**Actions:**
- Create `persistence.py` with a simple SQLite wrapper:
  - `init_db()` — create events table if not exists
  - `insert_event(event)` — append event to database
  - `get_events(session_id=None, limit=None)` — query events
  - `get_sessions()` — list distinct session IDs
- Modify `EventLogger.log()` to also write to SQLite (dual-write)
- Modify `/events` endpoint to support `session_id` query parameter
- Add `GET /sessions` endpoint to list available sessions
- Add `GET /reports/session?session_id=xxx` to generate reports for past sessions

### 11. Fix `stable_cycles` in ScenarioRunner
**Why it matters:** The variable name implies it counts actual machine cycles, but it counts update ticks. With dt=0.1, a "3 cycle" condition completes in 0.3 seconds, not 3 actual cycles. This makes scenario timing unpredictable.
**Files:** `app/simulator/scenario_runner.py`
**Category:** Simulator / Scenarios
**Actions:**
- Rename `stable_cycles` to `stable_ticks` or fix the logic to count actual cycles (track `cycle_count` from tag store)
- Update the condition check to use actual cycle count delta

### 12. Add `__init__.py` exports to all packages
**Why it matters:** Empty `__init__.py` files force consumers to know internal module paths. Adding exports makes the API cleaner and more professional.
**Files:** `app/shared/__init__.py`, `app/simulator/__init__.py`, `app/control/__init__.py`, `app/api/__init__.py`, `app/ai/__init__.py`, `app/reports/__init__.py`
**Category:** Technical quality / Shared
**Actions:**
- Add `from .module import Class` exports to each `__init__.py`
- Create `app/reports/__init__.py` (currently missing entirely)

---

## DO LATER — Feature Depth and Polish (3-5 days)

These items improve the project but are not blocking for a strong demo.

### 13. Add charting library and trend charts
**Why it matters:** The specs call for downtime-by-cause and rejects-over-time charts. Adding a charting library makes the analytics views real.
**Files:** `app/dashboard/package.json`, `app/dashboard/src/features/production/Production.tsx`
**Category:** UI / Dashboard
**Actions:**
- Install `recharts` (lightweight, React-friendly)
- Add downtime-by-cause bar chart to Production screen
- Add rejects-over-time line chart to Production screen
- Add state duration breakdown pie chart

### 14. Build Event History / Timeline view
**Why it matters:** The Faults screen currently shows only the last event. A browsable event timeline is essential for troubleshooting and training review.
**Files:** `app/dashboard/src/features/faults/Faults.tsx` (extend) or new `app/dashboard/src/features/events/`
**Category:** UI / Dashboard
**Actions:**
- Add event list component with filtering by category (STATE, FAULT, REJECT, PRODUCTION)
- Color-code events by severity
- Show timestamp, event code, and message
- Add "load more" pagination

### 15. Add Mode Switching UI
**Why it matters:** AUTO/MANUAL mode switching is a core PLC function but is not exposed in any screen. The controller supports it; the UI doesn't.
**Files:** `app/dashboard/src/features/overview/Overview.tsx` or new Control screen
**Category:** UI / Dashboard
**Actions:**
- Add AUTO/MANUAL toggle buttons to Overview or create a minimal Control screen
- Wire up to `requestModeAuto()` and `requestModeManual()` from `useSimulator` hook
- Respect `hmi.auto_mode_enabled` and `hmi.manual_mode_enabled` flags

### 16. Add Explicit Run Empty button
**Why it matters:** Currently `sendCommand('stop')` triggers run-empty per the PLC spec, but there's no explicit Run Empty control. The spec lists it as a distinct command.
**Files:** `app/dashboard/src/features/overview/Overview.tsx`
**Category:** UI / Dashboard
**Actions:**
- Add "Run Empty" button alongside Start/Stop
- Wire up to `sendCommand('run_empty')`
- Enable only when machine is RUNNING

### 17. Expand AI Features — Log Q&A
**Why it matters:** Natural language log queries ("What caused the most downtime?") are one of the most compelling AI features in the spec. Currently only predefined endpoints exist.
**Files:** `app/ai/assistant.py`, `app/ai/prompts.py`, `app/api/server.py`
**Category:** AI / API
**Actions:**
- Add `answer_question(question: str)` method to `AIAssistant`
- Build context from events, counters, and fault history
- Add `POST /ai/question` endpoint
- Add text input to AI panel in dashboard

### 18. Expand AI Features — Recipe Comparison
**Why it matters:** "Why did the 30-pack run slower than the 24-pack?" is a natural question that the AI should answer using structured recipe data and session statistics.
**Files:** `app/ai/context_builder.py`, `app/ai/assistant.py`, `app/ai/prompts.py`
**Category:** AI
**Actions:**
- Add `build_recipe_comparison_context()` to context builder
- Add `compare_recipes()` method to `AIAssistant`
- Add `GET /ai/compare-recipes?recipe_a=xxx&recipe_b=xxx` endpoint

### 19. Add AI narrative to reports
**Why it matters:** The `Logging_and_Reporting_Spec.md` calls for an "AI-generated narrative section" in reports. Currently reports are purely structured data.
**Files:** `app/reports/generator.py`, `app/api/server.py`
**Category:** Reports / AI
**Actions:**
- Modify `generate_session_report()` to accept an optional AI assistant
- Call `AIAssistant.summarize_session()` and include the result in the report
- Add the AI narrative to the markdown report output

### 20. Fill test gaps
**Why it matters:** State machine has only 1 test. No tests for multi-cycle production, comms timeout, or MANUAL mode behavior. These gaps reduce confidence in the core behavioral model.
**Files:** `tests/test_state_machine.py`, `tests/test_phase2.py`
**Category:** Tests
**Actions:**
- Add tests to `test_state_machine.py`:
  - Stop transitions from RUNNING → RUN_EMPTY → STOPPED
  - Reset transitions from FAULTED → STARTING → RUNNING
  - Starvation and recovery transitions
  - Blockage and recovery transitions
  - Run-empty with partial group
- Add multi-cycle test to `test_phase2.py`:
  - Run 5+ consecutive cycles and verify counters increment correctly
- Add MANUAL mode test:
  - Verify recipe change is allowed in MANUAL
  - Verify start is blocked in MANUAL

### 21. Add warmup model (optional)
**Why it matters:** The specs mention optional warmup cycles with elevated fault probability during startup. This adds realism but is P2 priority.
**Files:** `app/simulator/engine.py`, `configs/recipes.json`
**Category:** Simulator
**Actions:**
- Add `warmup_cycles` and `warmup_multiplier` fields to Recipe model
- Track `cycles_since_start` in engine
- Apply elevated fault probability during warmup period
- Apply slower cycle time during warmup

### 22. Add comms health monitoring
**Why it matters:** The `PLC_Tag_List.md` defines `DB_STS.CommsHealthy` but it's not implemented. This is important for industrial realism.
**Files:** `app/shared/tag_store.py`, `app/api/server.py`, `app/dashboard/src/hooks/useSimulator.ts`
**Category:** Shared / API / Dashboard
**Actions:**
- Add `comms_healthy` boolean to tag store `sts` group
- Add heartbeat timestamp to tag store `evt` group
- Update heartbeat on each `/tick` call
- Dashboard hook sets `comms_healthy = false` if no response within 5 seconds
- Surface comms status in UI header

### 23. Add explicit reset and recipe change permissives
**Why it matters:** The PLC spec calls for named permissives (`perm_reset_ok`, `perm_recipe_change_ok`) but these are only implied by HMI flags.
**Files:** `app/control/controller.py`
**Category:** Controller
**Actions:**
- Add `_evaluate_reset_permissive()` method
- Add `_evaluate_recipe_change_permissive()` method
- Expose as named fields in the tag store
- Use in HMI flag calculation

### 24. Add WebSocket endpoint (optional)
**Why it matters:** The specs mention WebSocket for live status streaming. Currently the dashboard polls at 2Hz. WebSocket would be more efficient and feel more industrial.
**Files:** `app/api/server.py`
**Category:** API
**Actions:**
- Add `/ws` WebSocket endpoint using FastAPI's `WebSocket` support
- Broadcast state snapshots on each tick
- Modify `useSimulator` hook to use WebSocket when available, fall back to polling

---

## Impact Analysis

### Highest Impact for Portfolio Value
1. **Build Production screen** (#7) — Completes the core HMI set; biggest visual improvement
2. **Build Recipe screen** (#8) — Shows recipe-driven behavior; essential for demos
3. **Build Diagnostics screen** (#9) — Demonstrates PLC-style I/O visibility
4. **Fix fake metrics** (#3) — Removes the most obvious "this isn't real" signal
5. **Fix SVG gradients** (#2) — Eliminates visible visual bugs

### Highest Impact for Industrial Realism
1. **Fix `refill_blanks()` auto-reset** (#5) — Aligns with spec's manual-reset requirement
2. **Add comms health monitoring** (#22) — Real industrial systems always monitor comms
3. **Add explicit permissives** (#23) — Makes PLC control logic more explicit and testable
4. **Add warmup model** (#21) — Real machines have startup instability
5. **Add Mode Switching UI** (#15) — AUTO/MANUAL is fundamental to industrial control

### Highest Impact for Technical Quality
1. **Add missing dependencies** (#1) — Fixes broken `pip install -e .`
2. **Add SQLite persistence** (#10) — Unlocks multi-session history and better reports
3. **Clean up DEBUG prints and dead code** (#4) — Professional code quality
4. **Fill test gaps** (#20) — Increases confidence in core behavioral model
5. **Add `__init__.py` exports** (#12) — Cleaner package API

---

## Phased Checklist

### Phase 1 — Fix and Polish (Today, 1-2 hours)
- [ ] Add `google-genai`, `pytest` to `pyproject.toml`; add `app.reports` to packages
- [ ] Add `#belt-texture` and `#fault-gradient` to SimulationView `<defs>`
- [ ] Replace hardcoded Efficiency/MTBF with computed values
- [ ] Remove DEBUG prints, dead code, `time.sleep(0.0)`
- [ ] Fix `refill_blanks()` auto-reset to require manual Reset
- [ ] Fix transient pack ID collision
- [ ] Create `app/reports/__init__.py`
- [ ] Add exports to all `__init__.py` files

### Phase 2 — Complete Dashboard (1-2 days)
- [ ] Build Production screen with KPIs, runtime/downtime, last pack result
- [ ] Build Recipe screen with list, detail panel, select/confirm
- [ ] Build Diagnostics screen with I/O indicators and dev toggles
- [ ] Add Mode Switching UI (AUTO/MANUAL toggle)
- [ ] Add explicit Run Empty button
- [ ] Add Event History / Timeline view
- [ ] Fix `stable_cycles` in ScenarioRunner

### Phase 3 — Persistence and Analytics (1-2 days)
- [ ] Add SQLite persistence for events
- [ ] Add `GET /sessions` endpoint
- [ ] Add session selection to reports
- [ ] Install `recharts` and add trend charts to Production screen
- [ ] Add AI narrative to reports

### Phase 4 — AI Expansion (1-2 days)
- [ ] Add Log Q&A assistant (`POST /ai/question`)
- [ ] Add Recipe Comparison assistant (`GET /ai/compare-recipes`)
- [ ] Add text input to AI panel in dashboard

### Phase 5 — Test and Polish (1 day)
- [ ] Add state machine transition tests (stop, reset, starve, block, run-empty)
- [ ] Add multi-cycle production test
- [ ] Add MANUAL mode tests
- [ ] Add comms health monitoring
- [ ] Add explicit reset/recipe permissives
- [ ] (Optional) Add warmup model
- [ ] (Optional) Add WebSocket endpoint

---

## What Can Wait Until Later

These items are in the specs but have low impact on demo/portfolio readiness:

- **Microstoppage behavior** — P2 feature, adds complexity without visible benefit
- **Save/load session state** — SQLite persistence (#10) covers the main use case
- **Configurable cycle phase splits** — Hardcoded splits work fine for V1
- **HTML/PDF export** — Markdown is sufficient for demos
- **Authentication** — Intentionally excluded per specs
- **Multi-machine line simulation** — Future scope
- **OPC UA / MQTT bridge** — Future scope
- **Siemens Structured Text implementation** — Spec-only for now
- **Voice/spoken summaries** — Nice-to-have, not core
