# PLC Tag List

## 1. Purpose

This document provides the concrete PLC-oriented tag list for the simplified tray packer digital twin project.

It is intended to support:
- PLC-style control implementation
- HMI screen binding
- simulator interface mapping
- dashboard integration
- AI/event/logging consumption
- future Siemens/TIA-style data block organization

This tag list is aligned with:
- `Tag_Interface_Spec.md`
- `PLC_Control_Spec.md`
- `State_Machine_Spec.md`
- `Simulation_Specifications.md`

---

## 2. Tag Design Principles

The tag list should:
- be simple and stable
- feel natural for PLC/HMI use
- separate commands, status, faults, counters, and configuration
- avoid unnecessary low-level hardware detail
- support future UDT/DB organization

This is a **behavioral machine tag list**, not a full terminal-by-terminal electrical I/O list.

---

## 3. Recommended Logical Grouping

Recommended PLC logical grouping:

- `DB_CMD`
- `DB_CFG`
- `DB_IN`
- `DB_STS`
- `DB_OUT`
- `DB_FAULT`
- `DB_EVT`
- `DB_HMI`

Equivalent structured group names in code are also acceptable:
- `Cmd`
- `Cfg`
- `In`
- `Sts`
- `Out`
- `Fault`
- `Evt`
- `Hmi`

---

## 4. Tag Conventions

### Data Type Guidance
Use PLC-friendly types such as:
- `Bool`
- `Int`
- `DInt`
- `Real`
- `String`
- enumerated integer constants or strings mapped in software

### Direction Guidance
- `HMI -> PLC`
- `PLC -> Simulator`
- `Simulator -> PLC`
- `PLC -> HMI`
- `Read only`
- `Write pulse`

### Pulse Guidance
The following tags are normally pulse-style:
- Start
- Stop
- Reset
- Alarm Acknowledge
- Clear Counters

---

## 5. Command Tags

These are operator/control requests handled by the PLC and typically forwarded to the simulator.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_CMD.Start | Bool | HMI -> PLC -> Simulator | Request automatic start |
| DB_CMD.Stop | Bool | HMI -> PLC -> Simulator | Request controlled stop / run empty |
| DB_CMD.Reset | Bool | HMI -> PLC -> Simulator | Request recoverable fault reset |
| DB_CMD.ModeAuto | Bool | HMI -> PLC -> Simulator | Select AUTO mode |
| DB_CMD.ModeManual | Bool | HMI -> PLC -> Simulator | Select MANUAL mode |
| DB_CMD.AckAlarm | Bool | HMI -> PLC | Acknowledge active alarm |
| DB_CMD.ClearCounts | Bool | HMI -> PLC -> Simulator | Clear counters if allowed |
| DB_CMD.RunEmpty | Bool | HMI -> PLC -> Simulator | Explicit run-empty request |
| DB_CMD.RecipeSelectID | Int / String | HMI -> PLC -> Simulator | Requested recipe |

### Notes
- In a Siemens-style implementation, these may be HMI command bits consumed and reset by PLC logic.
- `ModeAuto` and `ModeManual` may be treated as mutually exclusive requests.

---

## 6. Configuration Tags

These tags represent selected operating configuration.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_CFG.ActiveRecipeID | Int / String | PLC <-> Simulator | Active recipe identifier |
| DB_CFG.ActiveRecipeName | String | Simulator -> PLC/HMI | Human-readable recipe name |
| DB_CFG.TargetPackCount | Int | Simulator -> PLC/HMI | Products per pack |
| DB_CFG.NominalCycleTimeSec | Real | Simulator -> PLC/HMI | Base cycle time |
| DB_CFG.RejectProbability | Real | Simulator -> PLC/AI | Recipe reject tendency |
| DB_CFG.JamProbability | Real | Simulator -> PLC/AI | Recipe jam tendency |
| DB_CFG.AutoRestartOnRecovery | Bool | PLC -> Simulator | Whether STARVED/BLOCKED auto-recovery may resume automatically |

### Notes
- Only a few of these need to be operator-editable.
- In V1, most configuration can come from loaded recipe files.

---

## 7. External Condition / Availability Inputs

These tags represent external machine conditions.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_IN.ProductAvailable | Bool | External/HMI/Test -> PLC/Simulator | Upstream product available |
| DB_IN.BlankAvailable | Bool | External/HMI/Test -> PLC/Simulator | Blank supply available |
| DB_IN.DownstreamAvailable | Bool | External/HMI/Test -> PLC/Simulator | Outfeed available |
| DB_IN.SafetyOK | Bool | External/HMI/Test -> PLC/Simulator | Safety condition healthy |
| DB_IN.EStopOK | Bool | External/HMI/Test -> PLC/Simulator | E-stop clear |
| DB_IN.GuardsClosed | Bool | External/HMI/Test -> PLC/Simulator | Guard/door status healthy |
| DB_IN.UtilitiesOK | Bool | External/HMI/Test -> PLC/Simulator | Required utilities available |
| DB_IN.OperatorPresent | Bool | Optional | Optional operator presence |
| DB_IN.MaintenanceLock | Bool | Optional | Maintenance inhibit active |

### Notes
- In early development, these may be toggled from the simulator UI or dashboard.
- In later PLC/HMI phases, they may be mapped to test bits, scenario engine outputs, or real interface signals.

---

## 8. Machine Status Tags

These are the core machine behavior outputs.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_STS.MachineState | String / Int | Simulator -> PLC/HMI | STOPPED, STARTING, RUNNING, RUN_EMPTY, STARVED, BLOCKED, FAULTED |
| DB_STS.MachineMode | String / Int | PLC/Simulator -> HMI | AUTO or MANUAL |
| DB_STS.ReadyToStart | Bool | PLC/Simulator -> HMI | Consolidated readiness |
| DB_STS.CycleActive | Bool | Simulator -> PLC/HMI | Pack cycle in progress |
| DB_STS.CyclePhase | String / Int | Simulator -> PLC/HMI | IDLE, GROUPING, CAPTURED, BLANK_FEED, TRANSFER, PACKING, DISCHARGE |
| DB_STS.FaultActive | Bool | Simulator -> PLC/HMI | Active machine-stopping fault |
| DB_STS.WarningActive | Bool | Simulator -> PLC/HMI | Active warning present |
| DB_STS.RunEmptyActive | Bool | Simulator -> PLC/HMI | Run-empty currently active |
| DB_STS.StartPermissiveOK | Bool | PLC -> HMI | PLC permissives valid |
| DB_STS.RecipeChangePermitted | Bool | PLC -> HMI | Recipe change currently allowed |
| DB_STS.ResetPermitted | Bool | PLC -> HMI | Reset currently allowed |
| DB_STS.ManualAllowed | Bool | PLC -> HMI | Manual mode actions allowed |
| DB_STS.CommsHealthy | Bool | PLC/HMI | Interface healthy |

---

## 9. Production and Counter Tags

These are performance and production-related outputs.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_OUT.GroupedCount | Int | Simulator -> PLC/HMI | Current grouped product count |
| DB_OUT.TargetGroupCount | Int | Simulator -> PLC/HMI | Current recipe target count |
| DB_OUT.CycleCount | DInt | Simulator -> PLC/HMI/AI | Completed cycle count |
| DB_OUT.GoodPackCount | DInt | Simulator -> PLC/HMI/AI | Accepted packs |
| DB_OUT.RejectPackCount | DInt | Simulator -> PLC/HMI/AI | Rejected packs |
| DB_OUT.TotalProductIn | DInt | Simulator -> PLC/HMI/AI | Total products entering |
| DB_OUT.TotalProductUsed | DInt | Simulator -> PLC/HMI/AI | Total products consumed into cycles |
| DB_OUT.RuntimeSec | Real | Simulator -> PLC/HMI/AI | Accumulated runtime |
| DB_OUT.DowntimeSec | Real | Simulator -> PLC/HMI/AI | Accumulated downtime |
| DB_OUT.LastCycleTimeSec | Real | Simulator -> PLC/HMI/AI | Most recent cycle time |
| DB_OUT.AvgCycleTimeSec | Real | Simulator -> PLC/HMI/AI | Average cycle time |
| DB_OUT.SessionStartTS | String | Optional | Session start timestamp |
| DB_OUT.LastPackResult | String / Int | Simulator -> PLC/HMI | GOOD or REJECT |
| DB_OUT.LastRejectReason | String | Simulator -> PLC/HMI/AI | Most recent reject reason |

---

## 10. Fault and Alarm Tags

These tags support alarms, troubleshooting, and reset logic.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_FAULT.ActiveCode | String / Int | Simulator -> PLC/HMI | Current active fault code |
| DB_FAULT.ActiveText | String | Simulator -> PLC/HMI | Human-readable fault text |
| DB_FAULT.ActiveSeverity | String / Int | Simulator -> PLC/HMI | INFO, WARNING, FAULT, CRITICAL |
| DB_FAULT.Latched | Bool | Simulator -> PLC/HMI | Fault requires reset |
| DB_FAULT.Timestamp | String | Simulator -> PLC/HMI/AI | Last active fault timestamp |
| DB_FAULT.ActiveCount | Int | Simulator -> PLC/HMI | Number of active alarms/faults |
| DB_FAULT.LastAckText | String | PLC -> HMI | Last acknowledged alarm/fault |
| DB_FAULT.LastClearedCode | String / Int | Optional | Last cleared fault code |
| DB_FAULT.StopCauseCode | String / Int | Simulator/PLC -> HMI/AI | Most recent stop cause |
| DB_FAULT.StopCauseText | String | Simulator/PLC -> HMI/AI | Most recent stop cause text |

### Recommended Fault Codes
- `STARVATION`
- `DOWNSTREAM_BLOCK`
- `BLANK_MISSING`
- `GAP_CONTROL_JAM`
- `INCOMPLETE_PACK`
- `OPEN_FLAP`

---

## 11. Event Tags

These tags expose the latest event information.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_EVT.LastEventCode | String | Simulator -> PLC/HMI/AI | Most recent event code |
| DB_EVT.LastEventText | String | Simulator -> PLC/HMI/AI | Most recent event text |
| DB_EVT.LastEventTS | String | Simulator -> PLC/HMI/AI | Event timestamp |
| DB_EVT.LastStateChange | String | Simulator -> PLC/HMI/AI | Last state transition |
| DB_EVT.LastRejectReason | String | Simulator -> PLC/HMI/AI | Last reject reason |
| DB_EVT.LastRecoveryAction | String | Optional | Recovery message or event |
| DB_EVT.NewEventPulse | Bool | Simulator -> PLC/HMI | Event pulse flag for HMI/event log handling |

---

## 12. HMI Helper Tags

These tags are optional but highly useful for clean screen logic.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_HMI.StartButtonEnabled | Bool | PLC -> HMI | Start available |
| DB_HMI.StopButtonEnabled | Bool | PLC -> HMI | Stop available |
| DB_HMI.ResetButtonEnabled | Bool | PLC -> HMI | Reset available |
| DB_HMI.AutoModeEnabled | Bool | PLC -> HMI | AUTO selection allowed |
| DB_HMI.ManualModeEnabled | Bool | PLC -> HMI | MANUAL selection allowed |
| DB_HMI.RecipeChangeEnabled | Bool | PLC -> HMI | Recipe selection allowed |
| DB_HMI.ShowFaultBanner | Bool | PLC -> HMI | Show fault banner |
| DB_HMI.ShowWarningBanner | Bool | PLC -> HMI | Show warning banner |
| DB_HMI.StatusLampColor | String / Int | PLC -> HMI | Suggested status lamp color |
| DB_HMI.FooterMessage | String | PLC -> HMI | Contextual operator message |

---

## 13. Optional Manual Mode Tags

Not required for V1, but useful later.

| Tag Name | Type | Direction | Description |
|---|---|---|---|
| DB_CMD.ManualStepCycle | Bool | HMI -> PLC -> Simulator | Manual step request |
| DB_CMD.JogInfeed | Bool | HMI -> PLC -> Simulator | Jog infeed |
| DB_CMD.JogBlankFeed | Bool | HMI -> PLC -> Simulator | Jog blank feed |
| DB_CMD.JogDischarge | Bool | HMI -> PLC -> Simulator | Jog discharge |
| DB_STS.ManualActionAllowed | Bool | PLC -> HMI | Manual step/jog currently allowed |

---

## 14. Minimum V1 Tag Set

If the first implementation needs a reduced set, start with this list.

### Commands
- `DB_CMD.Start`
- `DB_CMD.Stop`
- `DB_CMD.Reset`
- `DB_CMD.ModeAuto`
- `DB_CMD.ModeManual`
- `DB_CMD.RecipeSelectID`

### Inputs
- `DB_IN.ProductAvailable`
- `DB_IN.BlankAvailable`
- `DB_IN.DownstreamAvailable`
- `DB_IN.SafetyOK`
- `DB_IN.EStopOK`
- `DB_IN.GuardsClosed`
- `DB_IN.UtilitiesOK`

### Status
- `DB_STS.MachineState`
- `DB_STS.MachineMode`
- `DB_STS.ReadyToStart`
- `DB_STS.CyclePhase`
- `DB_STS.FaultActive`
- `DB_STS.StartPermissiveOK`

### Counters
- `DB_OUT.GroupedCount`
- `DB_OUT.TargetGroupCount`
- `DB_OUT.CycleCount`
- `DB_OUT.GoodPackCount`
- `DB_OUT.RejectPackCount`

### Fault/Event
- `DB_FAULT.ActiveCode`
- `DB_FAULT.ActiveText`
- `DB_EVT.LastEventCode`
- `DB_EVT.LastEventText`

This is enough for:
- simulator behavior
- PLC control demo
- HMI overview screen
- dashboard status panel
- AI basic explanation features

---

## 15. Recommended Enumerations

### MachineState
Possible values:
- `STOPPED`
- `STARTING`
- `RUNNING`
- `RUN_EMPTY`
- `STARVED`
- `BLOCKED`
- `FAULTED`

### MachineMode
Possible values:
- `AUTO`
- `MANUAL`

### CyclePhase
Possible values:
- `IDLE`
- `GROUPING`
- `CAPTURED`
- `BLANK_FEED`
- `TRANSFER`
- `PACKING`
- `DISCHARGE`

### Severity
Possible values:
- `INFO`
- `WARNING`
- `FAULT`
- `CRITICAL`

### PackResult
Possible values:
- `GOOD`
- `REJECT`

Implementation may use:
- strings
- integer enums with lookup tables
- both

---

## 16. Ownership Rules

### PLC-Owned Tags
Usually written by PLC logic:
- `DB_CMD.*`
- `DB_HMI.*`
- start permissive and control enable flags
- selected mode request handling

### Simulator-Owned Tags
Usually written by simulator:
- `DB_STS.*`
- `DB_OUT.*`
- `DB_FAULT.*`
- `DB_EVT.*`

### Shared/Test-Owned Tags
May be written by:
- HMI in development mode
- simulator side test tools
- scenario engine
- PLC bridge
Examples:
- `DB_IN.*`

This ownership should be preserved to avoid conflicts.

---

## 17. Suggested Siemens-Friendly UDT Layout

A future Siemens/TIA structure could define:

### `UDT_Cmd`
- Start
- Stop
- Reset
- ModeAuto
- ModeManual
- AckAlarm
- ClearCounts
- RunEmpty
- RecipeSelectID

### `UDT_In`
- ProductAvailable
- BlankAvailable
- DownstreamAvailable
- SafetyOK
- EStopOK
- GuardsClosed
- UtilitiesOK
- OperatorPresent
- MaintenanceLock

### `UDT_Sts`
- MachineState
- MachineMode
- ReadyToStart
- CycleActive
- CyclePhase
- FaultActive
- WarningActive
- RunEmptyActive
- StartPermissiveOK
- RecipeChangePermitted
- ResetPermitted
- ManualAllowed
- CommsHealthy

### `UDT_Out`
- GroupedCount
- TargetGroupCount
- CycleCount
- GoodPackCount
- RejectPackCount
- TotalProductIn
- TotalProductUsed
- RuntimeSec
- DowntimeSec
- LastCycleTimeSec
- AvgCycleTimeSec
- LastPackResult
- LastRejectReason

### `UDT_Fault`
- ActiveCode
- ActiveText
- ActiveSeverity
- Latched
- Timestamp
- ActiveCount
- LastAckText
- StopCauseCode
- StopCauseText

### `UDT_Evt`
- LastEventCode
- LastEventText
- LastEventTS
- LastStateChange
- LastRejectReason
- NewEventPulse

---

## 18. HMI Binding Guidance

Recommended HMI screen usage:

### Overview Screen
Bind:
- `DB_STS.MachineState`
- `DB_STS.MachineMode`
- `DB_OUT.GoodPackCount`
- `DB_OUT.RejectPackCount`
- `DB_OUT.GroupedCount`
- `DB_CFG.ActiveRecipeName`
- `DB_FAULT.ActiveText`

### Control Screen
Bind:
- `DB_CMD.Start`
- `DB_CMD.Stop`
- `DB_CMD.Reset`
- `DB_CMD.ModeAuto`
- `DB_CMD.ModeManual`
- `DB_CMD.RecipeSelectID`
- `DB_HMI.* button enables`

### Fault Screen
Bind:
- `DB_FAULT.ActiveCode`
- `DB_FAULT.ActiveText`
- `DB_FAULT.ActiveSeverity`
- `DB_EVT.LastEventText`
- `DB_EVT.LastEventTS`

### Production Screen
Bind:
- `DB_OUT.CycleCount`
- `DB_OUT.GoodPackCount`
- `DB_OUT.RejectPackCount`
- `DB_OUT.RuntimeSec`
- `DB_OUT.DowntimeSec`
- `DB_OUT.LastCycleTimeSec`
- `DB_OUT.AvgCycleTimeSec`

---

## 19. Bridge / Integration Mapping Guidance

### OPC UA Example Paths
- `/Commands/Start`
- `/Commands/Stop`
- `/Commands/Reset`
- `/Inputs/ProductAvailable`
- `/Status/MachineState`
- `/Outputs/GoodPackCount`
- `/Faults/ActiveCode`
- `/Events/LastEventCode`

### MQTT Example Topics
- `traypacker/cmd/start`
- `traypacker/cmd/stop`
- `traypacker/in/product_available`
- `traypacker/sts/machine_state`
- `traypacker/out/good_pack_count`
- `traypacker/fault/active_code`
- `traypacker/evt/last_event_code`

The logical meaning of the tags must remain stable regardless of transport.

---

## 20. Validation Rules

The PLC/HMI layer should validate:
- required tags are present
- enum values are valid
- command pulses are reset properly
- no illegal mode/state combinations appear
- counters never go negative
- recipe selection maps to a valid recipe

Examples:
- cannot show Start enabled if `DB_STS.StartPermissiveOK = false`
- cannot allow recipe change if machine state = `RUNNING`
- `DB_FAULT.ActiveCode` should be blank if no active latching fault exists

---

## 21. Example Simplified Variable Block

```text
DB_CMD:
  Start : Bool
  Stop : Bool
  Reset : Bool
  ModeAuto : Bool
  ModeManual : Bool
  RecipeSelectID : Int

DB_IN:
  ProductAvailable : Bool
  BlankAvailable : Bool
  DownstreamAvailable : Bool
  SafetyOK : Bool
  EStopOK : Bool
  GuardsClosed : Bool
  UtilitiesOK : Bool

DB_STS:
  MachineState : String
  MachineMode : String
  ReadyToStart : Bool
  CyclePhase : String
  FaultActive : Bool

DB_OUT:
  GroupedCount : Int
  TargetGroupCount : Int
  GoodPackCount : DInt
  RejectPackCount : DInt
  CycleCount : DInt

DB_FAULT:
  ActiveCode : String
  ActiveText : String

DB_EVT:
  LastEventCode : String
  LastEventText : String
```

---

## 22. Final Guidance

This file is the concrete PLC/HMI/simulator tag reference for the project.

If any implementation needs to choose between:
- control clarity
- app clarity
- simulator clarity

the semantic meaning of the tags defined here should remain stable across all layers.

The main rule is:
**one shared behavioral tag model should drive the entire project.**
