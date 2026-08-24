# Fault Model

## 1. Purpose

This document defines the fault and reject behavior model for the simplified tray packer digital twin project.

It provides a shared reference for:
- the Python simulator
- PLC-style control behavior
- HMI alarm presentation
- dashboard analytics
- AI troubleshooting and reporting

This is a **behavioral fault model**, not a full mechanical failure physics model.

---

## 2. Design Intent

The fault model should:
- feel believable to operators and maintenance staff
- be simple enough for a first implementation
- support both machine-stopping faults and non-stopping quality defects
- make reporting and AI explanations easy
- align with the simplified tray packer state machine

The model is intended to reproduce **observable behavior**, not exact vendor-specific internals.

---

## 3. Fault Model Layers

The project separates abnormal behavior into four layers:

### 3.1 Availability Conditions
These are operating conditions that affect production but are not always treated as hard faults.
Examples:
- no incoming product
- downstream unavailable
- blank supply low

These may cause:
- STARVED
- BLOCKED
- warning only

### 3.2 Machine Faults
These are machine problems that stop automatic operation and require intervention or reset.
Examples:
- blank missing at cycle start
- transfer jam
- internal logic sequencing error

These normally cause:
- FAULTED state
- active fault code
- reset requirement

### 3.3 Quality Reject Events
These are pack defects that do not necessarily stop the machine.
Examples:
- incomplete formation
- open flap
- pack routed to reject lane

These normally cause:
- reject count increase
- event log entry
- optional warning/alarm
- no machine stop

### 3.4 Maintenance / Scenario Faults
These are optional scenario-based or training-generated abnormal conditions.
Examples:
- intermittent sensor instability
- repeated micro-jams
- degraded recipe performance
- extended recovery time

These are especially useful for AI and training features.

---

## 4. Fault Categories

The project uses the following fault categories.

## 4.1 Production Interruptions
These affect flow but may not be true machine faults.
Examples:
- starvation
- blocked downstream

## 4.2 Stopping Faults
These stop the machine and require reset or recovery.
Examples:
- blank missing
- gap control jam
- sequence error

## 4.3 Reject-Only Events
These create bad product but do not stop the machine.
Examples:
- incomplete pack
- open flap

## 4.4 Warnings
These are advisory conditions.
Examples:
- blank magazine low
- rising reject trend
- repeated micro-stop pattern

---

## 5. Severity Model

Recommended severity classes:

### INFO
Pure informational event.
Examples:
- run-empty started
- recipe changed
- machine restarted

### WARNING
Condition needs attention but machine may continue.
Examples:
- low blank supply
- intermittent product starvation
- repeated reject events

### FAULT
Machine cannot continue normal automatic operation.
Examples:
- blank missing
- transfer jam

### CRITICAL
Severe stop condition or unrecoverable abnormal condition.
Examples:
- safety chain lost
- emergency-stop active
- fatal simulator logic exception

For V1, WARNING and FAULT are the most important classes.

---

## 6. Fault Behavior Types

Each abnormal condition should define its behavior type.

| Behavior Type | Description |
|---|---|
| STATE_ONLY | Changes machine state but not fault latch |
| WARNING_ONLY | Raises warning, machine may continue |
| LATCHING_FAULT | Stops machine and requires reset |
| AUTO_RECOVER | Clears automatically when condition returns to normal |
| REJECT_ONLY | Affects pack quality only |
| TRAINING_SCENARIO | Injected abnormal condition for training/testing |

---

## 7. Minimum V1 Fault Set

The first implementation should include the following core abnormalities.

1. Product Starvation
2. Downstream Block
3. Blank Missing
4. Gap Control Jam
5. Incomplete Pack
6. Open Flap

The implemented configuration additionally defines:

7. Reject Bin Near Full (warning at 2 accumulated rejects)
8. Reject Bin Full (latching fault at 3 accumulated rejects; reset denied until bin cleared)
9. Transport Chain Gap (clearance violation at discharge outlet check)

These are enough to produce believable behavior and useful analytics.

---

## 8. Detailed Fault Definitions

## 8.1 Product Starvation

### Fault ID
`STARVATION`

### Type
Production interruption / state-based condition

### Severity
WARNING or STATE_ONLY

### Trigger
The machine needs product to continue grouping or cycle preparation, but product supply is unavailable.

### Typical Detection Logic
- `IN_PRODUCT_AVAILABLE = false`
- grouped count below recipe target
- machine is in AUTO production context

### Top-Level Effect
- Machine enters `STARVED`
- Automatic cycle progression pauses

### Counter / Reporting Effect
- downtime accumulates under starvation category
- starvation event logged
- no reject is created directly

### Recovery
- auto-recover when product returns
- optionally transition through STARTING
- no reset required in basic implementation

### AI Interpretation Example
"The machine paused because upstream product was unavailable, so it could not complete the required grouping count."

---

## 8.2 Downstream Block

### Fault ID
`DOWNSTREAM_BLOCK`

### Type
Production interruption / state-based condition

### Severity
WARNING or STATE_ONLY

### Trigger
The machine cannot discharge finished packs because outfeed or downstream handling is unavailable.

### Typical Detection Logic
- `IN_DOWNSTREAM_AVAILABLE = false`
- machine is ready to discharge or enter next cycle

### Top-Level Effect
- Machine enters `BLOCKED`

### Counter / Reporting Effect
- downtime accumulates under blocked category
- blocked event logged

### Recovery
- auto-recover when downstream becomes available
- no reset required in basic implementation

### AI Interpretation Example
"The machine stopped because finished packs could not leave the outfeed safely."

---

## 8.3 Blank Missing

### Fault ID
`BLANK_MISSING`

### Type
Stopping fault

### Severity
FAULT

### Trigger
A packaging cycle is ready to begin but no blank is available.

### Typical Detection Logic
- grouped count reached recipe target
- cycle is about to enter `BLANK_FEED`
- `IN_BLANK_AVAILABLE = false`

### Top-Level Effect
- Machine enters `FAULTED`
- active fault latched
- automatic production stops

### Counter / Reporting Effect
- fault count increases
- downtime accumulates under blank fault
- event logged with timestamp

### Recovery
- restore blank supply
- operator reset required
- machine restarts if permissives are valid

### AI Interpretation Example
"The cycle could not begin because the machine had enough product grouped, but no carton blank was available."

---

## 8.4 Gap Control Jam

### Fault ID
`GAP_CONTROL_JAM`

### Type
Stopping fault

### Severity
FAULT

### Trigger
A product transfer or packing movement fails due to simulated jam behavior.

### Typical Detection Logic
This can be modeled in V1 by:
- random jam probability during transfer/packing
- scenario injection
- optional explicit jam input

### Top-Level Effect
- Machine enters `FAULTED`
- fault latches
- cycle stops

### Counter / Reporting Effect
- fault count increases
- downtime accumulates under jam category
- event logged

### Recovery
- operator/maintenance clears jam
- reset required
- machine returns to STARTING or STOPPED based on control strategy

### AI Interpretation Example
"The machine stopped due to a transfer jam during the pack cycle, which requires clearing and reset."

---

## 8.5 Incomplete Pack

### Fault ID
`INCOMPLETE_PACK`

### Type
Reject-only event

### Severity
WARNING or REJECT_ONLY

### Trigger
The grouped product formation is incomplete or simulated as incomplete.

### Typical Detection Logic
- reject probability triggers on cycle completion
- optional explicit bad-formation scenario
- grouped count inconsistency in advanced versions

### Top-Level Effect
- Machine remains in RUNNING
- pack is discharged as rejected

### Counter / Reporting Effect
- reject count increases
- reject reason logged
- cycle still counts as completed

### Recovery
- no machine reset required
- production continues

### AI Interpretation Example
"A pack was rejected because the simulated product formation was incomplete, but the machine continued running."

---

## 8.6 Open Flap

### Fault ID
`OPEN_FLAP`

### Type
Reject-only event

### Severity
WARNING or REJECT_ONLY

### Trigger
A packaged tray/carton is simulated as not properly closed or sealed.

### Typical Detection Logic
- reject probability triggers in discharge/quality stage
- optional recipe- or speed-dependent defect logic

### Top-Level Effect
- Machine remains in RUNNING
- pack is routed to reject

### Counter / Reporting Effect
- reject count increases
- reject reason logged

### Recovery
- no machine reset required
- may contribute to warning trend if frequent

### AI Interpretation Example
"The pack was rejected for a packaging quality defect, but the machine did not need to stop."

---

## 9. Optional V2/V3 Fault Set

Later phases may add:
- repeated micro-stop event
- sensor instability
- recipe mismatch
- invalid changeover setting
- utility loss
- safety trip
- glue system fault
- vacuum failure
- manual mode action denied
- repeated reject warning escalation

These are not required for V1.

---

## 10. Fault Trigger Sources

Faults may come from different sources.

## 10.1 Deterministic Logic
Example:
- blank missing when cycle begins

## 10.2 Random Probability
Example:
- jam probability
- reject probability

## 10.3 Scenario Injection
Example:
- training mode deliberately causes repeated starvation
- instructor forces downstream block

## 10.4 External Test Input
Example:
- HMI test toggle
- API or dashboard control
- future PLC or scenario engine signal

---

## 11. Fault Timing Model

The simplified simulator should use practical timing rather than exact physical modeling.

Each fault may define:

| Parameter | Meaning |
|---|---|
| detection_delay_sec | Time before condition becomes active |
| mean_recovery_sec | Typical time to recover |
| requires_reset | Whether reset is required |
| machine_stop | Whether top-level machine stop occurs |
| reject_only | Whether fault only creates a bad pack |

### V1 Guidance
Use simple fixed values or configurable ranges.
Example:
- starvation delay: 0.5 to 2.0 sec
- gap jam recovery: 5 to 20 sec
- blank missing recovery: 3 to 10 sec

Exact factory timing is not required in the first version.

---

## 12. Recovery Model

Each fault/event should define how recovery works.

### 12.1 Auto-Recovery
Used for:
- starvation
- blocked downstream

Recovery happens when condition clears.

### 12.2 Manual Recovery
Used for:
- jam
- blank missing
- sequence fault

Recovery requires:
1. cause removed
2. operator reset
3. machine restart sequence

### 12.3 Quality Event Only
Used for:
- incomplete pack
- open flap

Recovery is not needed because production continues.

---

## 13. Fault Response Table

| Fault ID | Category | Severity | Machine State Effect | Reset Required | Reject Created |
|---|---|---|---|---|---|
| STARVATION | Production interruption | WARNING | STARVED | No | No |
| DOWNSTREAM_BLOCK | Production interruption | WARNING | BLOCKED | No | No |
| BLANK_MISSING | Stopping fault | FAULT | FAULTED | Yes | No |
| GAP_CONTROL_JAM | Stopping fault | FAULT | FAULTED | Yes | No |
| INCOMPLETE_PACK | Reject-only | WARNING | No state stop | No | Yes |
| OPEN_FLAP | Reject-only | WARNING | No state stop | No | Yes |
| REJECT_BIN_NEAR_FULL | Production interruption | WARNING | No state stop | No | No |
| REJECT_BIN_FULL | Stopping fault | FAULT | FAULTED | Yes (bin must be cleared first) | No |
| TRANSPORT_CHAIN_GAP | Stopping fault | FAULT | FAULTED | Yes | No |

---

## 13.1 Warning Escalation Model

The simulator implements a two-stage blank shortage warning system:

| Warning | Trigger | Machine Effect | Escalation |
|---|---|---|---|
| `BLANK_LOW` | Blanks remaining at or below 20 | Warning banner only; production continues | Clears automatically on refill |
| `BLANK_EMPTY` | Blank magazine empty or supply unavailable while producing | Warning banner only; production continues | Escalates to latched `BLANK_MISSING` fault after 3 consecutive unresolved production cycles |

Rules:
- Warnings auto-clear when the underlying condition resolves.
- A latched fault supersedes any active warning.
- Refilling blanks restores material but does NOT auto-clear a latched `BLANK_MISSING`; the operator must still press Reset.

---

## 14. Fault Prioritization

If multiple conditions are active, the project should prioritize them.

Recommended V1 priority:
1. safety / critical stop (future)
2. stopping machine faults
3. blocked condition
4. starved condition
5. reject-only events
6. warnings

This prevents conflicting machine state behavior.

Example:
- if blank missing and downstream blocked occur together at cycle start,
  `BLANK_MISSING` should dominate because it is a latching machine fault.

---

## 15. Fault Logging Requirements

Each important abnormal condition should create a structured event log entry.

Minimum fields:
- timestamp
- fault/event code
- severity
- machine state at time of event
- active recipe
- cycle count
- grouped count
- effect type
- human-readable text

Example fields:
```json
{
  "ts": "2026-04-01T10:15:12Z",
  "code": "GAP_CONTROL_JAM",
  "severity": "FAULT",
  "machine_state": "FAULTED",
  "recipe": "24-pack",
  "cycle_count": 31,
  "text": "Transfer jam detected during pack cycle"
}
```

---

## 16. Fault Statistics

The simulator and dashboard should be able to calculate:
- number of occurrences by fault code
- total downtime by fault code
- mean recovery time
- reject count by reason
- fault frequency by recipe
- fault frequency by scenario/session

These are important for:
- dashboard analytics
- AI summaries
- training reports

---

## 17. Fault Model for AI Assistant

The AI assistant should use this file as a semantic base for explaining abnormal behavior.

Good AI use cases:
- "Why did the machine stop?"
- "What does blank missing mean?"
- "Why did rejects increase on this recipe?"
- "Was this a stop fault or a quality issue?"

The AI should classify problems using:
- state effect
- severity
- reset requirement
- quality impact
- likely operator response

The AI should not invent root causes beyond the structured model unless clearly marked as inference.

---

## 18. Training Scenario Use

The fault model should also support simulated training cases.

Examples:
- repeated starvation during one session
- one major jam after every ten cycles
- high reject recipe challenge
- downstream block after good production period

Each scenario can override:
- probabilities
- recovery times
- warning thresholds
- event frequency

This makes the project much stronger as a training simulator.

---

## 19. Implementation Guidance

Recommended V1 implementation approach:
- define fault metadata in a structured config file
- represent active fault separately from reject events
- use event logging for every abnormal transition
- use simple probability + condition logic
- avoid detailed physical fault simulation

Suggested internal model structure:
- `fault_definitions.json` or `.yaml`
- `active_fault`
- `warning_list`
- `last_reject_reason`
- `downtime_by_reason`
- `event_log`

---

## 20. Simplifications

The following are intentionally simplified:
- no exact jam physics
- no real sensor debounce calibration
- no detailed glue/vacuum dynamics
- no true multi-fault root-cause graph
- no exact OEM alarm list in V1

This is acceptable and desirable for the current project scope.

---

## 21. Recommended V1 Parameters

A practical V1 configuration may define, per recipe or global fault:
- reject probability
- jam probability
- starvation recovery delay
- blocked recovery delay
- reset delay
- startup delay
- warning threshold counts

These parameters are enough to create realistic and useful behavior without making the system overly complex.

---

## 22. Final Guidance

This fault model is the shared behavioral reference for abnormal conditions in the project.

If the simulator, dashboard, PLC-style logic, HMI alarms, or AI assistant disagree on how a fault behaves, this document should be used as the reference until revised.

The key principle is:
**simulate what operators and maintenance staff observe, not the full internal physics of failure.**
