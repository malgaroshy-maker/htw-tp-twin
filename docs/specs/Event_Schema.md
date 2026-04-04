# Event Schema

## 1. Purpose

This document defines the event schema used across the tray packer digital twin platform.

Events are the main structured history layer for:
- reporting
- AI analysis
- training review
- dashboard activity feeds
- debugging
- future historian integrations

---

## 2. Design Goals

The event schema should:
- be easy to log
- be easy to search
- be readable by humans
- be consistent across simulator, PLC-style control, dashboard, and AI
- support both real-time and historical analysis

---

## 3. Event Types

The project should support these event groups:

1. machine state events
2. control command events
3. cycle/production events
4. fault/alarm events
5. reject/quality events
6. recipe events
7. scenario/training events
8. system/comms events

---

## 4. Minimum Common Event Fields

Every event should contain at least:

| Field | Type | Description |
|---|---|---|
| event_id | string | Unique event identifier |
| ts | string | Timestamp in ISO format |
| event_code | string | Stable event code |
| category | string | Event category |
| severity | string | INFO, WARNING, FAULT, CRITICAL |
| machine_state | string | Machine state when event occurred |
| machine_mode | string | AUTO or MANUAL |
| recipe_id | string | Active recipe at time of event |
| message | string | Human-readable event text |

---

## 5. Recommended Extended Fields

Recommended optional fields:
- cycle_count
- grouped_count
- target_group_count
- fault_code
- reject_reason
- actor
- source
- scenario_id
- session_id
- command_name
- previous_state
- new_state
- duration_sec
- metadata

---

## 6. Event Categories

Recommended categories:
- `STATE`
- `COMMAND`
- `PRODUCTION`
- `FAULT`
- `REJECT`
- `RECIPE`
- `SCENARIO`
- `SYSTEM`

---

## 7. Event Severity

Recommended values:
- `INFO`
- `WARNING`
- `FAULT`
- `CRITICAL`

Reject events may often use:
- `WARNING`
or
- `INFO`
depending on UI needs

---

## 8. Example Event Codes

### State
- MACHINE_START_REQUESTED
- MACHINE_STARTED
- MACHINE_STOP_REQUESTED
- MACHINE_RUN_EMPTY_ENTERED
- MACHINE_STOPPED
- MACHINE_STARVED
- MACHINE_BLOCKED
- MACHINE_FAULTED
- MACHINE_RESET

### Production
- PRODUCT_GROUP_COMPLETE
- PACK_CYCLE_STARTED
- PACK_GOOD_DISCHARGED
- PACK_REJECT_DISCHARGED

### Fault
- FAULT_BLANK_MISSING
- FAULT_GAP_CONTROL_JAM
- FAULT_CLEARED

### Recipe
- RECIPE_CHANGE_REQUESTED
- RECIPE_CHANGED
- RECIPE_CHANGE_DENIED

### Scenario
- SCENARIO_STARTED
- SCENARIO_STEP_TRIGGERED
- SCENARIO_COMPLETED

### System
- COMMS_LOST
- COMMS_RESTORED

---

## 9. Example Base Event JSON

```json
{
  "event_id": "evt-000123",
  "ts": "2026-04-01T12:15:01Z",
  "event_code": "MACHINE_STARTED",
  "category": "STATE",
  "severity": "INFO",
  "machine_state": "RUNNING",
  "machine_mode": "AUTO",
  "recipe_id": "24-pack",
  "message": "Machine entered RUNNING state"
}
```

---

## 10. Example Fault Event JSON

```json
{
  "event_id": "evt-000200",
  "ts": "2026-04-01T12:18:33Z",
  "event_code": "FAULT_BLANK_MISSING",
  "category": "FAULT",
  "severity": "FAULT",
  "machine_state": "FAULTED",
  "machine_mode": "AUTO",
  "recipe_id": "24-pack",
  "fault_code": "BLANK_MISSING",
  "cycle_count": 31,
  "grouped_count": 24,
  "target_group_count": 24,
  "message": "Blank missing at cycle start"
}
```

---

## 11. Example Reject Event JSON

```json
{
  "event_id": "evt-000241",
  "ts": "2026-04-01T12:20:44Z",
  "event_code": "PACK_REJECT_DISCHARGED",
  "category": "REJECT",
  "severity": "WARNING",
  "machine_state": "RUNNING",
  "machine_mode": "AUTO",
  "recipe_id": "30-pack",
  "cycle_count": 37,
  "reject_reason": "OPEN_FLAP",
  "message": "Rejected pack discharged"
}
```

---

## 12. Event Producers

Events may be produced by:
- simulator engine
- PLC-style control layer
- scenario engine
- dashboard backend
- system integration layer

Event source should be explicit where useful.

Suggested field:
- `source`: `simulator`, `plc`, `scenario_engine`, `dashboard`, `system`

---

## 13. Session and Scenario Context

Every event should ideally be attributable to:
- a session
- optionally a scenario

Useful fields:
- `session_id`
- `scenario_id`

This supports:
- training analysis
- session summaries
- multi-run comparisons

---

## 14. Event Storage Guidance

Minimum V1 storage options:
- line-delimited JSON
- JSON arrays
- SQLite table
- CSV export for simplified analytics

Preferred direction:
- JSON or SQLite for richer structured analysis

---

## 15. AI Usage Guidance

The AI layer should use events as the main history source for:
- stop explanations
- report generation
- timeline reconstruction
- scenario review
- recipe comparison

Events should be preferred over raw animation state.

---

## 16. Final Guidance

The event schema is the system’s memory of what happened.

The key principle is:
**if something important happens in the machine, it should become a structured event.**
