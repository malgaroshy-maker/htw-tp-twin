# HMI Specification

## 1. Purpose

This document defines the HMI specification for the simplified tray packer digital twin project.

The HMI is the operator-facing layer used to:
- view machine state
- start and stop production
- reset faults
- select recipes
- monitor counters and performance
- observe warnings and faults
- support training and troubleshooting

This HMI is designed in a **WinCC Unified-style industrial layout**, but it is implementation-agnostic and can later be adapted to:
- web dashboard
- desktop control panel
- Siemens HMI structure
- training interface

---

## 2. Design Intent

The HMI should:
- look like a real industrial machine interface
- stay simple and easy to implement
- align with PLC-style control logic
- support both production and training use
- work cleanly with the simulator and shared tag model
- be understandable to AI coding agents

The HMI should not attempt to reproduce the exact OEM machine screens.

---

## 3. HMI Role in the Project

The HMI is not just a visualization tool.
It is the main operator interaction layer for:

- commands
- status
- recipe handling
- faults and resets
- production counters
- diagnostics
- training workflow

The HMI should sit above the PLC-style control layer and use the shared tag interface.

Important rule:
**the HMI should not bypass PLC control rules in the normal architecture.**

---

## 4. Main HMI Design Principles

### 4.1 Clear Machine Status
At all times, the operator should know:
- machine state
- mode
- active recipe
- whether machine is ready
- whether there is an active fault
- whether machine is blocked or starved

### 4.2 Fast Access to Main Actions
The most important actions must be visible and obvious:
- Start
- Stop
- Reset
- Mode select
- Recipe select

### 4.3 Faults Must Be Obvious
Faults and warnings should stand out clearly.
The operator should not need to search for the active stop cause.

### 4.4 Counters Must Be Easy to Read
Good packs, rejects, and runtime/downtime should be visible.

### 4.5 Match the Simplified Behavioral Model
The HMI should reflect the project’s behavioral simulation and not imply hidden complex control logic that does not exist.

---

## 5. Screen Set

Recommended HMI screen set for the project:

1. Overview Screen
2. Control Screen
3. Faults & Alarms Screen
4. Production & Counters Screen
5. Recipe Screen
6. Diagnostics / I-O Screen
7. Training / Scenario Screen (Phase 2+)

For V1, the minimum required screens are:
- Overview
- Control
- Faults
- Production
- Recipe

---

## 6. Overview Screen

## 6.1 Purpose
The Overview screen is the main landing page.
It should summarize the machine at a glance.

## 6.2 Main Content
Display:
- machine state
- machine mode
- active recipe
- cycle phase
- grouped count vs target
- good pack count
- reject pack count
- fault/warning banner
- simplified animated or symbolic machine area
- readiness / permissive indicator

## 6.3 Main Actions
Allow:
- Start
- Stop
- Reset
- go to Recipe screen
- go to Faults screen

## 6.4 Recommended Layout
Top area:
- machine name
- state badge
- mode badge
- active recipe

Center area:
- simplified machine visualization or live status diagram

Right or lower panel:
- counters
- grouped count
- current message
- current fault or last event

Bottom action bar:
- Start
- Stop
- Reset
- Overview
- Production
- Faults
- Recipe

---

## 7. Control Screen

## 7.1 Purpose
The Control screen is focused on operator commands and status.

## 7.2 Main Content
Display:
- Start button
- Stop button
- Reset button
- Auto/Manual mode selection
- Run Empty action
- command enable/disable states
- permissive summary
- operator guidance message

## 7.3 Key Rules
Buttons must reflect PLC logic.
Examples:
- Start disabled when start permissives are false
- Reset enabled only when allowed
- Recipe change disabled while running

## 7.4 Recommended Fields
- `Machine State`
- `Machine Mode`
- `Ready To Start`
- `Start Permissive OK`
- `Fault Active`
- `Reset Permitted`
- `Recipe Change Permitted`

---

## 8. Faults & Alarms Screen

## 8.1 Purpose
The Faults screen explains why the machine is stopped or warning.

## 8.2 Main Content
Display:
- active fault code
- active fault text
- severity
- stop cause
- last event
- last state change
- reset guidance
- optional fault history list

## 8.3 Main Actions
Allow:
- acknowledge alarm
- reset fault
- navigate to diagnostics

## 8.4 Color Guidance
- red = fault
- yellow/orange = warning
- blue = informational
- green = recovered/ready

## 8.5 Example Information Block
- Current Fault: `BLANK_MISSING`
- Severity: `FAULT`
- Machine State: `FAULTED`
- Action: `Restore blank supply and press reset`

---

## 9. Production & Counters Screen

## 9.1 Purpose
The Production screen focuses on throughput and session results.

## 9.2 Main Content
Display:
- cycle count
- good pack count
- reject pack count
- grouped count
- runtime
- downtime
- last cycle time
- average cycle time
- current recipe
- last pack result
- last reject reason

## 9.3 Optional Future Additions
- trend chart
- downtime by cause
- rejects by reason
- OEE-like metrics
- export button

---

## 10. Recipe Screen

## 10.1 Purpose
The Recipe screen allows recipe review and selection.

## 10.2 Main Content
Display:
- available recipes
- selected recipe
- products per pack
- grouping layout preview
- nominal cycle time
- reject probability
- jam probability
- notes

## 10.3 Main Actions
Allow:
- select recipe
- confirm recipe change
- view recipe details

## 10.4 Rules
Recipe selection should generally only be allowed when:
- machine is STOPPED
- or mode is MANUAL

The HMI must clearly show when recipe change is disabled.

---

## 11. Diagnostics / I-O Screen

## 11.1 Purpose
The Diagnostics screen helps understand current machine conditions.

## 11.2 Main Content
Display:
- product available
- blank available
- downstream available
- safety OK
- E-stop OK
- guards closed
- utilities OK
- machine mode
- machine state
- cycle phase

## 11.3 Development Use
In dev mode, this screen may allow toggling external conditions for testing.
Examples:
- product feed on/off
- blank supply on/off
- downstream free/blocked

In a stricter production-style implementation, these would be read-only.

---

## 12. Training / Scenario Screen

## 12.1 Purpose
This screen supports training mode and abnormal condition exercises.

## 12.2 Main Content
Display:
- current scenario
- injected faults
- scenario description
- operator challenge text
- training result summary

## 12.3 Example Scenarios
- repeated starvation
- blank interruption
- intermittent downstream block
- high reject recipe session

This screen is recommended for later phases, not required for V1.

---

## 13. Global HMI Elements

The following elements should remain consistent across screens.

### Header
- project/machine name
- machine state
- machine mode
- active recipe
- communications status

### Footer / Navigation Bar
- Overview
- Control
- Faults
- Production
- Recipe
- Diagnostics
- Training (if enabled)

### Status Banner
A top or center banner should show:
- active fault
- warning
- current message
- stop cause

---

## 14. Main HMI States

The HMI must visually represent the following machine states clearly:
- STOPPED
- STARTING
- RUNNING
- RUN_EMPTY
- STARVED
- BLOCKED
- FAULTED

Recommended color cues:
- STOPPED = gray
- STARTING = blue
- RUNNING = green
- RUN_EMPTY = purple
- STARVED = yellow
- BLOCKED = orange
- FAULTED = red

These state colors should be reused consistently in:
- badges
- machine state panels
- lamps
- banners
- overview visualization

---

## 15. Tag Bindings by Screen

## 15.1 Overview Screen
Recommended bindings:
- `DB_STS.MachineState`
- `DB_STS.MachineMode`
- `DB_CFG.ActiveRecipeName`
- `DB_STS.CyclePhase`
- `DB_OUT.GroupedCount`
- `DB_OUT.TargetGroupCount`
- `DB_OUT.GoodPackCount`
- `DB_OUT.RejectPackCount`
- `DB_FAULT.ActiveText`
- `DB_EVT.LastEventText`

## 15.2 Control Screen
Recommended bindings:
- `DB_CMD.Start`
- `DB_CMD.Stop`
- `DB_CMD.Reset`
- `DB_CMD.ModeAuto`
- `DB_CMD.ModeManual`
- `DB_CMD.RunEmpty`
- `DB_HMI.StartButtonEnabled`
- `DB_HMI.StopButtonEnabled`
- `DB_HMI.ResetButtonEnabled`
- `DB_STS.StartPermissiveOK`
- `DB_STS.ResetPermitted`

## 15.3 Fault Screen
Recommended bindings:
- `DB_FAULT.ActiveCode`
- `DB_FAULT.ActiveText`
- `DB_FAULT.ActiveSeverity`
- `DB_FAULT.StopCauseText`
- `DB_EVT.LastEventText`
- `DB_EVT.LastStateChange`

## 15.4 Production Screen
Recommended bindings:
- `DB_OUT.CycleCount`
- `DB_OUT.GoodPackCount`
- `DB_OUT.RejectPackCount`
- `DB_OUT.RuntimeSec`
- `DB_OUT.DowntimeSec`
- `DB_OUT.LastCycleTimeSec`
- `DB_OUT.AvgCycleTimeSec`
- `DB_OUT.LastRejectReason`

## 15.5 Recipe Screen
Recommended bindings:
- `DB_CFG.ActiveRecipeID`
- `DB_CFG.ActiveRecipeName`
- `DB_CFG.TargetPackCount`
- `DB_CFG.NominalCycleTimeSec`
- `DB_CFG.RejectProbability`
- `DB_CFG.JamProbability`
- `DB_STS.RecipeChangePermitted`

## 15.6 Diagnostics Screen
Recommended bindings:
- `DB_IN.ProductAvailable`
- `DB_IN.BlankAvailable`
- `DB_IN.DownstreamAvailable`
- `DB_IN.SafetyOK`
- `DB_IN.EStopOK`
- `DB_IN.GuardsClosed`
- `DB_IN.UtilitiesOK`
- `DB_STS.MachineState`
- `DB_STS.CyclePhase`

---

## 16. Button Enable Rules

### Start
Enabled when:
- machine is STOPPED, STARVED, or BLOCKED
- mode = AUTO
- start permissives true
- no latching fault active

### Stop
Enabled when:
- machine is STARTING, RUNNING, STARVED, BLOCKED, or RUN_EMPTY

### Reset
Enabled when:
- machine state = FAULTED
- reset permitted = true

### Recipe Change
Enabled when:
- machine state = STOPPED
- or machine mode = MANUAL

These rules should be enforced by PLC logic and reflected in HMI helper tags.

---

## 17. HMI Messaging Guidance

The HMI should always provide a clear current message.

Examples:
- `Press Start to begin production`
- `Machine starting`
- `Waiting for product`
- `Outfeed blocked`
- `Blank missing - restore blank supply and press Reset`
- `Run Empty active`
- `Recipe change not permitted while running`

These messages should be concise and operator-focused.

---

## 18. Alarm and Fault Messaging Guidance

Each major fault should include:
- plain-language explanation
- machine effect
- basic operator action

Examples:

### BLANK_MISSING
- Message: `No blank available for next cycle`
- Effect: `Machine stopped`
- Action: `Restore blank supply and press Reset`

### GAP_CONTROL_JAM
- Message: `Pack cycle jam detected`
- Effect: `Machine stopped`
- Action: `Clear jam and press Reset`

### STARVATION
- Message: `No incoming product`
- Effect: `Machine waiting`
- Action: `Restore upstream product flow`

### DOWNSTREAM_BLOCK
- Message: `Outfeed unavailable`
- Effect: `Machine blocked`
- Action: `Clear downstream path`

---

## 19. Visual Style Guidance

Recommended visual style:
- dark industrial dashboard theme
- strong state colors
- large readable counters
- bold action buttons
- clean panel layout
- minimal clutter
- simple machine schematic or status diagram
- modern but industrial look

This style works well for:
- web dashboard
- desktop app
- Siemens-inspired HMI layout

---

## 20. HMI Navigation Logic

Minimum navigation:
- Overview -> all screens
- Faults screen accessible from fault banner
- Recipe screen accessible from overview/control
- Production screen accessible from overview
- Diagnostics screen accessible from faults/control

Recommended rule:
- active fault banner should be clickable and open Faults screen

---

## 21. Development vs Production Behavior

### Development Mode
May allow:
- toggling external conditions
- fault injection
- rapid recipe switching
- debug panels

### Production-Style Demo Mode
Should prefer:
- read-only diagnostics
- PLC-governed commands
- cleaner operator screen set
- fewer developer controls visible

This distinction is useful for the project.

---

## 22. AI Integration Points

The HMI/dashboard may include an AI panel later.

Recommended AI panel uses:
- explain current stop
- summarize last fault
- compare recipe performance
- generate shift summary
- suggest training scenario interpretation

The AI panel should read:
- status tags
- fault tags
- event tags
- production counters
- logs/history

It should not directly replace Start/Stop/Reset controls.

---

## 23. Minimum V1 HMI Deliverable

If implementation time is limited, the first HMI version should include:

### Screen 1: Overview
- state
- mode
- recipe
- grouped count
- good/reject counts
- fault banner
- Start / Stop / Reset

### Screen 2: Faults
- active fault code and text
- last event
- reset guidance

### Screen 3: Recipe
- recipe select
- pack count
- cycle time
- recipe change enable state

This is enough for a believable first industrial UI.

---

## 24. Future Extensions

Later phases may add:
- trend charts
- maintenance notes
- AI chat panel
- operator intervention logging
- scenario/training workflow
- role-based views
- multi-machine navigation
- report export

These are useful but not required for the first version.

---

## 25. Final Guidance

This file defines the operator-facing HMI behavior for the project.

If there is any conflict between simulator visuals, PLC control rules, and screen behavior, the shared tag interface and PLC control rules should remain authoritative, while this file governs how they are presented to the operator.

The key rule is:
**the HMI should make the project feel like a real machine interface without making the implementation unnecessarily complex.**
