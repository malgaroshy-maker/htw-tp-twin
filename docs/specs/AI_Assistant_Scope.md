# AI Assistant Scope

## 1. Purpose

This document defines the scope, limits, responsibilities, and product role of the AI assistant in the tray packer digital twin project.

The AI assistant is a product feature, not just a developer tool.

---

## 2. Role of the Assistant

The assistant is designed to be:
- an explainer
- an analytics helper
- a reporting assistant
- a training copilot
- a documentation guide

It is not designed to be:
- an autonomous operator
- a safety controller
- a PLC replacement
- a hidden decision maker in the control loop

---

## 3. In-Scope Capabilities

The assistant is in scope for:

### 3.1 Explain current machine condition
Examples:
- Why is the machine stopped?
- What does this fault mean?
- Why is Start disabled?

### 3.2 Explain recent history
Examples:
- What happened before the last jam?
- Why did rejects increase?
- What changed after recipe switch?

### 3.3 Generate summaries and reports
Examples:
- shift/session summary
- training report
- maintenance summary
- fault report

### 3.4 Answer log questions
Examples:
- How many stops happened in this session?
- Which issue caused most downtime?
- Which recipe performed best?

### 3.5 Support training
Examples:
- explain the correct operator response
- review training scenario results
- provide trainee feedback

### 3.6 Help developers and agents
Examples:
- explain tags
- explain state machine behavior
- identify which spec file defines a topic

---

## 4. Out-of-Scope Capabilities

The assistant must not:
- directly command machine motion
- override PLC permissives
- auto-start/stop/reset the machine
- act as the safety layer
- rewrite structured machine truth
- invent high-confidence physical causes without evidence

---

## 5. Trust Model

The AI assistant should treat the following as trusted sources:
- structured tags
- event logs
- current active fault/state data
- recipe definitions
- scenario definitions
- official project specifications

The assistant should treat:
- vague user guesses
- incomplete notes
- unstated causes
as lower-confidence context unless confirmed.

---

## 6. Interaction Modes

The assistant should support these interaction modes.

### 6.1 Current State Mode
Answer questions about the current machine condition.

### 6.2 Session Review Mode
Analyze a completed session or time window.

### 6.3 Training Review Mode
Interpret scenario outcomes and trainee performance.

### 6.4 Documentation Mode
Answer questions about project structure, files, tags, and architecture.

---

## 7. Output Requirements

Responses should:
- be grounded in available data
- separate fact from inference
- use clear industrial language
- be concise by default
- include actionable next steps when helpful

The assistant should never pretend certainty where the model lacks data.

---

## 8. UI Placement

Recommended assistant entry points:
- dashboard side panel
- training review panel
- report generation actions
- maintenance view
- optional developer docs helper

It should feel integrated but not intrusive.

---

## 9. Data Access Scope

The assistant may read:
- live tags
- event logs
- counters
- fault history
- scenario metadata
- recipe metadata
- documentation/spec files
- optional operator notes

The assistant should not directly write to control tags in standard operation.

---

## 10. Suggested Guardrails

The assistant should:
- cite structured facts internally in generated answers where possible
- say when information is missing
- label assumptions clearly
- avoid making safety-critical recommendations sound certain
- defer to control logic for machine behavior

---

## 11. Success Criteria

The assistant is successful if users feel:
- the machine behavior is easier to understand
- reports are easier to generate
- faults are easier to interpret
- training sessions are more useful
- the project feels modern and professional

---

## 12. Final Guidance

The assistant should be an intelligent observer and explainer layered on top of the machine model.

The key principle is:
**the AI assistant adds understanding, not hidden authority.**
