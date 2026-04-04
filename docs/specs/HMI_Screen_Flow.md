# HMI Screen Flow

## 1. Purpose

This document defines the navigation structure, screen relationships, operator journeys, and command flow for the HMI of the simplified tray packer digital twin project.

It is intended to help:
- frontend/web app agents
- HMI design agents
- PLC/HMI integration agents
- simulator UI agents
- documentation and testing agents

This file complements:
- `HMI_Spec.md`
- `PLC_Control_Spec.md`
- `PLC_Tag_List.md`
- `State_Machine_Spec.md`

---

## 2. Design Goals

The screen flow should:
- feel like a real machine HMI
- keep the operator’s main tasks fast
- reduce unnecessary clicks
- expose faults clearly
- align with PLC control rules
- be simple enough for vibe-coded implementation

The screen flow should support both:
- normal production usage
- training/demo/testing usage

---

## 3. Main Screen Set

The recommended screen structure is:

1. Overview
2. Control
3. Faults & Alarms
4. Production & Counters
5. Recipe
6. Diagnostics / I-O
7. Training / Scenario (Phase 2+)
8. AI Assistant Panel (Phase 2+)

For V1, the minimum required screens are:
- Overview
- Faults & Alarms
- Recipe

---

## 4. Global Navigation Model

The HMI should use persistent primary navigation.

Recommended persistent navigation:
- Overview
- Control
- Faults
- Production
- Recipe
- Diagnostics
- Training

This can be implemented as:
- left sidebar
- top tab bar
- bottom navigation bar

For a web dashboard, a left sidebar is usually best.
For a simulated panel HMI, a bottom or top navigation bar is fine.

---

## 5. Default Landing Screen

The default landing screen should be:

## Overview

Reason:
- it shows the machine state immediately
- it gives direct access to Start / Stop / Reset
- it can display the current fault if the machine is stopped
- it works well for both normal use and demos

---

## 6. Primary Screen Relationships

### Overview
Acts as the main hub.
From Overview, operator can go to:
- Control
- Faults
- Production
- Recipe
- Diagnostics
- Training

### Control
Focused on commands and command enable states.
From Control, operator can go to:
- Overview
- Faults
- Recipe
- Diagnostics

### Faults
Focused on fault details and reset guidance.
From Faults, operator can go to:
- Overview
- Diagnostics
- Control

### Production
Focused on counters and session metrics.
From Production, operator can go to:
- Overview
- Recipe
- Faults

### Recipe
Focused on recipe selection and recipe details.
From Recipe, operator can go to:
- Overview
- Control
- Production

### Diagnostics
Focused on signals, permissives, and condition visibility.
From Diagnostics, operator can go to:
- Overview
- Faults
- Control

### Training
Focused on scenario selection and training session workflow.
From Training, operator can go to:
- Overview
- Faults
- Production

---

## 7. Navigation Priority Rules

The HMI should guide users naturally based on context.

### If machine is healthy
Default flow emphasis:
Overview -> Control / Production / Recipe

### If machine is faulted
Default flow emphasis:
Overview -> Faults -> Diagnostics -> Control

### If recipe change is needed
Default flow emphasis:
Overview -> Recipe

### If debugging a blocked/starved state
Default flow emphasis:
Overview -> Diagnostics -> Faults

This improves usability and training value.

---

## 8. Fault-Driven Navigation

When a fault occurs:
- the Overview screen should show a prominent fault banner
- clicking the fault banner should navigate to the Faults screen
- the Faults screen should show:
  - fault code
  - fault text
  - stop cause
  - suggested operator action
  - reset guidance

Optional future behavior:
- if already on another screen, show a global toast/banner with a “View Fault” button

---

## 9. Button/Action Flows

## 9.1 Start Flow

### User Journey
1. Operator views Overview or Control screen
2. Operator sees machine status = STOPPED
3. Operator sees Start enabled
4. Operator presses Start
5. HMI writes start request
6. PLC validates permissives
7. PLC issues command to simulator
8. Simulator enters STARTING then RUNNING
9. HMI updates state badge and counters

### Expected Screen Behavior
- Start button becomes disabled during transition if needed
- state badge changes from STOPPED -> STARTING -> RUNNING
- operator message updates to “Machine starting” then “Machine running”

---

## 9.2 Stop / Run Empty Flow

### User Journey
1. Operator presses Stop from Overview or Control
2. HMI writes stop request
3. PLC issues controlled stop command
4. Simulator enters RUN_EMPTY
5. Remaining grouped/internal material is cleared
6. Simulator transitions to STOPPED

### Expected Screen Behavior
- state badge changes to RUN_EMPTY
- message shows “Run Empty active”
- once complete, machine shows STOPPED

---

## 9.3 Reset Flow

### User Journey
1. Machine is FAULTED
2. Operator opens Faults screen or sees fault banner
3. Operator corrects the fault condition
4. Operator presses Reset
5. PLC validates reset permission
6. PLC issues reset command
7. Simulator clears fault and returns to STARTING or STOPPED

### Expected Screen Behavior
- Reset enabled only when allowed
- active fault banner clears after successful recovery
- state/status updates immediately

---

## 9.4 Recipe Change Flow

### User Journey
1. Operator opens Recipe screen
2. Operator selects a recipe
3. HMI checks whether recipe change is allowed
4. If allowed, PLC accepts new recipe request
5. Simulator/config layer loads recipe
6. Overview/Production screens reflect new recipe values

### Expected Screen Behavior
- show recipe selection list
- show recipe details before confirmation
- if not allowed, show “Recipe change not permitted while running”

---

## 10. Screen-Specific User Journeys

## 10.1 Overview Journey
Main operator tasks:
- understand current machine condition
- start or stop machine
- see whether there is a fault
- navigate to the right next screen

Typical journeys:
- Start production
- Open fault details
- Check grouped count and output
- Check current recipe

## 10.2 Control Journey
Main operator tasks:
- perform control actions
- understand whether commands are enabled
- switch modes
- request reset or run-empty

Typical journeys:
- change mode to MANUAL
- request Stop
- request Reset
- check why Start is disabled

## 10.3 Faults Journey
Main operator tasks:
- understand current fault
- identify stop reason
- know what to do next
- reset if allowed

Typical journeys:
- inspect fault code/text
- go to Diagnostics to inspect conditions
- return to Control to reset/restart

## 10.4 Production Journey
Main operator tasks:
- observe pack counts
- observe reject counts
- review runtime and downtime
- compare current performance to expectations

## 10.5 Recipe Journey
Main operator tasks:
- inspect available recipes
- compare target pack counts and cycle times
- select the next recipe safely

## 10.6 Diagnostics Journey
Main operator tasks:
- inspect inputs and permissives
- understand why machine will not start
- diagnose blocked/starved conditions

## 10.7 Training Journey
Main operator tasks:
- choose training scenario
- inject condition changes
- observe machine response
- practice reset or recovery workflow

---

## 11. Recommended Overview Screen Layout Flow

Recommended interactive zones:

### Top Header
- machine name
- machine state
- machine mode
- active recipe
- communications status

### Main Body Left
- machine schematic / live status visualization

### Main Body Right
- grouped count vs target
- good packs
- reject packs
- runtime / downtime
- cycle phase

### Bottom or Side Action Zone
- Start
- Stop
- Reset
- Quick links to Faults and Recipe

### Alert Zone
- active fault banner
- warning banner
- last event banner

This makes Overview the best command center screen.

---

## 12. Recommended Fault Screen Layout Flow

Recommended sections:

### Fault Summary
- active fault code
- active fault text
- severity
- machine state

### What Happened
- last event
- stop cause
- timestamp

### What To Do
- plain-language operator action
- whether reset is required
- whether restart is allowed after reset

### Actions
- Acknowledge
- Reset
- Go to Diagnostics
- Back to Overview

This layout is especially useful for training.

---

## 13. Recommended Recipe Screen Layout Flow

Recommended sections:

### Recipe List
- available recipes
- active recipe clearly marked

### Recipe Detail Panel
- products per pack
- grouping layout
- nominal cycle time
- reject probability
- jam probability
- notes

### Action Panel
- Select recipe
- Confirm change
- reason if disabled

Optional:
- small visual preview of grouping layout

---

## 14. Recommended Diagnostics Screen Layout Flow

Recommended sections:

### Safety & Permissives
- Safety OK
- E-stop OK
- Guards closed
- Utilities OK
- Start permissive OK

### Material & Flow Conditions
- Product available
- Blank available
- Downstream available

### Machine Feedback
- machine state
- machine mode
- cycle phase
- fault active

### Dev/Test Controls (optional in dev mode)
- toggle product availability
- toggle blank availability
- toggle downstream availability

This screen is essential for troubleshooting and scenario testing.

---

## 15. Screen Transition Table

| Current Screen | Action / Event | Next Screen |
|---|---|---|
| Any | User selects Overview | Overview |
| Any | User selects Control | Control |
| Any | User selects Faults | Faults |
| Any | User selects Production | Production |
| Any | User selects Recipe | Recipe |
| Any | User selects Diagnostics | Diagnostics |
| Any | User selects Training | Training |
| Overview | Click fault banner | Faults |
| Faults | Click Diagnostics | Diagnostics |
| Faults | Click Back | Overview |
| Recipe | Confirm recipe change | Overview or stay on Recipe |
| Control | Press Stop | Stay on Control or return to Overview |
| Overview | Press Start | Stay on Overview |
| Overview | Press Reset | Stay on Overview or go to Faults if reset denied |

---

## 16. Screen Behavior by Machine State

## STOPPED
Recommended focus:
- Overview
- Recipe
- Control

Useful actions:
- Start
- change recipe
- switch mode

## STARTING
Recommended focus:
- Overview

Useful actions:
- observe startup
- Stop if needed

## RUNNING
Recommended focus:
- Overview
- Production

Useful actions:
- Stop
- monitor counters
- inspect current phase

## RUN_EMPTY
Recommended focus:
- Overview
- Control

Useful actions:
- observe controlled stop
- wait for STOPPED

## STARVED
Recommended focus:
- Overview
- Diagnostics

Useful actions:
- inspect product availability
- wait for recovery
- Stop if needed

## BLOCKED
Recommended focus:
- Overview
- Diagnostics

Useful actions:
- inspect downstream availability
- clear block
- Stop if needed

## FAULTED
Recommended focus:
- Faults
- Diagnostics
- Control

Useful actions:
- inspect fault
- clear fault cause
- Reset

---

## 17. Minimum V1 Screen Flow

If implementation time is limited, use this minimum screen/navigation set:

### Overview
- main landing page
- Start / Stop / Reset
- grouped count
- pack counts
- machine state
- active recipe
- fault banner

### Faults
- active fault
- last event
- reset guidance
- Back to Overview

### Recipe
- recipe list
- recipe detail
- recipe select if permitted

Navigation:
- persistent tabs or sidebar between these three screens

This is enough for the first usable industrial demo.

---

## 18. Phase 2 Screen Flow Additions

Add:
- Production screen
- Diagnostics screen
- Training screen
- AI assistant panel

Phase 2 gives the project a more complete industrial software feel.

---

## 19. AI Assistant Panel Flow

The AI assistant does not need to be a full screen at first.
It can appear as:
- right-side collapsible panel
- modal popup
- lower dock panel

Recommended AI actions:
- “Why did the machine stop?”
- “Explain this fault”
- “Summarize this session”
- “Compare recipe performance”
- “Generate training report”

This panel should read:
- current state
- fault info
- counters
- recent events
- logs/history

It should not directly replace HMI control buttons.

---

## 20. Testing Guidance for Screen Flow

The HMI implementation should be tested for:
- Start button only enabled when allowed
- Reset only shown/enabled correctly
- clicking fault banner opens Faults screen
- recipe change denied when machine running
- stop transitions show RUN_EMPTY clearly
- blocked/starved states lead users toward Diagnostics
- navigation remains stable during state changes

These tests are important for a polished operator experience.

---

## 21. Future Extension Ideas

Later the HMI flow may add:
- maintenance notes screen
- event history screen
- scenario authoring screen
- role-based views
- multi-machine navigation
- richer analytics pages

These are useful but not required for the core project.

---

## 22. Final Guidance

This file defines how an operator or trainee moves through the HMI and how screens should respond to machine behavior.

If there is any conflict between screen flow convenience and the control rules defined in the PLC/specification files, the control rules should remain authoritative.

The key principle is:
**the right screen should always be one click away from the operator’s current problem.**
