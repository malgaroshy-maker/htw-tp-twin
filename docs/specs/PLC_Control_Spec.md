# PLC Control Specification

## 1. Purpose

This document defines the PLC-style control layer for the simplified tray packer digital twin project.

The PLC control layer is responsible for:
- operator command handling
- machine start/stop/reset behavior
- mode selection
- permissives and interlocks
- recipe selection rules
- high-level machine control sequencing
- exposing and consuming the shared tag interface
- coordinating with the simulator as the machine/process side

This document describes a **Siemens-friendly, behavioral control model**, not a vendor-exact OEM program.

---

## 2. Scope

The PLC control layer in this project is intentionally limited to **high-level machine control**.

It is responsible for:
- PackML-like machine state management
- machine command arbitration
- start permissives
- fault reaction behavior
- run-empty logic
- recipe control rules
- basic HMI interactions
- simulation command/output handshake

It is **not** responsible for:
- exact servo axis control
- electronic cam programming
- real safety PLC programming
- detailed OEM sequence internals
- detailed motion timing physics

Those details are intentionally abstracted into the simulator and specifications.

---

## 3. Design Goals

The PLC layer must:
- feel like real industrial control logic
- be simple enough to implement using vibe coding
- map cleanly to Siemens Structured Text
- support future PLCSIM/OPC UA integration
- work cleanly with the simulator as a digital machine
- remain understandable to AI coding agents

---

## 4. PLC Role in the Overall Architecture

The project separates control and machine behavior.

### PLC Layer
Acts as the controller.
It decides:
- whether machine is allowed to start
- when to request stop/run-empty
- when reset is allowed
- how modes are selected
- whether commands are valid
- how HMI commands are turned into machine commands

### Simulator Layer
Acts as the machine/process.
It decides:
- how the machine behaves once commanded
- grouping progress
- cycle timing
- pack generation
- reject behavior
- simulated faults and state feedback

This separation is critical.

The PLC does **not** simulate the machine internals.
The simulator does **not** decide operator intent or command policy.

---

## 5. PLC Functional Responsibilities

The PLC control layer should implement these functions:

1. Command handling
2. Mode handling
3. Start permissive evaluation
4. State coordination
5. Fault reset coordination
6. Run-empty coordination
7. Recipe selection and validation
8. HMI handshake
9. Simulator handshake
10. Alarm status forwarding
11. Event and status reporting support

---

## 6. Control Philosophy

The PLC program should follow this philosophy:

- Operator/HMI issues requests
- PLC validates requests
- PLC writes commands to simulator interface
- Simulator returns machine states and status
- PLC uses returned status to drive HMI, alarms, and sequence permissions

The PLC logic should always prefer:
- deterministic state control
- explicit permissives
- clear command ownership
- readable status mapping

---

## 7. PLC Execution Model

The PLC layer can be modeled as a cyclic scan controller, even if the actual implementation is pure software.

Each scan or cycle should:
1. Read operator/HMI command requests
2. Read simulator feedback/status
3. Evaluate permissives/interlocks
4. Update command outputs
5. Update control states and internal flags
6. Publish values for HMI/dashboard/logging

This makes the design compatible with PLC thinking.

---

## 8. Main PLC Control Blocks

A practical PLC architecture should include the following logical blocks.

### 8.1 Command Manager
Handles:
- start request
- stop request
- reset request
- mode requests
- recipe selection request

### 8.2 Permissive Manager
Evaluates:
- safety ready
- E-stop clear
- guards closed
- utilities okay
- blank availability
- optional downstream readiness
- machine not faulted or fault cleared

### 8.3 Mode Manager
Maintains:
- AUTO mode
- MANUAL mode
- setup-ready interpretation if added later

### 8.4 Machine State Coordinator
Coordinates control behavior using:
- simulator machine state
- operator commands
- restart logic
- run-empty logic

### 8.5 Alarm/Fault Coordinator
Interprets:
- simulator fault feedback
- HMI acknowledge
- reset permission
- alarm display flags

### 8.6 Recipe Manager
Handles:
- recipe request validation
- recipe change permission
- selected recipe feedback
- HMI recipe state

### 8.7 Interface Mapper
Maps internal PLC variables to:
- simulator tags
- HMI tags
- dashboard/export layer
- future OPC UA nodes

---

## 9. Operating Modes

The PLC layer must support at least:

### AUTO
Normal automatic production.
- automatic start/stop allowed
- simulator cycle operation allowed
- normal PackML-like behavior active

### MANUAL
Manual/jog/maintenance mode.
- automatic start sequence disabled
- manual functions may be enabled later
- recipe change usually allowed
- HMI maintenance/diagnostic actions may be allowed

### Optional Future Mode
SETUP may later be added as a clearer operator-facing mode, but it is not required for V1.

---

## 10. PLC State Perspective

The PLC should not duplicate the full internal machine sequence.
Instead, it should coordinate with the simulator’s top-level machine states.

Expected machine states from simulator:
- STOPPED
- STARTING
- RUNNING
- RUN_EMPTY
- STARVED
- BLOCKED
- FAULTED

The PLC should treat these as authoritative machine feedback states.

---

## 11. Command Handling Rules

## 11.1 Start Command
The PLC may issue `CMD_START` only if:
- mode = AUTO
- no unresolved fault
- permissives are true
- recipe is valid
- machine state is STOPPED, STARVED, or BLOCKED
- start request is not already active

Recommended behavior:
- HMI Start button sets internal request
- PLC pulses `CMD_START`
- simulator transitions to STARTING/RUNNING
- PLC clears request after acknowledgment or timeout

## 11.2 Stop Command
The PLC may issue `CMD_STOP` if:
- machine is STARTING, RUNNING, STARVED, or BLOCKED
- stop request is made by operator or scenario logic

Recommended effect:
- simulator performs controlled stop / run-empty
- machine transitions to RUN_EMPTY then STOPPED

## 11.3 Reset Command
The PLC may issue `CMD_RESET` only if:
- machine state is FAULTED
- fault cause is cleared or assumed cleared
- reset is allowed by control rules

Recommended behavior:
- pulse reset
- wait for FAULTED to clear
- optionally restart if AUTO policy allows

## 11.4 Mode Change Command
Mode changes should be controlled by PLC rules.
Recommended:
- AUTO <-> MANUAL allowed only when machine not actively RUNNING
- if necessary, require STOPPED before mode change

## 11.5 Recipe Selection Command
Recipe selection should generally be allowed only when:
- machine state = STOPPED
- or machine mode = MANUAL

The PLC should reject recipe change requests during active production.

---

## 12. Start Permissive Model

The PLC should calculate a consolidated start permissive flag.

### Minimum Permissives
- AUTO mode selected
- no active latching fault
- E-stop clear
- guards closed
- safety okay
- utilities okay
- blank system available
- recipe valid

### Optional Permissives
- downstream available
- product available
- operator present
- maintenance lock not active

### Output
Recommended internal flag:
- `perm_start_ok`

This should drive:
- Start button enable state
- ready lamp/status
- simulator `STS_READY_TO_START` consistency

---

## 13. Stop / Run-Empty Logic

The preferred stop philosophy is:
- operator presses Stop
- PLC issues stop request
- simulator enters RUN_EMPTY
- internal remaining material is cleared
- simulator returns STOPPED

The PLC should treat RUN_EMPTY as:
- a controlled transition state
- not a fault
- not equivalent to STOPPED

HMI should show it clearly.

---

## 14. Fault Handling Strategy

The PLC control layer should distinguish between:

### A. Machine-Stopping Faults
Examples:
- BLANK_MISSING
- GAP_CONTROL_JAM

Response:
- inhibit automatic start
- require reset
- show fault on HMI
- log event
- maintain fault latched until cleared

### B. State Interruptions
Examples:
- STARVATION
- DOWNSTREAM_BLOCK

Response:
- reflect state on HMI
- may auto-recover
- no reset usually required
- may allow automatic resume

### C. Reject-Only Events
Examples:
- INCOMPLETE_PACK
- OPEN_FLAP

Response:
- no machine stop
- increment reject-related counters
- optional warnings/trend alerts

The PLC should not treat all abnormal events as latching faults.

---

## 15. Reset Strategy

Recommended V1 reset behavior:
1. Operator clears the condition
2. Operator presses Reset
3. PLC pulses `CMD_RESET`
4. PLC waits for FAULTED state to clear
5. Machine returns to STARTING or STOPPED depending on policy

### Suggested Policy
- In AUTO, reset may restart to STARTING if permissives are valid
- In MANUAL, reset may leave machine STOPPED

This policy should be consistent across HMI and simulator.

---

## 16. Recipe Management Strategy

The PLC recipe manager should:
- accept recipe request from HMI
- validate requested recipe against known list
- only allow change in valid machine conditions
- write `CMD_RECIPE_SELECT` or `CFG_RECIPE_ID`
- confirm recipe feedback from simulator/config layer

### Recommended Recipe Signals
- requested recipe
- active recipe
- recipe valid
- recipe change permitted
- recipe change in progress (optional)

---

## 17. HMI Interaction Model

The PLC should serve as the main HMI control layer.

### HMI-to-PLC Inputs
- Start
- Stop
- Reset
- Mode Auto
- Mode Manual
- Recipe select
- Alarm acknowledge
- Optional test toggles in dev mode

### PLC-to-HMI Outputs
- machine state
- machine mode
- ready status
- fault active
- fault text
- active recipe
- counters
- grouped count
- cycle phase
- button enable states

Important:
The HMI should not directly bypass PLC control logic in the standard architecture.

---

## 18. Simulator Handshake Model

The PLC and simulator should communicate through the tag interface.

### PLC writes:
- CMD_START
- CMD_STOP
- CMD_RESET
- CMD_MODE_AUTO
- CMD_MODE_MANUAL
- CMD_RECIPE_SELECT

### Simulator writes:
- STS_MACHINE_STATE
- STS_MACHINE_MODE
- STS_READY_TO_START
- STS_CYCLE_PHASE
- STS_FAULT_ACTIVE
- FAULT_CODE
- FAULT_TEXT
- OUT_* counters

### Shared or external condition tags:
- IN_PRODUCT_AVAILABLE
- IN_BLANK_AVAILABLE
- IN_DOWNSTREAM_AVAILABLE
- IN_SAFETY_OK
- IN_ESTOP_OK
- IN_GUARDS_CLOSED
- IN_UTILITIES_OK

This contract should remain transport-independent.

---

## 19. PLC Internal Variables

A practical PLC implementation should maintain internal variables such as:

### Commands / Requests
- `req_start`
- `req_stop`
- `req_reset`
- `req_mode_auto`
- `req_mode_manual`
- `req_recipe_change`

### Permissives
- `perm_start_ok`
- `perm_reset_ok`
- `perm_recipe_change_ok`

### Status Mirrors
- `machine_state`
- `machine_mode`
- `cycle_phase`
- `fault_active`
- `fault_code`
- `active_recipe`

### UI Control Flags
- `hmi_start_enabled`
- `hmi_stop_enabled`
- `hmi_reset_enabled`
- `hmi_recipe_change_enabled`

These internal flags make the HMI logic much easier.

---

## 20. Suggested Siemens-Friendly Program Structure

A good Structured Text-oriented layout could be:

- `FB_CommandManager`
- `FB_PermissiveManager`
- `FB_ModeManager`
- `FB_RecipeManager`
- `FB_FaultCoordinator`
- `FB_InterfaceMapper`
- `FB_MachineControl`

Possible global DBs / UDTs:
- `UDT_CommandInterface`
- `UDT_StatusInterface`
- `UDT_FaultInterface`
- `UDT_RecipeInterface`
- `DB_HMI`
- `DB_Interface`
- `DB_Control`

This structure is friendly to Siemens-style project organization.

---

## 21. Suggested Scan Logic

Pseudo-order of execution:

1. Read simulator feedback
2. Read HMI inputs
3. Evaluate permissives
4. Evaluate mode changes
5. Evaluate recipe requests
6. Evaluate reset requests
7. Evaluate start/stop requests
8. Write command outputs
9. Update HMI status and enables
10. Log or expose state changes

This sequence reduces ambiguity.

---

## 22. Example PLC Logic Pseudocode

```text
IF req_mode_auto AND machine_state = STOPPED THEN
    mode_auto := TRUE;
    mode_manual := FALSE;
END_IF;

perm_start_ok :=
    mode_auto
    AND NOT fault_active
    AND in_estop_ok
    AND in_guards_closed
    AND in_safety_ok
    AND in_utilities_ok
    AND in_blank_available
    AND recipe_valid;

IF req_start AND perm_start_ok THEN
    cmd_start := TRUE;
ELSE
    cmd_start := FALSE;
END_IF;

IF req_stop AND machine_state IN [STARTING, RUNNING, STARVED, BLOCKED] THEN
    cmd_stop := TRUE;
ELSE
    cmd_stop := FALSE;
END_IF;

perm_reset_ok :=
    machine_state = FAULTED;

IF req_reset AND perm_reset_ok THEN
    cmd_reset := TRUE;
ELSE
    cmd_reset := FALSE;
END_IF;
```

This is intentionally simple and appropriate for V1.

---

## 23. Minimum V1 PLC Responsibilities

If implementation time is limited, the PLC layer must at least provide:
- mode selection
- start permissive evaluation
- start/stop/reset handling
- recipe selection gatekeeping
- fault/reset button enable logic
- simulator tag handshake
- HMI status mapping

This is enough to make the project feel like a real controlled machine.

---

## 24. What the PLC Layer Should Not Do in V1

To avoid overcomplication, the PLC layer should not initially include:
- exact motion profiles
- manual axis jog logic for every component
- complex alarm shelving
- low-level I/O simulation of every sensor
- OEM-exact sequence charts
- real safety logic certification modeling

These can come later if needed.

---

## 25. PLC Testing Requirements

The PLC control layer should be testable in isolation.

Minimum tests:
- cannot start if permissives false
- can start if permissives true
- stop request transitions to controlled stop behavior
- reset only valid in fault
- recipe change denied while running
- AUTO/MANUAL button rules behave correctly
- HMI button enable states match control state

These tests can be implemented in Python first, even before real PLC code exists.

---

## 26. Future Siemens / PLCSIM Adaptation

This project should be designed so the control specification can later map into:
- Siemens Structured Text blocks
- TIA Portal UDTs and DBs
- PLCSIM Advanced or equivalent testing flow
- OPC UA or MQTT bridge layer

To support this, keep:
- tag naming stable
- data groupings consistent
- state values controlled
- control logic readable and deterministic

---

## 27. AI and Analytics Relationship

The AI layer should read PLC-related status but should not directly command PLC outputs.

Good AI uses:
- explain why start is inhibited
- explain why reset is disabled
- summarize downtime and fault patterns
- compare recipe performance
- assist with operator training

Unsafe AI pattern to avoid:
- direct autonomous writing of start/stop/reset commands in normal operation

---

## 28. Final Guidance

This file defines the behavioral PLC control contract for the project.

If simulator code, HMI design, or integration logic disagrees about the responsibilities of the PLC layer, this document should be used as the reference until revised.

The key rule is:
**the PLC layer controls the machine at a high level, while the simulator behaves like the machine.**
