# AI Features Specification

## 1. Purpose

This document defines the AI-powered features for the simplified tray packer digital twin platform.

The AI layer exists to improve:
- understanding
- reporting
- training
- troubleshooting
- exploration of logs and performance

The AI layer is **not** part of the core machine control loop.

---

## 2. AI Design Philosophy

The AI should act as:
- an analyst
- an explainer
- a training copilot
- a reporting assistant

The AI should **not** act as:
- a motion controller
- a safety controller
- an autonomous operator
- a hidden source of machine truth

Structured system data remains the source of truth.
The AI interprets that data.

---

## 3. Main AI Feature Categories

The project should support these AI feature groups:

1. Fault explanation
2. Shift/session summary generation
3. Log and event Q&A
4. Recipe performance comparison
5. Training scenario interpretation
6. Maintenance-oriented reporting
7. Developer/documentation assistance

---

## 4. Core AI Features

## 4.1 Fault Explanation Assistant

### Purpose
Explain abnormal conditions in plain engineering language.

### Example questions
- Why did the machine stop?
- What does Blank Missing mean?
- What should the operator check first?
- Is this a stop fault or only a reject issue?

### Inputs
- current machine state
- fault code/text
- last events
- diagnostics/availability tags
- fault model definitions

### Outputs
- simple explanation
- effect on machine
- suggested operator action
- whether reset is required
- whether production can continue

---

## 4.2 Shift / Session Summary Generator

### Purpose
Generate readable technical summaries from structured simulator sessions.

### Example outputs
- operator shift summary
- maintenance summary
- training session summary
- end-of-demo report

### Inputs
- counts
- downtime
- fault events
- reject events
- active recipe history
- scenario metadata
- optional operator notes

### Outputs
- concise narrative summary
- top downtime causes
- reject summary
- recovery notes
- performance highlights

---

## 4.3 Log Query Assistant

### Purpose
Allow natural-language analysis of recorded sessions.

### Example questions
- What were the main downtime causes today?
- Which recipe had the highest reject rate?
- How many times did the machine starve?
- What happened before the last jam?

### Inputs
- structured event logs
- counters
- fault history
- recipe metadata
- training scenario metadata

### Outputs
- direct answer
- relevant statistics
- short explanation
- optional chart/report suggestion

---

## 4.4 Recipe Comparison Assistant

### Purpose
Explain differences in performance between recipes.

### Example questions
- Why did the 30-pack run slower?
- Which recipe caused more rejects?
- Which recipe had the most stable session?

### Inputs
- recipe model
- session statistics by recipe
- event history by recipe

### Outputs
- structured comparison
- likely reasons based on configured values and observed performance
- recommendations for training/demo interpretation

---

## 4.5 Training Scenario Assistant

### Purpose
Help users understand and review training sessions.

### Example questions
- What was the correct response in this scenario?
- What did the operator do wrong?
- Which training scenario should be used next?
- Summarize the session as a training report.

### Inputs
- scenario definition
- machine events
- faults
- timing of operator responses
- outcome metrics

### Outputs
- scenario explanation
- guidance
- post-session feedback
- training report

---

## 4.6 Maintenance Report Assistant

### Purpose
Produce maintenance-focused interpretations from session logs.

### Example outputs
- fault-by-fault summary
- downtime by cause
- jam recovery notes
- recommended checks for repeated issues

### Inputs
- fault counts
- downtime
- repeated events
- recent resets and recoveries
- optional maintenance note input

### Outputs
- maintenance summary
- likely high-impact issues
- repeated abnormal patterns
- recommended follow-up items

---

## 4.7 Developer / Documentation Assistant

### Purpose
Support project development and understanding.

### Example uses
- explain tags
- explain state transitions
- explain which file defines what
- generate test case suggestions
- summarize architecture

### Inputs
- project specs
- tag model
- state machine
- decisions and assumptions docs

### Outputs
- developer guidance
- navigation help
- implementation suggestions
- documentation summaries

---

## 5. AI UI Entry Points

The AI should be accessible through:
- dashboard side panel
- report generation actions
- training review screen
- log query panel
- optional maintenance app panel

The AI should not be hidden only inside developer tools.
It should feel like a real product feature.

---

## 6. Recommended First AI Deliverables

Phase 1 AI features should be:

1. Fault explanation
2. Session summary generation
3. Basic log Q&A

These provide the highest value with the lowest complexity.

---

## 7. Suggested Example Prompts

### Fault explanation
- Why did the machine stop?
- Explain the current fault.
- What should the operator do next?

### Reporting
- Summarize this session.
- Generate a maintenance summary.
- Write a short shift report.

### Analytics
- What caused the most downtime?
- Compare the recipes used today.
- Why were rejects higher in this run?

### Training
- Explain what happened in this training scenario.
- What should the trainee have done?
- Create a short training report.

---

## 8. Data Inputs Required by AI

The AI should prefer structured data from:
- machine state tags
- cycle phase tags
- counters
- fault tags
- event logs
- recipe definitions
- scenario definitions
- decisions/assumptions docs
- glossary/domain docs

Optional additional input:
- manual notes from operator/maintenance user

---

## 9. Output Style Guidance

AI responses should be:
- clear
- industrial/professional
- concise by default
- grounded in system data
- explicit about uncertainty

The AI should distinguish between:
- observed facts
- likely interpretation
- assumptions
- missing information

---

## 10. Safety / Boundaries

The AI must not:
- bypass permissives
- autonomously start/stop/reset the machine
- override fault logic
- pretend to know machine truth when data is missing
- invent industrial causes beyond the defined model without labeling them as inference

The AI may:
- suggest checks
- explain conditions
- summarize sessions
- propose training scenarios
- highlight patterns in data

---

## 11. AI Source of Truth Hierarchy

When generating answers, the AI should prioritize:

1. live structured tags
2. event logs
3. fault model
4. state machine spec
5. recipe model
6. scenario definitions
7. project assumptions/docs
8. user free-text notes

This prevents hallucination and keeps the assistant grounded.

---

## 12. AI Feature Success Criteria

The AI layer is successful if it can:
- explain stop causes correctly
- generate useful summaries from session data
- answer common operational questions accurately
- support training reviews
- stay aligned with structured machine truth

---

## 13. Implementation Notes

The AI layer can be implemented with:
- prompt templates
- structured context assembly
- event/log summarization pipelines
- document retrieval over project specs
- local or remote model backends

The AI does not require direct simulator embedding.
A separate AI service/module is preferred.

---

## 14. Future AI Extensions

Later versions may add:
- trend anomaly commentary
- recipe tuning suggestions
- scenario generation from goals
- maintenance note auto-classification
- multi-session benchmarking
- voice interface or spoken summaries

These are not required in the first implementation.

---

## 15. Final Guidance

The AI layer should make the project feel modern, useful, and much more than a simple simulation.

The key principle is:
**AI should explain and analyze the machine, not secretly become the machine controller.**
