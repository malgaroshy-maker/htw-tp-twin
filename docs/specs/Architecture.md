# Architecture.md

## 1. Purpose
This document defines the technical architecture for the **Tray Packer Digital Twin Platform**.

The system is intentionally designed as a **behaviorally realistic, mechanically simplified** industrial simulation platform. It is not a full motion-accurate digital twin. Instead, it reproduces the observable operating behavior of a real tray packer closely enough for:

- simulation and visualization
- training and scenario playback
- PLC-style control development
- HMI design and testing
- alarm and fault analysis
- AI-assisted reporting and troubleshooting
- future Siemens / PLCSIM integration

---

## 2. Architecture Principles

### 2.1 Core principles
1. **Behavior over physics**  
   The simulator models what operators, engineers, and supervisors observe from outside the machine.

2. **Control and process separation**  
   The simulation engine represents the machine/process side. The PLC logic layer represents the control side.

3. **Tag-based integration**  
   All major components communicate through a stable machine tag contract.

4. **Event-first design**  
   Significant state changes, faults, rejects, and production actions are emitted as structured events.

5. **AI outside the control loop**  
   AI can analyze, summarize, explain, and assist. AI must not directly control safety-critical machine actions.

6. **Incremental implementation**  
   The project should be buildable in phases, starting from a standalone simulation and later extending to dashboards, AI tools, and PLC/HMI interfaces.

---

## 3. High-Level System View

The platform is divided into five primary layers:

1. **Simulation Core**
2. **Integration and Tag Interface**
3. **Applications Layer**
4. **AI and Analytics Layer**
5. **PLC / HMI Layer**

### 3.1 Logical architecture

```text
+--------------------------------------------------------------+
|                        Applications Layer                    |
|  - Web Dashboard                                             |
|  - Training/Scenario UI                                      |
|  - Maintenance / Reports UI                                  |
+-----------------------------+--------------------------------+
                              |
+-----------------------------v--------------------------------+
|                 AI and Analytics Layer                       |
|  - Shift summary generation                                  |
|  - Fault explanation assistant                               |
|  - Log query assistant                                       |
|  - Scenario generation helper                                |
+-----------------------------+--------------------------------+
                              |
+-----------------------------v--------------------------------+
|               Integration / Tag Interface Layer              |
|  - Machine tag contract                                      |
|  - Event bus / message model                                 |
|  - API / OPC UA / MQTT adapters                              |
|  - Logging and persistence adapters                          |
+------------------+----------------------+--------------------+
                   |                      |
+------------------v----+       +---------v-------------------+
|   Simulation Core     |       |     PLC / HMI Layer         |
| - state machine       |       | - PLC-style control logic   |
| - cycle logic         |       | - permissives/interlocks    |
| - recipes             |       | - HMI commands/screens      |
| - faults/rejects      |       | - future Siemens mapping    |
| - animation           |       |                             |
+-----------------------+       +-----------------------------+
```

---

## 4. Main Components

## 4.1 Simulation Core
The Simulation Core is the heart of the platform.

### Responsibilities
- model machine operating states
- model cycle execution
- model recipe-dependent throughput
- model product grouping behavior
- model blank availability and packaging execution
- model faults, rejects, and recovery behavior
- generate visual animation states
- emit machine tags and structured events

### Includes
- finite-state machine
- cycle scheduler / event engine
- recipe manager
- fault injection logic
- runtime counters
- animated scene renderer

### Explicitly excluded from the core
- exact servo physics
- true electronic cam profiles
- detailed pneumatic/force simulation
- safety-certified control logic

---

## 4.2 Integration and Tag Interface Layer
This layer connects the simulation to everything else.

### Responsibilities
- expose machine state as tags
- receive control commands
- publish machine events
- standardize data for dashboard, AI, and PLC integration
- provide clean adapters for REST, WebSocket, OPC UA, or MQTT

### Why this layer matters
This prevents the simulator from becoming tightly coupled to a single UI or control implementation.

### Primary concepts
- **Commands**: start, stop, reset, run empty, select recipe, manual request
- **Status tags**: running, faulted, starved, blocked, pack count, reject count, current fault
- **Events**: cycle started, cycle completed, fault triggered, fault cleared, pack rejected

---

## 4.3 Applications Layer
The Applications Layer contains human-facing tools built around the simulator.

### Planned applications
#### A. Web Dashboard
- machine overview
- live state/status
- counts and KPIs
- fault history
- reject trends
- scenario control
- AI chat panel

#### B. Training / Scenario UI
- select scenario
- inject starvation/jam/fault events
- reset / restart session
- review what happened during a run

#### C. Maintenance / Reports UI
- intervention log entry
- fault details
- recovery notes
- exported summaries and shift reports

---

## 4.4 AI and Analytics Layer
This layer reads structured simulator data and assists users.

### Responsibilities
- summarize shifts and production sessions
- explain faults in natural language
- answer questions from logs and events
- compare sessions and recipes
- generate training scenarios
- help produce operator and maintenance reports

### Allowed AI behaviors
- reporting
- analytics
- recommendations
- explanation
- training support

### Disallowed AI behaviors
- sending direct actuator commands
- bypassing machine interlocks
- auto-clearing safety faults without defined rules
- making authoritative safety decisions

### AI inputs
- event logs
- machine state history
- recipe definitions
- fault model definitions
- machine glossary / project documentation
- optional user notes

### AI outputs
- summaries
- explanations
- suggested likely causes
- structured report drafts
- scenario suggestions

---

## 4.5 PLC / HMI Layer
This layer represents the machine control side.

### Responsibilities
- implement PackML-like machine control states
- evaluate permissives and interlocks
- issue machine commands
- manage recipe selection
- manage operator and HMI interactions
- reflect machine status to screens and alarms

### Design intent
The PLC/HMI layer should be **industrial and Siemens-style**, but simplified for this project.

It should resemble a realistic machine controller without attempting to replicate proprietary Meurer control internals.

### Future target compatibility
- Siemens Structured Text style control logic
- WinCC Unified-style screens
- PLCSIM-friendly tag structure
- optional OPC UA / MQTT / REST bridge to simulation

---

## 5. Data Flow

## 5.1 Primary flow during simulation
1. Operator or dashboard sends a command.
2. Command enters the tag interface layer.
3. PLC-style logic (or direct simulator controller in early phases) validates the command.
4. Simulation core updates state and cycle behavior.
5. Simulation core emits status tags and events.
6. Dashboard, logs, and AI services consume those outputs.
7. HMI screens reflect the new machine condition.

---

## 5.2 Event flow
All significant machine actions should generate structured events.

### Example event types
- `machine.started`
- `machine.stopped`
- `machine.run_empty_started`
- `cycle.started`
- `cycle.completed`
- `pack.good`
- `pack.rejected`
- `fault.triggered`
- `fault.cleared`
- `state.changed`
- `recipe.changed`
- `maintenance.note_added`

### Example event structure
```json
{
  "timestamp": "2026-04-01T10:15:32Z",
  "event_type": "fault.triggered",
  "machine_id": "tray_packer_01",
  "state": "FAULTED",
  "fault_code": "GAP_CONTROL_JAM",
  "recipe": "24-pack",
  "session_id": "session_20260401_001",
  "details": {
    "zone": "grouping_transfer",
    "severity": "stop"
  }
}
```

---

## 6. Integration Modes
The project should support multiple integration paths.

## 6.1 Standalone mode
Used in the earliest phase.

### Characteristics
- simulator contains local control logic
- no external PLC required
- dashboard connects directly to simulator API or local state
- AI reads simulator logs and state data

### Purpose
Fastest path to a working product demo.

---

## 6.2 PLC-supervised mode
Used in later phases.

### Characteristics
- simulator behaves like the machine/process side
- PLC logic behaves like the control side
- commands and status pass through a tag contract

### Purpose
Validate realistic industrial control flows.

---

## 6.3 Siemens integration mode
Used for future expansion.

### Characteristics
- Siemens-style tag mapping
- Structured Text control blocks
- WinCC Unified-style screen mapping
- optional PLCSIM or external Siemens tooling integration

### Purpose
Portfolio realism and industrial alignment.

---

## 7. Recommended Repository Structure

```text
tray-packer-digital-twin/
├── docs/
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Simulation_Specifications.md
│   ├── State_Machine_Spec.md
│   ├── Tag_Interface_Spec.md
│   ├── Fault_Model.md
│   ├── Recipe_Model.md
│   ├── PLC_Control_Spec.md
│   ├── HMI_Spec.md
│   ├── AI_Features_Spec.md
│   ├── Event_Schema.md
│   ├── Training_Scenarios_Spec.md
│   ├── Decisions.md
│   ├── Assumptions.md
│   └── Domain_Glossary.md
│
├── apps/
│   ├── simulator/
│   │   ├── src/
│   │   ├── assets/
│   │   ├── configs/
│   │   └── tests/
│   │
│   ├── dashboard/
│   │   ├── src/
│   │   ├── public/
│   │   └── tests/
│   │
│   └── ai-service/
│       ├── src/
│       ├── prompts/
│       └── tests/
│
├── plc/
│   ├── st/
│   ├── taglists/
│   ├── hmi/
│   └── examples/
│
├── shared/
│   ├── schemas/
│   ├── recipes/
│   ├── faults/
│   └── sample-data/
│
├── scripts/
├── tools/
├── tasks/
└── README.md
```

---

## 8. Core Internal Contracts

## 8.1 Command contract
Commands sent to the machine layer should be normalized.

### Examples
- `START`
- `STOP`
- `RESET`
- `RUN_EMPTY`
- `SELECT_RECIPE`
- `ACK_FAULT`
- `SET_PRODUCT_FEED`
- `SET_BLANK_AVAILABLE`
- `SET_DOWNSTREAM_FREE`

---

## 8.2 Status contract
Status values should be readable by UIs, logs, and PLC logic.

### Examples
- `machine_state`
- `mode`
- `recipe_name`
- `ready`
- `running`
- `starved`
- `blocked`
- `faulted`
- `fault_code`
- `good_pack_count`
- `reject_pack_count`
- `cycle_count`
- `runtime_seconds`
- `downtime_seconds`

---

## 8.3 Animation contract
The renderer should consume machine scene data, not core logic internals.

### Examples
- infeed product positions
- grouped product count and layout
- blank visibility/progress
- pack zone phase
- outfeed pack list
- reject pack list
- active state color
- displayed message

This keeps the visual layer replaceable.

---

## 9. Technology Recommendations

## 9.1 Simulation
Recommended:
- Python
- Pygame for early animation
- optional later separation into engine + renderer

## 9.2 Dashboard
Recommended:
- React
- TypeScript
- charting library for KPIs and downtime trends

## 9.3 AI service
Recommended:
- Python or Node service
- prompt templates
- structured event ingestion
- report generation endpoints

## 9.4 Persistence
Recommended:
- JSON for configs
- CSV/SQLite for early logging
- optional PostgreSQL later

## 9.5 PLC/HMI specs
Recommended:
- Siemens Structured Text style
- WinCC Unified-style screen definitions
- OPC UA-first integration model
- MQTT optional later

---

## 10. Safety and Responsibility Boundaries
This project is a simulation and training platform.

It must not be represented as:
- certified industrial control software
- safety-rated PLC logic
- a production-ready machine controller

AI outputs are advisory only.

The simulator may support realistic industrial workflows, but all real machine use would require proper engineering validation.

---

## 11. Non-Goals
The following are outside the intended first project scope:

- exact motion control fidelity
- full mechanical CAD integration
- physically accurate folding dynamics
- servo tuning and commissioning tools
- safety system validation
- multi-machine line simulation in Phase 1
- real production deployment

---

## 12. Architecture Evolution Plan

### Phase 1
- standalone simulator
- local state machine
- basic animation
- recipe configs
- structured events
- local logs

### Phase 2
- web dashboard
- scenario control
- AI summary and explanation features
- reporting workflow

### Phase 3
- PLC-style command/status separation
- formal tag interface
- HMI specs and screen mapping
- OPC UA / integration bridge

### Phase 4
- Siemens-oriented implementation assets
- richer analytics
- test automation
- portfolio/demo packaging

---

## 13. Summary
The architecture is designed to be:

- realistic enough for industrial credibility
- simple enough to finish
- structured enough for AI coding agents
- extensible enough for future Siemens integration

The most important architectural decision is this:

> **The simulator is the machine. The PLC is the controller. The dashboard is the operator view. The AI is the analyst.**

That separation should guide all future implementation work.
