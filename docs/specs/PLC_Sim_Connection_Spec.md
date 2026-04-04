# PLC-Simulator Connection Specification

## 1. Purpose

This document defines how the PLC-style control layer connects to the tray packer simulator.

The goal is to make the simulator behave like a machine/process side and the PLC layer behave like a controller side.

This connection spec is designed to support:
- early pure-software development
- web dashboard integration
- local test harnesses
- future OPC UA integration
- future MQTT integration
- future Siemens/PLCSIM adaptation

---

## 2. Connection Philosophy

The project separates responsibilities clearly:

- **PLC layer** issues commands, evaluates permissives, and manages operator control logic.
- **Simulator layer** behaves like the machine and returns status, faults, counters, and events.

The connection must be:
- simple
- deterministic
- easy to debug
- transport-independent
- compatible with future industrial protocols

---

## 3. Recommended Integration Phases

### Phase 1: In-Process / Local Python Bridge
Both PLC-style logic and simulator run in the same software environment.
Communication happens through:
- shared data structures
- internal service calls
- local event bus
- local JSON/state objects

This is the easiest starting point.

### Phase 2: Local Network API Bridge
PLC-style logic, dashboard, and simulator may run as separate services.
Communication happens through:
- local REST API for commands/config
- WebSocket or polling for live status
- shared event log stream

### Phase 3: Industrial Protocol Bridge
Future industrial-style connection may use:
- OPC UA
- MQTT
- optional PLC mapping / PLCSIM bridge

---

## 4. Minimum V1 Connection Model

The recommended V1 connection model is:

- simulator = primary machine runtime
- PLC-style control = software control service or module
- dashboard/HMI = reads shared tags and writes command requests
- AI layer = read-only consumer of status, events, and logs

### Minimum required paths:
1. Commands from PLC/HMI to simulator
2. Machine status from simulator to PLC/HMI
3. Events/faults from simulator to logger/AI/dashboard

---

## 5. Shared Interface Contract

The connection uses the shared behavioral tag model.

Primary groups:
- `cmd`
- `cfg`
- `in`
- `sts`
- `out`
- `fault`
- `evt`

These groups should remain stable even if the transport changes.

---

## 6. Command Flow

### 6.1 Example Start Flow
1. Operator presses Start in HMI/dashboard
2. PLC layer validates start permissives
3. PLC writes `cmd.start = true`
4. Simulator receives start pulse
5. Simulator transitions `STOPPED -> STARTING -> RUNNING`
6. Simulator updates:
   - `sts.machine_state`
   - `evt.last_event_code`
   - counters and phase tags

### 6.2 Example Stop Flow
1. Operator presses Stop
2. PLC writes `cmd.stop = true`
3. Simulator enters `RUN_EMPTY`
4. When internal flow is cleared, simulator sets `sts.machine_state = STOPPED`

### 6.3 Example Reset Flow
1. Machine fault occurs
2. Simulator sets `sts.machine_state = FAULTED`, `fault.active_code`
3. Operator clears issue
4. Operator presses Reset
5. PLC validates reset
6. PLC writes `cmd.reset = true`
7. Simulator clears fault and returns to `STARTING` or `STOPPED`

---

## 7. Connection Roles by Component

## 7.1 PLC Layer
Reads:
- machine state
- cycle phase
- fault status
- counters
- availability conditions

Writes:
- start/stop/reset
- mode selection
- recipe selection
- optional restart policy

## 7.2 Simulator Layer
Reads:
- commands
- external conditions
- selected recipe/config

Writes:
- machine state
- counters
- faults
- events
- runtime/downtime
- grouped count / target

## 7.3 Dashboard/HMI
Reads:
- all status/counter/fault/event data

Writes:
- operator commands
- recipe requests
- test toggles in development mode only

## 7.4 AI Layer
Reads:
- machine state
- counters
- faults
- events
- logs/history

Writes:
- nothing directly to control path in standard architecture

---

## 8. Recommended V1 Data Exchange Model

### Option A: Shared State Object
Best for early development.

A central state object is updated by:
- PLC logic
- simulator logic
- dashboard API

Advantages:
- very simple
- fast to implement
- easy to debug

### Option B: Service + Event Bus
Good for structured architecture.

Use:
- command API
- status service
- event queue or publish/subscribe model

Advantages:
- cleaner scaling
- easier frontend/backend split

### Recommendation
Use **Option A first**, but design the data model so it can later move to Option B.

---

## 9. Suggested Runtime Data Layout

Example shared structure:

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
    "fault_active": false
  },
  "out": {
    "grouped_count": 12,
    "target_group_count": 24,
    "good_pack_count": 41,
    "reject_pack_count": 2,
    "cycle_count": 43
  },
  "fault": {
    "active_code": "",
    "active_text": "",
    "latched": false
  },
  "evt": {
    "last_event_code": "PRODUCT_GROUP_COMPLETE",
    "last_event_text": "Recipe grouping target reached"
  }
}
```

---

## 10. Command Handling Rules

Command writes should be treated as pulses or short-lived requests.

### Pulse Commands
- start
- stop
- reset
- acknowledge alarm
- clear counters

### Latched / persistent values
- selected recipe
- auto/manual mode
- restart policy
- scenario mode

Implementation rule:
- consumer should clear or acknowledge pulse commands after reading them

---

## 11. Synchronization Rules

The connection must avoid conflicting ownership.

### Write Ownership
- HMI writes operator requests
- PLC layer validates and writes final commands
- simulator writes machine truth
- AI reads only

### Read Ownership
Any observer may read status, but only the defined owner should write a tag.

This prevents race conditions and inconsistent UI behavior.

---

## 12. Update Rate Guidance

### Fast-changing runtime status
Examples:
- machine state
- cycle phase
- grouped count
Update:
- per simulation tick or on change

### Moderate-rate counters
Examples:
- good pack count
- reject count
- runtime/downtime
Update:
- per second or on event

### Event/fault data
Examples:
- last event code
- active fault
Update:
- on change

### Dashboard refresh guidance
- local UI: 5 to 20 Hz is enough
- web UI polling: 2 to 5 Hz is usually enough
- WebSocket/event streaming preferred for richer UX

---

## 13. Error and Timeout Handling

The connection layer should define simple health rules.

### Comms Healthy
True if:
- recent status updates are still arriving
- command path is responsive
- simulator heartbeat is healthy

### Comms Fault
If no update is received within a defined timeout:
- `sts.comms_healthy = false`
- HMI should show communications warning
- control actions may be disabled if necessary

### Recommended simple V1 timeout
- 2 to 5 seconds without update = communications unhealthy

---

## 14. Heartbeat Guidance

Optional but useful:
- simulator publishes incrementing heartbeat or timestamp
- PLC/dashboard monitors heartbeat freshness

Possible tags:
- `sts.comms_healthy`
- `evt.last_update_ts`
- `evt.heartbeat_counter`

This is helpful for later PLC/OPC UA integration.

---

## 15. Transport Options

## 15.1 Internal Python Bridge
Best for first implementation.

Pros:
- easiest
- no protocol overhead
- very fast
- easy for agents to build

## 15.2 REST + WebSocket
Best for simulator + web dashboard.

Pros:
- good frontend/backend separation
- clear command API
- easy for modern web apps

## 15.3 OPC UA
Best future industrial-style interface.

Pros:
- closest to industrial integration style
- clean mapping to PLC/HMI nodes

Cons:
- more setup and tooling complexity

## 15.4 MQTT
Best for lightweight message-based integration.

Pros:
- simple publish/subscribe model
- easy multi-client observation

Cons:
- less natural for structured browseable machine state than OPC UA

### Recommendation
- V1: internal Python/shared state
- V2: REST + WebSocket
- V3: OPC UA bridge
- Optional: MQTT bridge later

---

## 16. OPC UA Mapping Guidance

Recommended node organization:
- `/Commands`
- `/Inputs`
- `/Status`
- `/Outputs`
- `/Faults`
- `/Events`
- `/Config`

Examples:
- `/Commands/Start`
- `/Status/MachineState`
- `/Outputs/GoodPackCount`
- `/Faults/ActiveCode`

Important rule:
OPC UA is only a transport/mapping layer. The semantic contract stays defined by the tag spec.

---

## 17. MQTT Mapping Guidance

Recommended topics:
- `traypacker/cmd/start`
- `traypacker/cmd/stop`
- `traypacker/cmd/reset`
- `traypacker/in/product_available`
- `traypacker/sts/machine_state`
- `traypacker/out/good_pack_count`
- `traypacker/fault/active_code`
- `traypacker/evt/last_event_code`

Payloads may be:
- primitive values for simple tags
- JSON objects for grouped updates

---

## 18. PLC / Siemens Adaptation Notes

When adapting to Siemens/TIA-style workflows:
- PLC program can map tags into DBs/UDTs
- simulator bridge can expose matching OPC UA nodes
- HMI can bind to DB mirror tags or OPC UA nodes
- PLCSIM or software test harness can be used before real hardware exists

The project should not depend on real hardware for the core architecture.

---

## 19. Security and Safety Boundary

This project is a simulation/training/digital twin prototype.

Important boundary:
- AI must not directly issue control commands in the normal design
- safety-critical decisions must stay rule-based
- direct command endpoints should remain limited to operator/HMI/control layer

Even in dev mode, AI should only propose actions, not execute them automatically.

---

## 20. Testing Requirements

The connection layer should be tested for:
- start command reaches simulator correctly
- stop command triggers run-empty behavior
- reset only works in allowed conditions
- recipe selection updates status consistently
- faults propagate to dashboard and logs
- counters remain consistent across components
- lost communications is detected properly

---

## 21. Minimum V1 Deliverable

The minimum usable connection implementation should provide:
- shared tag model
- command pulse handling
- simulator status publishing
- dashboard/HMI read access
- event and fault visibility
- a basic comms health signal

That is enough for the first full project prototype.

---

## 22. Final Guidance

This file defines how all major layers communicate around the shared behavioral machine model.

If there is ever a conflict between transport convenience and interface clarity, prefer interface clarity and stable tag meaning.

The key rule is:
**the simulator should behave like a machine, and every other system should talk to it through a clean shared contract.**
