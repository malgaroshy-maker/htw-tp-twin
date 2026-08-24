# Simulation Specifications

## 1. Purpose
This document defines the simplified behavioral simulation for the **Meurer-style tray packer digital twin platform**.

The goal is **behavioral realism**, not mechanical replication.

The simulator must:
- look and feel like a real industrial tray packer from the outside
- support production flow, machine states, recipes, faults, rejects, and operator actions
- expose a clean machine interface for future PLC/HMI integration
- generate structured events and logs for analytics and AI features
- support a simple animated 2D visualization

The simulator must **not** attempt to model:
- exact servo axis kinematics
- exact cam profiles
- exact pneumatic dynamics
- exact glue thermodynamics
- proprietary OEM motion algorithms

---

## 2. Simulation Philosophy
The simulation is a **simplified behavioral digital twin** built from:
- a **finite-state machine** for machine modes and lifecycle
- a **discrete-event cycle model** for packaging behavior
- a **parameterized recipe system** for pack format variation
- a **probabilistic fault model** for realistic operational behavior
- a **2D animated renderer** for visual explanation and training use

The simulator should represent what an operator, technician, supervisor, or trainee would observe externally.

---

## 3. Scope

### In Scope
- product arrival and grouping
- blank availability and pack cycle triggering
- packaging cycle timing
- machine states and transitions
- recipe-based variation
- faults, rejects, starvation, and blocking
- operator start/stop/reset/run-empty behavior
- production counters and downtime metrics
- event logging
- animated machine visualization

### Out of Scope
- exact mechanical folding geometry
- real drive tuning parameters
- motion interpolation and cam calculation
- high-fidelity collision simulation
- real-time safety certification behavior
- physical PLC hardware dependency in V1

---

## 4. Simulation Levels

### Level 1 — Behavioral Machine Simulation
Required for V1.
- finite-state machine
- product flow
- cycle timing
- basic faults and rejects
- visual animation

### Level 2 — Operations and Maintenance Simulation
Planned after V1.
- richer fault behavior
- fault recovery patterns
- downtime analysis
- maintenance intervention events
- scenario playback

### Level 3 — Control-Connected Simulation
Planned after V2.
- PLC-style tag exchange
- HMI command/status mapping
- external control integration
- PLCSIM/OPC UA/MQTT connection layer

### Level 4 — Advanced Motion Approximation
Optional future phase.
- simplified motion synchronization approximation
- more detailed sequence timing and sub-states
- advanced machine section visualization

---

## 5. High-Level Machine Model
The tray packer is represented as one machine block with visible functional sections:

1. **Infeed**
2. **Grouping area**
3. **Blank feed**
4. **Pack zone**
5. **Outfeed**
6. **Reject path**

### External Inputs
- product availability
- blank availability
- downstream availability
- selected recipe
- start command
- stop command
- reset command
- run-empty command
- manual mode request
- fault injection request (test/training)

### External Outputs
- machine state
- machine mode
- active fault
- recipe name
- cycle count
- good pack count
- reject count
- runtime
- downtime
- current phase
- current warnings
- machine ready status

---

## 6. Core Simulation Architecture

### 6.1 Core Modules
- **Machine Engine**: machine state, cycle logic, transitions
- **Flow Engine**: product arrival, grouping, pack output, reject output
- **Recipe Engine**: format-specific timing and probabilities
- **Fault Engine**: fault triggers, severity, recovery expectations
- **Metrics Engine**: counters, runtime, downtime, OEE-related calculations
- **Event Logger**: structured event output
- **Renderer**: 2D animated simulation view
- **Command Interface**: UI/PLC/HMI compatible commands and tags

### 6.2 Suggested Runtime Structure
- fixed-step update loop or timed event loop
- configurable simulation tick (e.g. 100 ms internal logic step)
- independent rendering frame rate (e.g. 30–60 FPS)
- structured event emission on state changes and cycle outcomes

---

## 7. Machine States

### 7.1 Primary States
- **STOPPED**
- **STARTING**
- **RUNNING**
- **STARVED**
- **BLOCKED**
- **FAULTED**
- **RUN_EMPTY**
- **MANUAL**

### 7.2 Optional Future States
- **HOLDING**
- **HELD**
- **RESETTING**
- **MAINTENANCE**
- **CHANGEOVER**

### 7.3 State Definitions

#### STOPPED
Machine is not cycling. Motion and automatic production are inactive.

#### STARTING
Startup sequence is in progress. Machine performs warmup/ready delay before entering RUNNING.

#### RUNNING
Normal automatic production state. Machine can group product, start cycles, create good packs or rejects, and generate faults.

#### STARVED
Machine cannot continue because incoming product is unavailable or insufficient.

#### BLOCKED
Machine cannot discharge output because downstream path is unavailable.

#### FAULTED
A stopping fault has occurred. Manual acknowledgment/reset is required.

#### RUN_EMPTY
Machine is finishing current work and clearing remaining internal product before stopping.

#### MANUAL
Automatic cycle behavior is disabled. Manual jog/test functions may be allowed in later versions.

---

## 8. State Transition Rules

| From | To | Condition |
|---|---|---|
| STOPPED | STARTING | Start command and all start permissives true |
| STARTING | RUNNING | Startup timer complete |
| RUNNING | STARVED | Product unavailable and insufficient grouped product |
| RUNNING | BLOCKED | Downstream unavailable and discharge required |
| RUNNING | FAULTED | Stopping fault triggered |
| RUNNING | RUN_EMPTY | Stop command received |
| STARVED | STARTING | Product restored and start/restart allowed |
| BLOCKED | STARTING | Downstream restored and start/restart allowed |
| FAULTED | STARTING | Fault cleared and reset command accepted |
| RUN_EMPTY | STOPPED | Current cycle finished and internal buffers empty |
| Any non-fault automatic state | MANUAL | Manual mode selected |
| MANUAL | STOPPED or STARTING | Manual mode exited |

### Notes
- Some non-critical issues should generate warnings or rejects without transitioning to FAULTED.
- Some faults should stop only after the active cycle completes.
- State transitions must emit structured events.

---

## 9. Internal Cycle Phases
Within RUNNING and RUN_EMPTY, the machine uses simplified internal phases:

- **IDLE**
- **GROUPING**
- **CAPTURED**
- **BLANK_FEED**
- **TRANSFER**
- **PACKING**
- **DISCHARGE**

### Phase Descriptions

#### IDLE
Waiting for required grouped product and start conditions.

#### GROUPING
Products accumulate into the required pack pattern for the selected recipe.

#### CAPTURED
The completed formation is captured and held at the stopper/terminal while transfer clearance and blank availability are verified.

#### BLANK_FEED
A blank is requested and visually introduced into the pack zone.

#### TRANSFER
The positioned blank is moved from the feed position into the pack zone.

#### PACKING
Grouped product is combined with the blank to create a pack result.

#### DISCHARGE
The pack exits via the normal outfeed or, if rejected, is diverted to the reject path. Reject handling occurs inside this phase (outlet check → quality decision → good travel / reject divert), not as a separate phase.

---

## 10. Behavioral Cycle Model
Each simulated pack cycle follows this logic:

1. Verify machine is in RUNNING or RUN_EMPTY.
2. Verify grouped product count meets recipe requirement.
3. Capture the completed formation (CAPTURED).
4. Verify blank availability (BLANK_MISSING fault if unavailable).
5. Enter BLANK_FEED phase.
6. After blank feed delay, enter TRANSFER phase.
7. After transfer delay, enter PACKING phase.
8. After packing delay:
   - determine outcome: good pack, reject, or fault
9. If good pack, send output to outfeed.
10. If reject, divert output to reject path during DISCHARGE.
11. If stopping fault occurs, transition to FAULTED.
12. Return to IDLE and repeat.

### V1 Behavior Goal
The machine should **look continuous and industrial**, even though internally it is modeled as simplified staged events.

---

## 11. Recipe Model
Recipes represent packaging formats and their operating behavior.

### 11.1 Required Recipe Fields
- recipe_id
- recipe_name
- products_per_pack
- grouping_rows
- grouping_columns
- nominal_cycle_time_sec
- product_spawn_interval_sec
- blank_feed_time_sec
- pack_time_sec
- discharge_time_sec
- reject_probability
- jam_probability
- startup_multiplier
- warmup_cycles

### 11.2 Example Recipes

#### Recipe A — 24 Pack
- products_per_pack: 24
- grouping_rows: 3
- grouping_columns: 8
- nominal_cycle_time_sec: 3.2
- reject_probability: 0.05
- jam_probability: 0.015

#### Recipe B — 27 Pack
- products_per_pack: 27
- grouping_rows: 3
- grouping_columns: 9
- nominal_cycle_time_sec: 3.6
- reject_probability: 0.06
- jam_probability: 0.02

#### Recipe C — 30 Pack
- products_per_pack: 30
- grouping_rows: 3
- grouping_columns: 10
- nominal_cycle_time_sec: 4.0
- reject_probability: 0.08
- jam_probability: 0.025

### 11.3 Recipe Behavior Rules
- larger packs should typically increase cycle time
- recipe changes may affect reject likelihood and jam likelihood
- future versions may add changeover/setup behavior

---

## 12. Input Model

### 12.1 Product Feed
The simulator must support product availability states:
- fully available
- intermittent
- unavailable

Product arrival may be modeled as:
- fixed interval
- randomized interval within a defined range
- scenario-driven pattern

### 12.2 Blank Feed
Blank availability is modeled as:
- available
- low warning
- empty
- intermittent misfeed (future)

### 12.3 Downstream Availability
Downstream state is modeled as:
- free
- slowed (future)
- blocked

---

## 13. Fault Model

### 13.1 V1 Faults
- **NO_PRODUCT / STARVATION**
- **BLANK_MISSING**
- **INCOMPLETE_FORMATION**
- **OPEN_FLAP / BAD_PACK**
- **DOWNSTREAM_BLOCKED**
- **GAP_CONTROL_JAM**

### 13.2 Fault Severity Types
- **warning only**
- **reject only**
- **temporary pause**
- **stopping fault**

### 13.3 Fault Behavior Definitions

#### NO_PRODUCT / STARVATION
- Trigger: insufficient product flow for continued grouping
- Machine response: transition to STARVED
- Recovery: product restored and restart allowed

#### BLANK_MISSING
- Trigger: blank needed but not available
- Machine response: transition to FAULTED or wait state depending on mode
- V1 default: FAULTED
- Recovery: restore blank availability and reset

#### INCOMPLETE_FORMATION
- Trigger: random pack formation issue or scenario injection
- Machine response: cycle completes, pack is rejected, machine continues
- Recovery: none required unless configured otherwise

#### OPEN_FLAP / BAD_PACK
- Trigger: simulated closure quality failure
- Machine response: rejected pack, machine continues
- Recovery: none required in V1

#### DOWNSTREAM_BLOCKED
- Trigger: downstream unavailable during required discharge
- Machine response: transition to BLOCKED
- Recovery: downstream restored and restart allowed

#### GAP_CONTROL_JAM
- Trigger: recipe-defined or scenario-defined jam event
- Machine response: transition to FAULTED
- Recovery: operator clears jam and resets machine

### 13.4 V2 Fault Candidates
- blank misfeed
- intermittent sensor fault
- false reject condition
- slow glue warning
- startup instability
- repeated microstop cluster

---

## 14. Operator Command Model
The simulator must support the following operator commands:
- Start
- Stop
- Reset
- Run Empty
- Select Recipe
- Toggle Product Feed (test mode)
- Toggle Blank Availability (test mode)
- Toggle Downstream Availability (test mode)
- Inject Fault (training/debug mode)

### Operator Behavior Principles
- Stop should normally request RUN_EMPTY, not immediate hard stop
- Reset should only work when fault clearance conditions are met
- Start should require basic permissives
- training mode may expose manual fault injection controls

---

## 15. Start Permissives and Interlocks
### Required V1 Start Conditions
- machine not in active stopping fault
- blank availability OK
- simulation initialized
- valid recipe selected

### Future Start Conditions
- safety chain OK
- door guards closed
- air pressure OK
- glue system ready
- downstream ready

### V1 Interlocks
- cannot start automatic cycle without recipe
- cannot start pack cycle without required grouped product
- cannot discharge if downstream is blocked
- cannot enter normal cycle if a stopping fault is active

---

## 16. Timing Model
The simulator uses simplified timing parameters instead of physical motion models.

### 16.1 V1 Timing Parameters
- startup_time_sec
- product_spawn_interval_sec
- grouping_fill_time (derived from spawn interval and recipe)
- blank_feed_time_sec
- pack_time_sec
- discharge_time_sec
- reset_time_sec
- fault_recovery_time_sec (scenario or operator driven)

### 16.2 Derived Cycle Time
Approximate total cycle time:

`cycle_time = blank_feed_time + pack_time + discharge_time + small overhead`

Actual throughput depends on:
- recipe
- availability of products
- downtime events
- reject/fault behavior

### 16.3 Warmup Model
Optional V1/V2 behavior:
- first N cycles after startup are slower
- fault probability can be slightly elevated during warmup

---

## 17. Animation Specification

### 17.1 Animation Goals
The animation should:
- clearly explain how the tray packer works
- show products moving through machine stages
- reflect machine state changes visually
- show fault/reject behavior clearly
- remain simple and performant

### 17.2 Visual Sections
- infeed conveyor
- grouping area
- blank magazine/feed area
- pack zone
- outfeed conveyor
- reject lane
- info/status panel

### 17.3 Visual Objects
- products: circles or small boxes
- grouped products: arranged grid
- blank: flat rectangle
- finished pack: tray/carton block
- rejected pack: red-tinted output object
- state indicator: color-coded panel

### 17.4 Color Semantics
- green: running / healthy
- blue: starting / initializing
- yellow: starved / warning
- orange: blocked
- red: faulted / rejected
- gray: stopped / inactive

### 17.5 Animation Principles
- animation must reflect state, not attempt exact mechanics
- visible motion should be smooth and readable
- reject path should be obvious
- message panel should explain current condition

---

## 18. Metrics and KPIs
The simulator must compute at minimum:
- cycle_count
- good_pack_count
- reject_count
- runtime_sec
- downtime_sec
- starved_time_sec
- blocked_time_sec
- fault_count_by_type
- current_recipe

### Future Metrics
- MTBF
- MTTR
- availability
- performance ratio
- quality ratio
- simple OEE estimate

---

## 19. Event Schema
The simulator should emit structured events for UI, logging, analytics, and AI.

### 19.1 Event Types
- simulation_started
- simulation_stopped
- state_changed
- phase_changed
- recipe_selected
- cycle_started
- cycle_completed
- pack_completed
- reject_completed
- warning_raised
- fault_raised
- fault_cleared
- operator_command
- downstream_blocked
- product_starved

### 19.2 Minimum Event Fields
- event_id
- timestamp
- event_type
- machine_id
- state
- recipe_id
- severity
- message
- payload

### 19.3 Example Payload
```json
{
  "event_type": "fault_raised",
  "timestamp": "2026-04-01T10:15:22Z",
  "machine_id": "tray_packer_01",
  "state": "FAULTED",
  "recipe_id": "recipe_24",
  "severity": "stop",
  "message": "Gap control jam",
  "payload": {
    "fault_code": "GAP_JAM",
    "cycle_count": 42,
    "grouped_count": 24
  }
}
```

---

## 20. Logging Requirements
V1 must support structured logging to one or more of:
- JSONL
- CSV
- SQLite

### Required Log Categories
- state transitions
- faults and clears
- cycle outcomes
- operator commands
- recipe changes
- runtime counters snapshot (periodic or end-of-session)

---

## 21. PLC/HMI Readiness Requirements
The simulator must be designed so its machine variables can later be mapped to PLC/HMI tags.

### Required Interface Concepts
- commands in
- status out
- counters out
- active fault out
- current phase out
- permissive status out

### Suggested Interface Modes
- direct Python API
- REST/WebSocket (dev mode)
- OPC UA (integration mode)
- MQTT (optional alternative)

The simulator core must remain interface-agnostic.

---

## 22. AI Readiness Requirements
The simulator must produce clean structured data for AI features.

### AI-Relevant Outputs
- fault history
- shift summary data
- reject history
- downtime causes
- operator actions
- scenario events
- recipe comparisons

### AI Use Cases Supported by This Spec
- shift summary generation
- fault explanation assistant
- training scenario summaries
- downtime cause analysis
- operator coaching or guidance

---

## 23. Configuration Requirements
Simulation parameters should be configurable without changing core logic.

### Recommended Config Files
- `recipes.json` or `recipes.yaml`
- `faults.json` or `faults.yaml`
- `sim_config.json`
- `scenarios.json`

### Configurable Items
- timing values
- probabilities
- recipes
- visual labels
- machine id
- logging mode
- UI behavior flags

---

## 24. Acceptance Criteria for V1
V1 is considered successful when all of the following are true:
- simulator starts and stops correctly
- at least 3 recipes are supported
- products visibly group and produce packs
- good packs and rejected packs are visually distinct
- at least 4 meaningful faults are supported
- starvation and downstream block behavior are supported
- structured event logs are generated
- the UI clearly shows machine state, counters, recipe, and current fault
- the simulation feels believable as a tray packer from an external/operator perspective

---

## 25. Known Simplifications
The following are intentional simplifications and not project defects:
- grouping is modeled as a logical accumulation rather than exact divider mechanics
- blank feed is represented as a timed event rather than full kinematic motion
- quality faults are probabilistic rather than sensor-physics based
- outfeed behavior is simplified to free/blocked modes
- machine internals are represented as stages, not exact subassemblies

---

## 26. Open Questions
These questions may refine later versions but do not block V1:
- Should blank missing be a hard fault or a wait/retry state?
- Should startup instability be a standard feature or a scenario?
- Should manual mode allow direct phase stepping?
- Should rejects always continue production or sometimes escalate to fault?
- Should cycle timing be fully recipe-driven or scenario-adjusted as well?

---

## 27. Recommended First Implementation
The best first implementation is:
- Python simulation engine
- simple 2D renderer
- 3 recipes
- 6 primary states
- 4 to 6 faults
- JSON-configured recipes and faults
- structured event logging
- keyboard and simple UI controls

This gives the fastest path to a believable and extensible V1.
