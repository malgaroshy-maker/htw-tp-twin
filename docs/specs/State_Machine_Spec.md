# State Machine Specification

## 1. Purpose

This document defines the behavioral state machine for the simplified tray packer digital twin project.

The state machine is the central control model shared by:
- the Python simulator
- the PLC control specification
- the HMI status model
- the AI event interpretation layer
- the dashboard and reporting system

This is a **behavioral state machine**, not a full mechanical or servo-motion model.

---

## 2. Design Goals

The state model must:
- feel realistic to an operator or maintenance technician
- be simple enough for fast implementation
- support animation, reporting, and AI explanations
- map cleanly to PLC-style control logic
- support faults, run-empty behavior, and recipe-based operation

The state model does **not** attempt to reproduce exact vendor-specific machine internals.

---

## 3. State Model Scope

The machine is modeled as one main equipment unit with:
- one active production sequence
- one selected recipe
- one machine status at a time
- multiple possible faults and warnings
- a simplified run-empty behavior
- manual and automatic operating modes

---

## 4. Top-Level Machine States

## 4.1 Core Runtime States

### STOPPED
Machine is not running.
- No automatic cycle execution
- No packaging action
- Machine may still be powered/ready
- Operator may select recipe or switch modes

### STARTING
Machine is transitioning from stopped/ready into production.
- Start permissives are checked
- Internal startup timer runs
- Machine transitions to RUNNING if startup succeeds

### RUNNING
Machine is in automatic production.
- Product grouping is allowed
- Cycle execution is allowed
- Pack discharge is allowed
- Faults, blocks, and starvation are monitored

### RUN_EMPTY
Machine is completing remaining internal material before stopping.
- New product intake may be disabled or ignored
- Current buffered/grouped product is processed if possible
- Machine transitions to STOPPED after internal flow is cleared

### STARVED
Machine cannot continue normal cycle execution because upstream product is unavailable.
- Machine is waiting for product
- This is not necessarily a hard fault
- May auto-recover if product returns

### BLOCKED
Machine cannot continue because downstream discharge is unavailable.
- Machine waits for downstream clearance
- This is typically not a fault unless extended or unsafe

### FAULTED
Machine has encountered a fault requiring operator or maintenance intervention.
- Automatic operation is stopped
- Current fault code is active
- Reset sequence is required before restart

---

## 5. Operating Modes

Operating mode is separate from runtime state.

## 5.1 AUTO
Normal automatic production mode.
- Automatic cycle execution enabled
- Main production state machine active

## 5.2 MANUAL
Manual operator/maintenance mode.
- Automatic cycle sequence disabled
- Step/jog/manual actions may be permitted
- Used for testing, setup, maintenance, and recovery

## 5.3 SETUP
Optional simplified mode for recipe change or preparation.
- Parameter checks
- Optional guided setup flow
- Can be represented as MANUAL in V1 if needed

For V1, the minimum required modes are:
- AUTO
- MANUAL

---

## 6. Internal Cycle Phases

When the machine is in RUNNING or RUN_EMPTY, the internal production sequence uses simplified phases.

### IDLE
No active pack cycle in progress.
- Waiting for enough grouped product
- Waiting for blank availability
- Waiting for discharge availability

### GROUPING
Products are being accumulated toward recipe target count.
- Incoming products fill the grouping buffer
- When target count is reached, machine becomes cycle-ready

### BLANK_FEED
A carton blank is requested and moved into position.
- Simplified time delay
- Fails if blank supply unavailable

### PACKING
Grouped products are merged with blank.
- Simplified pack creation phase
- Reject and fault logic may trigger here

### DISCHARGE
Pack exits the machine.
- Good pack goes to outfeed
- Rejected pack goes to reject path

These phases are internal sub-states, not top-level machine states.

---

## 7. Main State Transition Rules

## 7.1 STOPPED Transitions
- STOPPED -> STARTING
  - Trigger: Start command
  - Conditions: AUTO mode, permissives true, no active fault

- STOPPED -> MANUAL context
  - Trigger: Mode switched to MANUAL
  - Effect: Manual functions allowed, no auto cycle

## 7.2 STARTING Transitions
- STARTING -> RUNNING
  - Trigger: Startup timer complete
  - Conditions: permissives remain true

- STARTING -> FAULTED
  - Trigger: critical fault during startup

- STARTING -> STOPPED
  - Trigger: stop command or startup aborted

## 7.3 RUNNING Transitions
- RUNNING -> STARVED
  - Trigger: insufficient product available for continued operation

- RUNNING -> BLOCKED
  - Trigger: downstream unavailable or discharge blocked

- RUNNING -> FAULTED
  - Trigger: fault requiring stop

- RUNNING -> RUN_EMPTY
  - Trigger: stop command with controlled emptying logic

- RUNNING -> STOPPED
  - Trigger: immediate stop logic (optional, normally avoided in AUTO)

## 7.4 STARVED Transitions
- STARVED -> STARTING
  - Trigger: product supply restored and restart logic enabled

- STARVED -> RUNNING
  - Alternative simplified implementation: direct return when product restored

- STARVED -> STOPPED
  - Trigger: operator stop

- STARVED -> FAULTED
  - Trigger: starvation escalates into fault condition (optional)

## 7.5 BLOCKED Transitions
- BLOCKED -> STARTING
  - Trigger: downstream available again and restart logic enabled

- BLOCKED -> RUNNING
  - Alternative simplified implementation: direct return when downstream clears

- BLOCKED -> STOPPED
  - Trigger: operator stop

- BLOCKED -> FAULTED
  - Trigger: blocked condition becomes critical fault (optional)

## 7.6 FAULTED Transitions
- FAULTED -> STARTING
  - Trigger: fault cleared + reset command + permissives true

- FAULTED -> STOPPED
  - Trigger: reset to safe idle state without auto restart

For V1, either of the above is acceptable.
Preferred behavior:
- reset sends machine to STARTING if AUTO mode and permissives are valid

## 7.7 RUN_EMPTY Transitions
- RUN_EMPTY -> STOPPED
  - Trigger: internal grouped material cleared and no pack cycle active

- RUN_EMPTY -> FAULTED
  - Trigger: fault occurs during run-empty

---

## 8. Start Permissives

The simulator and PLC layer should use a simplified permissive model.

Minimum required permissives:
- machine mode = AUTO
- no active fault
- blank system available
- safety ready flag = true
- E-stop clear = true
- guard status okay = true
- required utilities okay = true

Optional permissives:
- downstream available
- recipe valid
- product source enabled

If any mandatory permissive is false, start must be rejected.

---

## 9. Fault Classes

## 9.1 Soft Production Interruptions
These may map to STARVED or BLOCKED instead of FAULTED.
Examples:
- no product available
- downstream temporarily full

## 9.2 Recoverable Faults
These send machine to FAULTED and require reset.
Examples:
- blank missing during cycle start
- gap control jam
- internal sequencing error
- invalid recipe or parameter fault

## 9.3 Non-Stopping Reject Events
These do not change top-level machine state.
Examples:
- incomplete formation
- open flap detection
- bad pack routed to reject lane

This distinction is important:
- not every defect is a machine fault
- some events reduce quality but production continues

---

## 10. Minimum V1 Fault/Event Set

The project should start with these event types:

### STARVATION
- Cause: no incoming product
- Top-level effect: STARVED

### DOWNSTREAM_BLOCK
- Cause: outfeed unavailable
- Top-level effect: BLOCKED

### BLANK_MISSING
- Cause: no blank when cycle begins
- Top-level effect: FAULTED

### GAP_CONTROL_JAM
- Cause: jam in transfer/packing flow
- Top-level effect: FAULTED

### INCOMPLETE_PACK
- Cause: simulated bad formation
- Top-level effect: reject only

### OPEN_FLAP
- Cause: simulated packaging defect
- Top-level effect: reject only

---

## 11. Command Model

The machine must respond to these operator/control commands:

### CMD_START
Requests automatic startup.
Valid from:
- STOPPED
- STARVED
- BLOCKED
- after reset if permitted

### CMD_STOP
Requests controlled stop.
Valid from:
- STARTING
- RUNNING
- STARVED
- BLOCKED

Preferred effect:
- RUNNING -> RUN_EMPTY

### CMD_RESET
Clears recoverable faults.
Valid from:
- FAULTED

### CMD_MODE_AUTO
Select automatic mode.

### CMD_MODE_MANUAL
Select manual mode.

### CMD_RECIPE_SELECT
Selects active recipe.
Usually valid only when:
- STOPPED
- MANUAL
- setup-ready condition

### CMD_ACK_ALARM
Acknowledges alarm message without clearing fault state.
Optional in V1.

---

## 12. Output Status Model

The simulator should expose these status fields:

### State Outputs
- machine_state
- machine_mode
- cycle_phase
- ready_to_start
- cycle_active
- fault_active
- warning_active

### Production Outputs
- selected_recipe
- grouped_count
- recipe_target_count
- good_pack_count
- reject_pack_count
- cycle_count

### Fault Outputs
- fault_code
- fault_text
- last_event
- alarm_list (optional in V1)

### Availability Outputs
- product_available
- blank_available
- downstream_available
- utilities_ok
- safety_ok

---

## 13. Suggested Event Names

Use a consistent event naming style for logs and AI features.

Examples:
- MACHINE_START_REQUESTED
- MACHINE_STARTED
- MACHINE_STOP_REQUESTED
- MACHINE_RUN_EMPTY_ENTERED
- MACHINE_STOPPED
- MACHINE_STARVED
- MACHINE_BLOCKED
- MACHINE_FAULTED
- MACHINE_RESET
- PRODUCT_GROUP_COMPLETE
- BLANK_FEED_STARTED
- PACK_CYCLE_STARTED
- PACK_GOOD_DISCHARGED
- PACK_REJECT_DISCHARGED
- FAULT_BLANK_MISSING
- FAULT_GAP_CONTROL_JAM

---

## 14. State Transition Table (Compact)

| From State | Trigger | Conditions | To State |
|---|---|---|---|
| STOPPED | Start command | AUTO + permissives true | STARTING |
| STARTING | Startup complete | No fault | RUNNING |
| STARTING | Fault occurs | Critical issue | FAULTED |
| RUNNING | Product unavailable | Supply lost | STARVED |
| RUNNING | Downstream unavailable | Outfeed blocked | BLOCKED |
| RUNNING | Stop command | Controlled stop | RUN_EMPTY |
| RUNNING | Fault occurs | Recoverable/critical | FAULTED |
| STARVED | Product restored | Restart logic | STARTING or RUNNING |
| BLOCKED | Downstream restored | Restart logic | STARTING or RUNNING |
| FAULTED | Reset command | Fault cleared + permissives true | STARTING or STOPPED |
| RUN_EMPTY | Internal flow cleared | No cycle active | STOPPED |

---

## 15. Simplifications Used in This Model

The following are intentionally simplified:
- exact servo axis coordination
- exact mechanical folding sequence
- detailed pneumatic stroke confirmation
- vendor-specific low-level PLC step logic
- detailed PackML transition substates beyond what is useful for V1

This is intentional and desirable for the project.

---

## 16. Recommended V1 Implementation Pattern

Recommended implementation:
- top-level machine state enum
- machine mode enum
- internal cycle phase enum
- event dispatcher or transition function
- timer-driven transitions
- fault injection hooks
- structured event log on every state change

Pseudo-structure:

```text
if command_start and permissives_ok:
    state = STARTING

if state == STARTING and startup_timer_done:
    state = RUNNING

if state == RUNNING and no_product:
    state = STARVED

if state == RUNNING and downstream_blocked:
    state = BLOCKED

if state == RUNNING and fault_detected:
    state = FAULTED

if state == RUNNING and stop_requested:
    state = RUN_EMPTY

if state == RUN_EMPTY and internal_flow_empty:
    state = STOPPED
```

---

## 17. Recommended Future Extension

Later phases may add:
- more detailed internal sub-states
- manual jog sub-state model
- alarm priority classes
- maintenance lockout state
- scenario-driven abnormal transitions
- richer PackML mapping
- multi-machine line interaction

For V1, these are not required.

---

## 18. Final Guidance

This state machine should be treated as the authoritative behavioral contract for:
- simulator implementation
- PLC-style control mapping
- HMI state display
- dashboard status logic
- AI explanations of machine behavior

If code, UI, or documentation conflicts with this file, this file should be used as the reference until formally revised.
