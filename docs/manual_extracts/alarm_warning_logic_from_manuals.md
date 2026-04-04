# Meurer CM/HTW Tray Packer — Alarm, Warning, Reset, and HMI Logic

This file extracts the control-semantics that matter for the digital twin and future PLC/HMI mapping.

Primary source:
- `365257_18_OI.pdf`

---

## 1. Message Color Semantics

From the operating instruction manual:

### Red = Fault
- A fault causes a **machine stop**.
- The fault must be fixed.
- Then the operator must press **Reset**.

### Yellow = Warning
- A warning does **not** stop the machine immediately.
- If the cause is corrected, the warning resets automatically.
- If the cause is not corrected, it may become a fault after an appropriate time.
- Example given by the manual: **lack of material (e.g. blanks)**.

### Blue = Note
- A note indicates a machine state.
- If the cause is corrected / removed, it resets automatically.
- Example given by the manual: **Simulation mode active**.

### Manual source area
- `365257_18_OI.pdf` — Control panel / troubleshooting pages around **6-49 to 6-52** and **9-7 to 9-8**

---

## 2. What This Means for the Digital Twin

The twin should model three classes of machine messages:

### Faults
Use for conditions that should stop or hold the machine and require operator recovery + reset.
Examples:
- hard jam in protected area
- unsafe transfer condition
- reject bin full (if modeled as stop condition)
- transport chain clearance blocked
- severe fallen-product / crash-risk condition

### Warnings
Use for problems that should be visible early, but not always stop the machine immediately.
Examples:
- blank stack low / missing before hard stop threshold
- reject bin near full
- lane fill mismatch detected but still recoverable
- downstream restriction developing
- lubrication low / pressure issue warning before hard fault

### Notes
Use for state-only conditions.
Examples:
- simulation mode active
- manual mode active
- run empty active
- scenario mode active
- maintenance/demo mode active

---

## 3. Recommended Escalation Rules

### Material-related conditions
The manual explicitly supports a warning-first behavior for material shortage.
Recommended model:
- **blank low / blank unavailable** → warning first
- if unresolved after a threshold / transfer request → fault

### Reject accumulation
Recommended model:
- 1 reject → no warning or minor status only
- 2 rejects stored → warning (`REJECT_BIN_NEAR_FULL`)
- 3 rejects stored → fault (`REJECT_BIN_FULL`) and machine hold/stop

### Downstream blockage
Recommended model:
- brief restricted discharge → warning / blocked developing
- persistent or forbidden-position tray under transport-chain gap control → fault / direct stop

### Lane fill mismatch
Recommended model:
- first mismatch → warning / offset correction attempt
- repeated mismatch or fallen-product confirmation → fault

---

## 4. Reset Logic from the Manual

The operator workflow from the manual is:
1. identify the fault
2. fix the cause according to remedy information
3. press **Reset**
4. solved fault is reset

### Digital twin implication
The twin should avoid "magic recovery" where a physical/material problem immediately clears the full fault state without operator reset.

Examples:
- refilling blanks may restore material availability, but a latched red fault should still require **Reset** if the manual semantics say so
- clearing reject bin may remove the cause, but machine reset should still be explicit if a fault was latched

---

## 5. Alarm History / Error Evaluation Concepts

The manual also describes:
- **alarm history** with chronological entries
- **error evaluation** with:
  - fault frequency
  - longest single duration
  - total duration

### Digital twin implication
Future reports and AI should support:
- event timeline
- frequency by fault code
- total downtime by fault
- longest single fault duration

This is useful for:
- maintenance report assistant
- training review
- industrial realism of the HMI

---

## 6. Recommended Message Policy for the Twin

### Fault (red)
Use when all are true:
- machine cannot continue safely or correctly
- operator intervention is required
- automatic reset is not appropriate

### Warning (yellow)
Use when all are true:
- machine may continue temporarily
- operator should respond soon
- condition can escalate if ignored

### Note (blue)
Use when all are true:
- no fault condition exists
- this is primarily a state / mode / informational indication
- auto-clear is acceptable

---

## 7. Suggested Tags / Structures

### Status tags
- `sts.fault_active`
- `sts.warning_active`
- `sts.note_active`
- `sts.reset_required`

### Fault group
- `fault.active_code`
- `fault.active_text`
- `fault.active_severity`
- `fault.latched`
- `fault.ts`

### Optional warning group (future)
- `warn.active_code`
- `warn.active_text`
- `warn.ts`

### Event / alarm history
- `evt.last_event_code`
- event list with category/severity/timestamp
- per-session fault duration metrics

---

## 8. Best Use of This File by an Agent

An agent should use this file to:
- decide whether a condition is a warning, fault, or note
- prevent unrealistic auto-reset behavior
- design escalation behavior
- improve controller/HMI/reset semantics
- align reports and AI summaries with real alarm semantics
