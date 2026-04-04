# Logging and Reporting Specification

## 1. Purpose

This document defines how the tray packer digital twin project records operational history and generates reports.

Logging and reporting support:
- troubleshooting
- training reviews
- AI summaries
- dashboard analytics
- maintenance-style documentation
- future export workflows

---

## 2. Design Goals

The logging/reporting system should:
- be structured
- be easy to query
- support real-time and post-session use
- be simple enough for V1
- grow into richer analytics later

---

## 3. Logging Layers

The project should record at least these layers:

1. event log
2. session summary log
3. counter snapshots
4. fault history
5. report outputs

---

## 4. Minimum V1 Logging

The first version should log:
- machine state changes
- command actions
- faults
- reject events
- recipe changes
- session start/end
- final counters

This is enough for AI summaries and a good dashboard.

---

## 5. Session Concept

A session is one bounded operating run or demo period.

A session begins when:
- user starts a simulation session
or
- machine first begins use in a new run

A session ends when:
- user ends the session
- simulator resets
- session timeout/close occurs

Every report should be attributable to a session.

---

## 6. Recommended Session Fields

- session_id
- start_ts
- end_ts
- duration_sec
- recipes_used
- total_cycles
- good_packs
- rejected_packs
- runtime_sec
- downtime_sec
- main_stop_causes
- scenario_id (optional)
- notes (optional)

---

## 7. Event Logging Requirements

All important operational changes should generate event records.

Minimum logged events:
- start/stop/reset
- state transitions
- faults active/cleared
- reject discharges
- recipe changes
- scenario start/end

See `Event_Schema.md` for details.

---

## 8. Counter Snapshot Guidance

Optional but useful:
store periodic counter snapshots for trend/reconstruction.

Recommended cadence:
- once per second
or
- on important event changes only

Minimum useful fields:
- ts
- machine_state
- cycle_count
- good_pack_count
- reject_pack_count
- grouped_count
- active_recipe

---

## 9. Fault History Requirements

The reporting system should be able to answer:
- how many times each fault occurred
- total downtime by fault
- most recent fault
- average recovery time by fault
- which faults stopped production vs only created rejects

---

## 10. Report Types

Recommended report outputs:

### 10.1 Session Summary
Short operational summary of one run.

### 10.2 Fault Summary
Fault-focused summary with counts and downtime.

### 10.3 Production Summary
Counts, cycle times, runtime/downtime, recipe breakdown.

### 10.4 Training Report
Scenario description, faults, responses, outcomes.

### 10.5 Maintenance Summary
Maintenance-oriented wording of repeated stops, jams, and corrective actions.

---

## 11. V1 Report Outputs

The first version should support:

1. structured session summary JSON
2. human-readable markdown summary
3. AI-generated summary text

This is enough for demos, documentation, and future exports.

---

## 12. Suggested Session Summary Structure

```json
{
  "session_id": "sess-001",
  "start_ts": "2026-04-01T12:00:00Z",
  "end_ts": "2026-04-01T12:30:00Z",
  "duration_sec": 1800,
  "recipes_used": ["24-pack", "30-pack"],
  "good_packs": 132,
  "rejected_packs": 7,
  "total_cycles": 139,
  "runtime_sec": 1450,
  "downtime_sec": 350,
  "top_faults": [
    {"fault_code": "GAP_CONTROL_JAM", "count": 2, "downtime_sec": 120}
  ]
}
```

---

## 13. AI Reporting Guidance

The AI should be able to generate:
- concise operator-style summary
- maintenance summary
- training summary
- executive/demo summary

The AI should use structured logs first, not guess from visuals.

---

## 14. Export Guidance

Later versions may export:
- markdown
- PDF
- CSV
- JSON
- dashboard share views

V1 does not need all export formats.
Markdown + JSON is enough.

---

## 15. Final Guidance

The project should treat logs as the factual record and reports as human-friendly interpretations.

The key rule is:
**log everything important in structured form, then generate reports from that structure.**
