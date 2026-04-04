# Tag Interface Specification

## 1. Purpose

This document defines the shared tag interface for the simplified tray packer digital twin project.

The tag interface is the main communication contract between:
- the Python simulator
- the PLC-style control layer
- the HMI/dashboard
- the AI assistant and analytics layer
- future OPC UA or MQTT integration

This file is intentionally written in a PLC-friendly and app-friendly way.

---

## 2. Design Goals

The tag interface must:
- be simple enough for early development
- feel familiar to industrial control engineers
- support simulator-driven and PLC-driven operation
- allow dashboard and AI features to read machine behavior consistently
- be extensible for future Siemens/PLCSIM integration

The tag interface is **behavioral**, not a full low-level hardware I/O map.

---

## 3. Interface Architecture

The system is divided into logical layers:

### 3.1 Control Side
This side issues commands and setpoints.
Examples:
- start
- stop
- reset
- mode change
- recipe select

This layer may be implemented by:
- a PLC-style controller
- a software control service
- an HMI control panel
- a test harness

### 3.2 Machine Side
This side represents machine behavior and status.
Examples:
- current machine state
- cycle active
- grouped count
- fault active
- good pack count

This layer is implemented by:
- the simulator engine

### 3.3 Observer Side
This side reads but should not directly control core behavior.
Examples:
- dashboard
- historian/logger
- AI assistant
- reporting service

---

## 4. Tag Naming Rules

Recommended naming style:
- upper snake case for specification names
- optional dotted or slash namespaces in implementation
- stable semantic meaning across the project

Examples:
- CMD_START
- STS_MACHINE_STATE
- IN_PRODUCT_AVAILABLE
- OUT_GOOD_PACK_COUNT
- EVT_LAST_EVENT_CODE

Suggested runtime namespace style:
- `cmd.*`
- `sts.*`
- `in.*`
- `out.*`
- `cfg.*`
- `evt.*`
- `fault.*`

Example:
- `cmd.start`
- `sts.machine_state`
- `cfg.recipe_id`

Both styles are acceptable as long as they map cleanly.

---

## 5. Tag Groups

The tag model is organized into the following groups:

1. Commands
2. Configuration
3. Inputs / external conditions
4. Machine status
5. Production counters
6. Faults and alarms
7. Events and logging helpers
8. Optional manual-mode tags

---

## 6. Command Tags

These tags request actions from the control layer to the machine layer.

| Tag | Type | Direction | Description |
|---|---|---|---|
| CMD_START | bool | Control -> Machine | Request automatic startup |
| CMD_STOP | bool | Control -> Machine | Request controlled stop / run-empty |
| CMD_RESET | bool | Control -> Machine | Clear recoverable fault and restart or return safe |
| CMD_MODE_AUTO | bool | Control -> Machine | Select auto mode |
| CMD_MODE_MANUAL | bool | Control -> Machine | Select manual mode |
| CMD_ACK_ALARM | bool | Control -> Machine | Acknowledge active alarm message |
| CMD_CLEAR_COUNTS | bool | Control -> Machine | Clear counters if allowed |
| CMD_RUN_EMPTY | bool | Control -> Machine | Explicit run-empty request |
| CMD_RECIPE_SELECT | int/string | Control -> Machine | Select recipe by ID or name |

### Command Handling Notes
- Commands should normally be treated as pulses or momentary actions.
- The simulator/controller may internally latch them as needed.
- HMI implementations may use buttons that generate short write pulses.

---

## 7. Configuration Tags

These tags define selected operating configuration.

| Tag | Type | Direction | Description |
|---|---|---|---|
| CFG_RECIPE_ID | int/string | Control -> Machine | Active recipe identifier |
| CFG_RECIPE_NAME | string | Machine -> Observer | Human-readable recipe name |
| CFG_TARGET_COUNT | int | Machine -> Observer | Products per pack for active recipe |
| CFG_CYCLE_TIME_SEC | float | Machine -> Observer | Nominal cycle time for active recipe |
| CFG_REJECT_PROBABILITY | float | Machine -> Observer | Reject model parameter |
| CFG_JAM_PROBABILITY | float | Machine -> Observer | Fault model parameter |
| CFG_AUTO_RESTART_ON_RECOVERY | bool | Control -> Machine | Defines whether starved/blocked auto-resume is allowed |

### Notes
- In early phases, most config values may be loaded from JSON/YAML recipes.
- Only `CFG_RECIPE_ID` must be written directly from the UI/control layer in V1.

---

## 8. External Condition / Availability Tags

These tags represent conditions around the machine.

| Tag | Type | Direction | Description |
|---|---|---|---|
| IN_PRODUCT_AVAILABLE | bool | External -> Machine | Upstream product supply available |
| IN_BLANK_AVAILABLE | bool | External -> Machine | Blank/carton supply available |
| IN_DOWNSTREAM_AVAILABLE | bool | External -> Machine | Outfeed available |
| IN_SAFETY_OK | bool | External -> Machine | Safety chain healthy |
| IN_ESTOP_OK | bool | External -> Machine | E-stop clear |
| IN_GUARDS_CLOSED | bool | External -> Machine | Guards/doors okay |
| IN_UTILITIES_OK | bool | External -> Machine | Required utilities healthy |
| IN_OPERATOR_PRESENT | bool | External -> Machine | Optional operator availability flag |
| IN_MAINTENANCE_LOCK | bool | External -> Machine | Optional maintenance lock / inhibit |

### Notes
- These are simplified logical conditions, not physical terminal I/O.
- In V1, they may be controlled from keyboard, HMI buttons, or test scenarios.

---

## 9. Machine State Tags

These are the most important status outputs.

| Tag | Type | Direction | Description |
|---|---|---|---|
| STS_MACHINE_STATE | enum/string | Machine -> Observer | Top-level machine state |
| STS_MACHINE_MODE | enum/string | Machine -> Observer | AUTO or MANUAL |
| STS_READY_TO_START | bool | Machine -> Observer | All start permissives valid |
| STS_CYCLE_ACTIVE | bool | Machine -> Observer | Internal pack cycle in progress |
| STS_CYCLE_PHASE | enum/string | Machine -> Observer | IDLE, GROUPING, BLANK_FEED, PACKING, DISCHARGE |
| STS_FAULT_ACTIVE | bool | Machine -> Observer | Any active fault present |
| STS_WARNING_ACTIVE | bool | Machine -> Observer | Any active warning present |
| STS_RUN_EMPTY_ACTIVE | bool | Machine -> Observer | Run-empty logic active |
| STS_START_PERMISSIVE_OK | bool | Machine -> Observer | Consolidated permissive result |

### Recommended Enumerations

#### STS_MACHINE_STATE
Allowed values:
- STOPPED
- STARTING
- RUNNING
- RUN_EMPTY
- STARVED
- BLOCKED
- FAULTED

#### STS_MACHINE_MODE
Allowed values:
- AUTO
- MANUAL

#### STS_CYCLE_PHASE
Allowed values:
- IDLE
- GROUPING
- BLANK_FEED
- PACKING
- DISCHARGE

---

## 10. Production and Counter Tags

These tags describe production behavior.

| Tag | Type | Direction | Description |
|---|---|---|---|
| OUT_GROUPED_COUNT | int | Machine -> Observer | Current grouped product count |
| OUT_TARGET_GROUP_COUNT | int | Machine -> Observer | Required grouped count for current recipe |
| OUT_CYCLE_COUNT | int | Machine -> Observer | Total completed cycles |
| OUT_GOOD_PACK_COUNT | int | Machine -> Observer | Total accepted packs |
| OUT_REJECT_PACK_COUNT | int | Machine -> Observer | Total rejected packs |
| OUT_TOTAL_PRODUCT_IN | int | Machine -> Observer | Total incoming product units |
| OUT_TOTAL_PRODUCT_USED | int | Machine -> Observer | Product units consumed in good/reject packs |
| OUT_RUNTIME_SEC | float | Machine -> Observer | Accumulated runtime |
| OUT_DOWNTIME_SEC | float | Machine -> Observer | Accumulated downtime |
| OUT_LAST_CYCLE_TIME_SEC | float | Machine -> Observer | Most recent completed cycle duration |
| OUT_AVG_CYCLE_TIME_SEC | float | Machine -> Observer | Running average cycle duration |

### Notes
- `OUT_TOTAL_PRODUCT_USED` may equal target count per cycle times number of completed packs.
- Runtime and downtime should follow project rules defined in the simulation specification.

---

## 11. Fault and Alarm Tags

These tags expose active fault information.

| Tag | Type | Direction | Description |
|---|---|---|---|
| FAULT_CODE | int/string | Machine -> Observer | Active fault code |
| FAULT_TEXT | string | Machine -> Observer | Active fault description |
| FAULT_SEVERITY | enum/string | Machine -> Observer | INFO, WARNING, FAULT, CRITICAL |
| FAULT_LATCHED | bool | Machine -> Observer | Indicates fault requires reset |
| FAULT_TIMESTAMP | string/float | Machine -> Observer | Time of last active fault |
| ALM_ACTIVE_COUNT | int | Machine -> Observer | Number of active alarms |
| ALM_LAST_ACKNOWLEDGED | string | Machine -> Observer | Last acknowledged alarm code/text |

### Recommended Fault/Event Codes for V1
- BLANK_MISSING
- GAP_CONTROL_JAM
- STARVATION
- DOWNSTREAM_BLOCK
- INCOMPLETE_PACK
- OPEN_FLAP

### Behavior Guidance
- STARVATION and DOWNSTREAM_BLOCK may be represented as warning/state conditions instead of hard faults.
- BLANK_MISSING and GAP_CONTROL_JAM should normally be latching faults in V1.
- INCOMPLETE_PACK and OPEN_FLAP should normally be reject events, not machine-stopping faults.

---

## 12. Event Tags

These tags help observers understand what happened most recently.

| Tag | Type | Direction | Description |
|---|---|---|---|
| EVT_LAST_EVENT_CODE | string | Machine -> Observer | Most recent event code |
| EVT_LAST_EVENT_TEXT | string | Machine -> Observer | Human-readable description |
| EVT_LAST_EVENT_TS | string/float | Machine -> Observer | Timestamp of most recent event |
| EVT_LAST_STATE_CHANGE | string | Machine -> Observer | Last machine state transition |
| EVT_LAST_PACK_RESULT | enum/string | Machine -> Observer | GOOD or REJECT |
| EVT_LAST_REJECT_REASON | string | Machine -> Observer | Last reject reason if any |

### Notes
- These are convenience tags.
- Full event history should be stored in structured logs, not only in tags.

---

## 13. Optional Manual Mode Tags

These are optional for later phases.

| Tag | Type | Direction | Description |
|---|---|---|---|
| MAN_CMD_STEP_CYCLE | bool | Control -> Machine | Manual step request |
| MAN_CMD_JOG_INFEED | bool | Control -> Machine | Jog infeed |
| MAN_CMD_JOG_BLANK_FEED | bool | Control -> Machine | Jog blank feed |
| MAN_CMD_JOG_DISCHARGE | bool | Control -> Machine | Jog discharge |
| MAN_STS_ACTION_ALLOWED | bool | Machine -> Observer | Whether manual action is allowed |

These should not be required for V1.

---

## 14. Ownership Rules

Each tag should have a clear owner.

### Control-Owned Tags
These are written by HMI/controller/test harness:
- CMD_*
- selected configuration requests
- some external condition overrides in test mode

### Machine-Owned Tags
These are written by the simulator/machine model:
- STS_*
- OUT_*
- FAULT_*
- EVT_*

### Shared / Scenario-Controlled Tags
These may be written by:
- scenario engine
- operator panel
- test harness
Examples:
- IN_PRODUCT_AVAILABLE
- IN_BLANK_AVAILABLE
- IN_DOWNSTREAM_AVAILABLE

---

## 15. Read/Write Rules by Component

## 15.1 Simulator
Reads:
- commands
- configuration
- external availability signals

Writes:
- machine state
- counters
- faults
- events

## 15.2 PLC-Style Controller
Reads:
- machine feedback/status
- availability signals
- fault conditions

Writes:
- start/stop/reset/mode commands
- recipe selection
- optional interlock logic results

## 15.3 HMI/Dashboard
Reads:
- all status/counter/fault/event tags

Writes:
- operator commands
- recipe select
- test toggles only in development mode

## 15.4 AI Assistant
Reads:
- status
- counters
- events
- fault info
- logs/history

Writes:
- no direct machine control in normal architecture

This rule is important:
**AI must not directly control safety-critical machine logic.**

---

## 16. Tag Update Frequency Guidance

Recommended conceptual update rates:

### Fast status tags
Examples:
- STS_MACHINE_STATE
- STS_CYCLE_PHASE
- STS_FAULT_ACTIVE
Update:
- every simulation tick or on change

### Counter tags
Examples:
- OUT_GOOD_PACK_COUNT
- OUT_REJECT_PACK_COUNT
Update:
- on event or once per cycle

### Event tags
Examples:
- EVT_LAST_EVENT_CODE
Update:
- on event change only

### Historian/log data
Persist:
- on state change
- on cycle completion
- on fault start/clear
- on reject event
- at periodic summary intervals

---

## 17. Suggested Runtime Data Model

A practical internal data model might look like this:

```json
{
  "cmd": {
    "start": false,
    "stop": false,
    "reset": false,
    "mode_auto": true,
    "mode_manual": false,
    "recipe_select": "24-pack"
  },
  "in": {
    "product_available": true,
    "blank_available": true,
    "downstream_available": true,
    "safety_ok": true,
    "estop_ok": true,
    "guards_closed": true,
    "utilities_ok": true
  },
  "sts": {
    "machine_state": "RUNNING",
    "machine_mode": "AUTO",
    "cycle_phase": "GROUPING",
    "ready_to_start": true,
    "cycle_active": false,
    "fault_active": false
  },
  "out": {
    "grouped_count": 12,
    "target_group_count": 24,
    "good_pack_count": 40,
    "reject_pack_count": 2,
    "cycle_count": 42
  },
  "fault": {
    "code": "",
    "text": "",
    "latched": false
  },
  "evt": {
    "last_event_code": "PRODUCT_GROUP_COMPLETE",
    "last_event_text": "Recipe target count reached"
  }
}
```

---

## 18. Minimum V1 Tag Set

If implementation time is limited, start with this minimum set.

### Commands
- CMD_START
- CMD_STOP
- CMD_RESET
- CMD_RECIPE_SELECT

### Inputs
- IN_PRODUCT_AVAILABLE
- IN_BLANK_AVAILABLE
- IN_DOWNSTREAM_AVAILABLE
- IN_SAFETY_OK
- IN_ESTOP_OK
- IN_GUARDS_CLOSED

### Status
- STS_MACHINE_STATE
- STS_MACHINE_MODE
- STS_CYCLE_PHASE
- STS_READY_TO_START
- STS_FAULT_ACTIVE

### Counters
- OUT_GROUPED_COUNT
- OUT_TARGET_GROUP_COUNT
- OUT_CYCLE_COUNT
- OUT_GOOD_PACK_COUNT
- OUT_REJECT_PACK_COUNT

### Faults/Events
- FAULT_CODE
- FAULT_TEXT
- EVT_LAST_EVENT_CODE
- EVT_LAST_EVENT_TEXT

This minimum set is enough for:
- simulator behavior
- basic HMI
- dashboard display
- first AI explanations

---

## 19. OPC UA Mapping Guidance

If the project later uses OPC UA, tags should map cleanly into folders such as:

- `/Commands`
- `/Inputs`
- `/Status`
- `/Outputs`
- `/Faults`
- `/Events`
- `/Config`

Example nodes:
- `/Commands/Start`
- `/Status/MachineState`
- `/Outputs/GoodPackCount`
- `/Faults/Code`

This mapping should remain close to the logical groups in this document.

---

## 20. MQTT Mapping Guidance

If the project later uses MQTT, recommended topics include:

- `traypacker/cmd/start`
- `traypacker/cmd/stop`
- `traypacker/in/product_available`
- `traypacker/sts/machine_state`
- `traypacker/out/good_pack_count`
- `traypacker/fault/code`
- `traypacker/evt/last_event_code`

Guideline:
- commands published to `cmd/*`
- state/status published to `sts/*`
- counters published to `out/*`
- fault/event data published to `fault/*` and `evt/*`

---

## 21. AI and Analytics Usage

The AI layer should rely mainly on:
- STS_MACHINE_STATE
- STS_CYCLE_PHASE
- OUT_* counters
- FAULT_* tags
- EVT_* tags
- structured event history

Example uses:
- explain why the machine stopped
- summarize recent downtime
- compare recipe performance
- generate shift summaries
- identify main reject causes

The AI layer should not infer machine truth from animation alone.
The tag interface is the structured source of truth.

---

## 22. Validation Rules

The project should validate:
- required tags are present
- values use allowed types/enums
- illegal state combinations are prevented where possible

Examples of invalid combinations:
- STS_MACHINE_STATE = RUNNING while STS_MACHINE_MODE = MANUAL
- STS_FAULT_ACTIVE = false while FAULT_CODE contains a latching fault
- STS_READY_TO_START = true while safety inputs are false

These validations may be implemented in code and test cases.

---

## 23. Final Guidance

This file is the authoritative tag contract for communication between simulator, PLC, HMI, dashboard, and AI layers.

If implementation details differ by transport method (internal Python, OPC UA, MQTT, PLC mapping), the semantic meaning of the tags defined here must remain stable.

This stability is critical for:
- agent-driven development
- multi-layer integration
- clean testing
- future Siemens-style adaptation
