# Tasks — Phase 3

## Phase 3 Goal
Build the **PLC/HMI control layer and simulator integration foundation** for the simplified tray packer digital twin platform.

At the end of Phase 3, the project should have:
- a clear PLC-style control model
- a stable command/status tag contract
- HMI screen definitions aligned with simulator behavior
- a documented simulator ↔ controller connection method
- optional mock control service for development and testing
- Siemens Structured Text style control logic specifications and code skeletons

Phase 3 focuses on **control structure, interfaces, and integration readiness**, not exact OEM machine replication.

---

## Phase 3 Scope

### In scope
- PLC control specification
- machine command/state contract
- PLC tag list and data types
- HMI functional specification
- HMI screen flow and navigation
- simulator ↔ control connection design
- OPC UA-first integration strategy
- optional MQTT compatibility notes
- mock controller adapter for local development
- Siemens Structured Text style program organization
- alarm and permissive handling model
- recipe command and status model
- manual mode and diagnostics behavior

### Out of scope
- exact Meurer OEM PLC recreation
- real servo axis programming
- safety PLC implementation
- certified machine safety logic
- exact fieldbus hardware configuration
- production-ready WinCC project export in V1

---

## Phase 3 Deliverables

### Required files and modules
- `docs/PLC_Control_Spec.md`
- `docs/PLC_Tag_List.md`
- `docs/Tag_Interface_Spec.md`
- `docs/HMI_Spec.md`
- `docs/HMI_Screen_Flow.md`
- `docs/PLC_Sim_Connection_Spec.md`
- `docs/State_Machine_Spec.md` (updated/finalized)
- `docs/Alarm_Model.md`
- `docs/Permissives_And_Interlocks.md`
- `docs/Recipe_Model.md` (updated if needed)
- `src/control/`
- `src/integration/`
- `src/mock_plc/` (optional but recommended)
- `tests/control/`
- `tests/integration/`

### Required working behaviors
- simulator can be driven through a formal command interface
- command/status tags are documented and stable
- PLC-style logic can evaluate permissives, commands, and machine feedback
- HMI screens and controls match simulator functionality
- local mock control layer can issue `start`, `stop`, `reset`, `run_empty`, and `recipe_select`
- a future Siemens/PLCSIM path is clearly documented

---

## Execution order

### Step 1 — Freeze control boundaries
Define what belongs to the controller versus what belongs to the simulator.

### Step 2 — Define tags and control model
Create the canonical command, status, alarm, counter, and recipe tags.

### Step 3 — Define HMI behavior
Specify screens, navigation, controls, and what each screen must show.

### Step 4 — Build development integration path
Implement an internal/mock controller adapter and connect it to the simulator.

### Step 5 — Prepare Siemens-facing artifacts
Write ST-style logic structure, naming conventions, and mapping notes for future implementation.

---

# Detailed task list

## 1. Control boundary definition
- [ ] Document the architectural boundary between **controller** and **simulator**.
- [ ] Define what the controller is responsible for:
  - command arbitration
  - mode handling
  - permissive checks
  - alarm handling
  - recipe command/state management
  - operator interaction model
- [ ] Define what the simulator is responsible for:
  - machine behavior
  - product flow
  - pack cycle execution
  - fault/reject outcomes
  - counters and events
  - simulated status feedback
- [ ] Define which behaviors remain internal to the simulator and are **not** PLC-controlled in V1.
- [ ] Add examples of valid and invalid boundary crossings.

### Definition of done
- control responsibilities are explicit
- simulator responsibilities are explicit
- future agents can implement code without mixing layers

---

## 2. PLC-style machine control model
- [ ] Define high-level control states and modes.
- [ ] Map command flow for:
  - Start
  - Stop
  - Reset
  - Run Empty
  - Manual Mode
  - Auto Mode
  - Recipe Select
- [ ] Define permissive evaluation logic before machine start.
- [ ] Define behavior when commands are issued in invalid states.
- [ ] Define how faults affect control state.
- [ ] Define how `STARVED`, `BLOCKED`, and `FAULTED` should appear to the controller.
- [ ] Define operator acknowledgement and reset sequence.

### Definition of done
- PLC-style control flow is documented clearly
- commands and responses are deterministic
- invalid control cases are covered

---

## 3. State machine specification finalization
- [ ] Finalize the canonical state list used across simulator, dashboard, and control docs.
- [ ] Define allowed transitions between states.
- [ ] Create a transition table with:
  - current state
  - triggering condition
  - next state
  - emitted event(s)
- [ ] Separate **machine process states** from **control modes** where needed.
- [ ] Define startup, stop, reset, and run-empty semantics precisely.
- [ ] Document assumptions and intentional simplifications.

### Definition of done
- one source of truth exists for state logic
- all project layers use the same state names and meanings
- transition table is implementation-ready

---

## 4. PLC tag list
- [ ] Define naming convention for tags.
- [ ] Create canonical tag groups:
  - commands
  - mode/status
  - recipe
  - counters
  - faults/alarms
  - permissives/interlocks
  - diagnostics
- [ ] For each tag, define:
  - name
  - direction (`PLC→SIM`, `SIM→PLC`, `bidirectional`, `internal`)
  - data type
  - description
  - update behavior
  - default value
- [ ] Add tags for minimum V1 control:
  - `Cmd_Start`
  - `Cmd_Stop`
  - `Cmd_Reset`
  - `Cmd_RunEmpty`
  - `Cmd_AutoMode`
  - `Cmd_ManualMode`
  - `Cmd_RecipeSelect`
  - `Sts_Ready`
  - `Sts_Running`
  - `Sts_Faulted`
  - `Sts_Starved`
  - `Sts_Blocked`
  - `Sts_CurrentRecipe`
  - `Cnt_GoodPacks`
  - `Cnt_RejectPacks`
  - `Alm_ActiveCode`
  - `Prm_ProductAvailable`
  - `Prm_BlankAvailable`
  - `Prm_DownstreamFree`
- [ ] Define extensibility notes for future tags.

### Definition of done
- tag list is clear and implementation-ready
- directions and meanings are unambiguous
- tags can be mapped to simulator data and future Siemens projects

---

## 5. Tag interface specification
- [ ] Define canonical payload formats for tag exchange.
- [ ] Choose minimum V1 exchange model:
  - in-process adapter
  - local JSON snapshot
  - HTTP API
  - WebSocket stream
  - OPC UA namespace mapping notes
- [ ] Define update rates or polling expectations for each tag group.
- [ ] Define tag write rules and acknowledgement behavior.
- [ ] Define timestamp and session requirements.
- [ ] Add sample payloads for command write and status read.
- [ ] Add error-handling behavior for stale or invalid tag values.

### Definition of done
- interface is documented with examples
- simulator and mock controller can use the same contract
- future OPC UA mapping path is obvious

---

## 6. Permissives and interlocks
- [ ] Define the minimum start permissives for V1.
- [ ] Include at least:
  - recipe selected
  - no active blocking fault
  - blank available
  - downstream available
  - machine not in fault reset sequence
- [ ] Define warning-only vs stop-causing conditions.
- [ ] Define which conditions block `Start`.
- [ ] Define which conditions force stop or fault during run.
- [ ] Create a permissive evaluation table.
- [ ] Document which real-machine interlocks are intentionally simplified.

### Definition of done
- permissive logic is practical and testable
- agents can implement start gating consistently
- documentation matches simulator assumptions

---

## 7. Alarm and fault control model
- [ ] Define alarm severity levels:
  - info
  - warning
  - fault/stop
- [ ] Map simulator faults to controller-visible alarm codes.
- [ ] Define latching vs non-latching alarm behavior.
- [ ] Define acknowledgement logic.
- [ ] Define reset requirements by fault type.
- [ ] Define alarm history/event expectations.
- [ ] Add examples for common faults:
  - blank missing
  - product starvation
  - downstream blocked
  - incomplete pack
  - gap control jam

### Definition of done
- alarm behavior is consistent across simulator, dashboard, and HMI specs
- AI features can rely on stable alarm metadata
- future HMI alarm pages have enough detail to be implemented

---

## 8. Recipe control model
- [ ] Define how recipes are selected from HMI/controller side.
- [ ] Define when recipe change is allowed.
- [ ] Define what simulator values recipe selection affects.
- [ ] Define returned recipe status/confirmation tags.
- [ ] Define mismatch/error behavior for unknown recipes.
- [ ] Document how future recipe parameters can expand.

### Definition of done
- recipe control behavior is stable and consistent
- recipe selection can be driven externally
- invalid recipe behavior is documented

---

## 9. HMI functional specification
- [ ] Define HMI design goals:
  - clear operator visibility
  - industrial-style layout
  - training usability
  - diagnostics accessibility
- [ ] Define required screens:
  - Overview
  - Auto/Run screen
  - Manual screen
  - Alarms
  - Recipe screen
  - Counters/KPIs
  - Diagnostics/I-O
  - Maintenance/Status
- [ ] Define what each screen shows.
- [ ] Define what buttons/actions each screen allows.
- [ ] Define visual indicators for state, alarms, and permissives.
- [ ] Define navigation behavior.
- [ ] Document which screen elements are mandatory for V1 vs later.

### Definition of done
- HMI scope is complete enough for UI implementation
- screen purposes are clear
- simulator behavior and HMI controls align

---

## 10. HMI screen flow and operator journeys
- [ ] Create navigation map between screens.
- [ ] Document primary operator journeys:
  - startup and run
  - stop and run empty
  - fault acknowledge and reset
  - change recipe
  - diagnose machine status
  - inspect counters and session data
- [ ] Define important edge cases and what the HMI should show.
- [ ] Add HMI mock state examples for key faults and warnings.
- [ ] Define how manual mode should differ visually from auto mode.

### Definition of done
- operator flows are clear
- future WinCC-style design can be built from the spec
- HMI logic is usable for both simulator dashboard and PLC-facing UI

---

## 11. Siemens Structured Text style control design
- [ ] Define PLC program organization for a Siemens-style implementation.
- [ ] Propose block structure such as:
  - `FB_MachineControl`
  - `FB_Permissives`
  - `FB_AlarmManager`
  - `FB_RecipeManager`
  - `FB_CommandInterface`
  - `DB_MachineState`
- [ ] Define naming conventions aligned with Siemens-style readability.
- [ ] Create pseudocode or ST skeletons for:
  - command handling
  - permissive evaluation
  - alarm latching/reset
  - recipe selection
  - mode logic
- [ ] Document what is real PLC logic versus simulator-side behavior.
- [ ] Add notes for later TIA Portal translation.

### Definition of done
- ST-style code structure is documented clearly
- future Siemens implementation work is simplified
- scope remains aligned to the simplified digital twin

---

## 12. Mock controller / development adapter
- [ ] Create local mock control service or adapter.
- [ ] Allow writing commands to the simulator through the formal interface.
- [ ] Allow reading status, counters, and alarms.
- [ ] Add a simple test panel or CLI for control-side actions.
- [ ] Support automated integration tests against the simulator.
- [ ] Log control writes and responses.

### Definition of done
- simulator can be exercised through formal command/status paths
- front-end or tests do not need direct engine access
- PLC/HMI concepts become demonstrable before Siemens tooling exists

---

## 13. OPC UA-first integration plan
- [ ] Document why OPC UA is the primary future integration method.
- [ ] Map canonical tags to an OPC UA namespace proposal.
- [ ] Define read/write expectations for each tag group.
- [ ] Add notes for future PLCSIM Advanced / Siemens integration.
- [ ] Add secondary notes for optional MQTT mirroring if desired.
- [ ] Identify what would need to change for real PLC connectivity later.

### Definition of done
- integration strategy is practical and future-facing
- OPC UA mapping is clear enough to implement later
- project stays portable during early development

---

## 14. Testing and validation
- [ ] Add control-state unit tests.
- [ ] Add permissive evaluation tests.
- [ ] Add alarm/reset behavior tests.
- [ ] Add recipe command tests.
- [ ] Add integration tests for command→simulator→status flow.
- [ ] Add negative tests for invalid commands and stale inputs.
- [ ] Validate docs and code names stay aligned.

### Definition of done
- control logic is testable and stable
- integration layer is trustworthy enough for dashboard and AI use
- core behaviors are regression-safe

---

## 15. Demo readiness
- [ ] Prepare a local demo where a controller-like layer starts, stops, resets, and changes recipe.
- [ ] Show state and alarm feedback through the formal tag interface.
- [ ] Show at least one HMI mock or dashboard page driven by the control contract.
- [ ] Document the complete demo flow.
- [ ] Capture screenshots or demo notes for the portfolio.

### Definition of done
- Phase 3 can be demonstrated without real PLC hardware
- external observers can understand the value of the control layer
- future Siemens integration path is credible

---

## Suggested execution order for agents
1. Control boundary definition
2. State machine finalization
3. PLC tag list
4. Tag interface specification
5. Permissives/interlocks
6. Alarm model
7. Recipe control model
8. HMI spec and screen flow
9. ST-style control design
10. Mock controller adapter
11. OPC UA integration notes
12. Tests and demo prep

---

## Risks to manage
- control responsibilities leaking into simulator internals
- overcomplicating the PLC layer with unnecessary low-level machine details
- inconsistent naming across simulator, dashboard, and control docs
- designing for real Siemens hardware too early instead of proving the interface first
- HMI becoming a generic dashboard instead of an operator-oriented industrial UI

---

## Phase exit criteria
Phase 3 is complete when:
- a formal command/status control contract exists
- simulator integration is working through that contract
- PLC-style control behavior is fully specified
- HMI scope and flow are documented clearly
- Siemens-oriented implementation guidance exists
- the project is ready for real PLC/HMI-oriented work in a future phase
