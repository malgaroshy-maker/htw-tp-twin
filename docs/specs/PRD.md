# PRD — Simplified Tray Packer Digital Twin Platform

## 1. Overview

### Product name
**Tray Packer Digital Twin Platform**

### Product summary
A simplified industrial digital twin platform for a Meurer-style tray packer that combines:
- a Python animated simulator
- a PLC-style control model
- HMI/dashboard app concepts
- structured event logging
- AI-assisted fault explanation, training, and reporting

The platform is designed to **behave like a real tray packer from an operator and maintenance perspective** without attempting a full mechanical or servo-physics twin.

### Product positioning
This project is simultaneously:
- a **portfolio project**
- a **training simulator**
- a **digital twin prototype**
- an **AI-assisted maintenance analytics demo**

---

## 2. Problem Statement

Real industrial packaging machines are complex to study, expensive to access, and difficult to simulate accurately without hardware, PLC code, OEM know-how, or machine data.

Most existing learning paths are weak in one of these ways:
- too theoretical
- too software-only
- too PLC-only
- too mechanically complex to finish
- not useful for AI-assisted workflows

The goal of this product is to create a **practical, believable, and achievable** machine simulation platform that captures the most important external behavior of a continuous-motion tray packer while remaining simple enough to build with AI coding agents and standard tools.

---

## 3. Product Goals

### Primary goals
1. Simulate the external behavior of a tray packer in a believable way.
2. Provide a clean machine state model similar to PLC/PackML logic.
3. Support recipe-based production behavior.
4. Simulate faults, rejects, downtime, and operator recovery behavior.
5. Provide a visual animated representation of machine flow.
6. Generate structured events and logs for analytics and AI features.
7. Define a PLC/HMI integration model that can later connect to Siemens tools or PLCSIM.
8. Be easy for AI agents in OpenCode to understand and extend.

### Secondary goals
1. Support training scenarios.
2. Support AI-generated shift summaries and troubleshooting help.
3. Support a web dashboard for operations and diagnostics.
4. Serve as a base for future multi-machine or line-level simulation.

---

## 4. Non-Goals

This product will **not** attempt to be:
- an exact OEM machine twin
- a servo-motion physics simulator
- a certified controls project
- a safety system implementation
- a real-time production control system
- a full reverse-engineering of the Meurer PLC program

The platform should simulate **observable industrial behavior**, not exact internal mechanics.

---

## 5. Users

### Primary users
- maintenance technicians
- automation/PLC learners
- industrial software developers
- engineering students or self-learners
- portfolio reviewers / hiring managers

### Secondary users
- operators in training
- technical instructors
- AI coding agents working inside OpenCode

---

## 6. Core Product Components

### 6.1 Simulator Core
A Python-based behavioral machine simulator that models:
- machine states
- product flow
- grouping
- blank availability
- pack cycles
- reject behavior
- fault behavior
- run-empty behavior
- counters and logs

### 6.2 Animated Simulation UI
A simple 2D animated representation of the machine showing:
- infeed
- grouping zone
- blank feed
- pack zone
- outfeed
- reject path
- machine state/status

### 6.3 Dashboard App
A web dashboard that can display:
- live machine state
- current recipe
- counters
- alarms/faults
- event history
- downtime charts
- reject trends
- AI assistant panel

### 6.4 PLC/HMI Layer
A control model that represents:
- PackML-like states
- permissives/interlocks
- commands (start, stop, reset, run empty)
- recipe selection
- counters
- tag mapping
- future Siemens/PLCSIM integration concept

### 6.5 AI Layer
An assistant that sits above the simulator and logs and supports:
- fault explanation
- shift summaries
- downtime interpretation
- training scenario generation
- log Q&A
- guided troubleshooting

---

## 7. Functional Requirements

### 7.1 Machine Behavior
The simulator must:
- represent the machine as a finite-state behavioral model
- support Stopped, Starting, Running, Starved, Blocked, Faulted, Manual, and Run Empty states
- simulate product arrival and grouping
- require enough product for a cycle
- require blank availability for a cycle
- simulate cycle completion with recipe-based timing
- produce good packs or rejected packs
- support common faults and recovery behavior

### 7.2 Recipe Support
The system must:
- support multiple recipes
- allow product count/pattern differences by recipe
- allow cycle time differences by recipe
- allow fault/reject tendencies to vary by recipe
- expose recipe info to UI and logs

### 7.3 Fault Model
The system must support at minimum:
- no product / starvation
- no blank / blank missing
- incomplete formation / reject event
- downstream jam / blocked state
- gap control jam / faulted stop

The system should also support configurable recovery behavior and fault severity.

### 7.4 Logging and Events
The platform must produce structured records for:
- state changes
- cycle start and cycle complete
- good pack complete
- reject event
- fault trigger
- fault reset
- operator command
- recipe change
- downtime intervals

### 7.5 AI Features
The AI layer must be able to:
- summarize a simulated shift
- explain likely fault causes from known machine logic
- answer questions about recent faults and performance
- suggest first checks for common machine issues
- generate training scenarios from known machine behaviors

### 7.6 Dashboard Features
The dashboard should show:
- current state
- current recipe
- good count
- reject count
- fault status
- event log
- trend charts
- scenario controls
- AI assistant panel

### 7.7 PLC/HMI Features
The project must define:
- machine command tags
- machine status tags
- counters/timers
- alarm/fault codes
- HMI screen structure
- a connection model between PLC logic and simulator

---

## 8. Realism Strategy

### Target realism level
**Behaviorally realistic, mechanically simplified**

### What must feel realistic
- machine state changes
- cycle flow
- recipe-dependent speed
- operator start/stop/reset behavior
- rejects vs faults
- downtime patterns
- blocked/starved conditions
- training scenarios
- reporting outputs

### What will be simplified
- servo kinematics
- electronic cam details
- pneumatic physics
- detailed mechanical folding geometry
- exact OEM timing internals
- full low-level PLC implementation

---

## 9. Technical Product Strategy

### Core principle
The machine will be treated as a **behavioral system block** with realistic external behavior.

### Control principle
The control model and simulator are separated:
- **PLC/control layer** sends commands and expects statuses
- **simulator layer** behaves like the machine/process side

### Data exchange principle
The project will define a clear **tag interface contract** for commands, statuses, counters, and events.

### Integration principle
The first implementation may use direct Python interfaces or mocked tags, but the architecture should be compatible with future:
- OPC UA integration
- MQTT integration
- Siemens PLCSIM / HMI concepts

---

## 10. Success Criteria

The project is successful if it can demonstrate all of the following:
1. A user can start, stop, reset, and run-empty the machine.
2. Products visibly flow through a believable tray packer sequence.
3. Different recipes change machine behavior.
4. Faults and rejects occur in believable ways.
5. Logs and counters are usable for analysis.
6. An AI layer can produce useful summaries and explanations from events.
7. The project structure is clear enough for AI agents to continue building it.
8. PLC/HMI integration can be explained cleanly through specs and tags.

---

## 11. MVP Scope

### MVP includes
- one tray packer simulator
- 2D animation
- a small set of machine states
- 3–5 recipes
- 4–6 key faults/reject events
- basic counters and logs
- basic dashboard spec
- basic AI summary/troubleshooting scope
- PLC/HMI tag and screen specs

### MVP excludes
- exact motion control
- multi-machine line simulation
- real Siemens deployment
- advanced historian stack
- full maintenance CMMS workflows
- production-grade authentication/security

---

## 12. Phase Plan

### Phase 1 — Foundation
- finalize PRD and simulation specs
- define state machine
- define tags
- define recipes and faults
- define event schema
- create project architecture docs

### Phase 2 — Simulator MVP
- build Python machine engine
- build animated simulation
- add recipes and faults
- add structured logs
- add configuration files

### Phase 3 — Apps + AI
- build dashboard MVP
- add log viewer and charts
- add AI shift summary
- add AI fault explanation
- add training scenario support

### Phase 4 — PLC/HMI Foundation
- define PLC control model
- define Siemens-style tag mapping
- define HMI screens
- implement a connection layer/mock OPC UA model

### Phase 5 — Polish
- test scenarios
- improve visuals
- improve docs for agents
- improve deployment/dev workflow

---

## 13. Key Risks

### Risk 1: Project becomes too mechanically detailed
**Mitigation:** keep the scope behavioral, not physical.

### Risk 2: AI agents generate inconsistent architecture
**Mitigation:** provide strong specs, glossary, tag contracts, and decisions docs.

### Risk 3: PLC side becomes vague or unrealistic
**Mitigation:** define a clear PackML-like control model and explicit simulator I/O contract.

### Risk 4: AI feature scope becomes too broad
**Mitigation:** limit AI to explanation, reporting, and training support.

---

## 14. Product Principles

1. **Simple enough to finish**
2. **Realistic enough to impress**
3. **Structured enough for AI agents**
4. **Industrial enough to feel authentic**
5. **Modular enough to extend later**

---

## 15. Final Product Definition

A simplified tray packer digital twin platform consisting of a Python animated simulator, PLC-style control model, HMI/dashboard app concepts, structured event logging, and an AI copilot for fault explanation, training scenarios, and automated reporting.
