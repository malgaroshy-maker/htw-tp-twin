# Roadmap

## Project Name
Simplified Tray Packer Digital Twin Platform

## Roadmap Purpose
This roadmap defines the phased development plan for building a simplified but behaviorally realistic tray packer digital twin platform. It is intended to guide human development and AI coding agents working in OpenCode.

The project combines:
- a Python animated machine simulator
- PLC-style machine control concepts
- a web dashboard
- AI-assisted fault explanation, reporting, and training support
- a future integration path for Siemens PLC/HMI or PLCSIM

## Roadmap Principles
- Prioritize behavioral realism over mechanical fidelity.
- Build the simulator first as the source of machine behavior.
- Keep the control, simulator, UI, and AI layers modular.
- Define clean interfaces before implementing integrations.
- Prefer shipping usable vertical slices over overengineering the first release.
- Keep all assumptions explicit and versioned.

## Release Strategy
The project is divided into 5 phases:
1. Foundation and specifications
2. Core simulator MVP
3. Dashboard and AI foundation
4. PLC/HMI control layer and simulator integration
5. Polish, validation, and portfolio packaging

---

# Phase 0 — Foundation and Definition

## Goal
Establish a strong specification and repo structure so agents can build consistently.

## Deliverables
- PRD
- simulation specifications
- architecture documentation
- state machine specification
- tag interface specification
- fault model
- recipe model
- roadmap and task files
- agent context files

## Success Criteria
- project scope is locked
- V1 simplifications are explicit
- simulator inputs and outputs are defined
- app and AI scope are defined
- PLC/HMI scope is defined at specification level

## Risks
- unclear boundaries between simulator and controller
- trying to simulate too much too early
- AI scope becoming vague or too broad

---

# Phase 1 — Core Simulator MVP

## Goal
Build a working behavioral tray packer simulator that is visually understandable and operationally realistic.

## Core Features
- machine state model
- product infeed and grouping behavior
- blank availability logic
- pack cycle behavior
- good pack and reject flow
- common faults
- recipe selection
- operator controls: start, stop, reset, run empty
- animation and status panel
- structured event logging

## Recommended Implementation
- Python
- Pygame for animation
- JSON or YAML for recipe and fault configuration
- CSV or SQLite for event and production logs

## Deliverables
- simulator engine
- renderer/animation layer
- state machine module
- recipe config file(s)
- fault injection framework
- event logger
- basic simulator readme

## Success Criteria
- machine can run through repeated cycles
- recipes change throughput behavior
- faults can stop, block, or reject packs
- run-empty works as expected
- logs capture key events and counters
- animation clearly shows machine flow

## Out of Scope for This Phase
- exact motion synchronization
- exact servo/cam simulation
- full PLC implementation
- full HMI implementation
- advanced AI interaction

## Demo Milestone
A user can start the simulation, change recipes, trigger common conditions, observe rejects/faults, and understand the machine flow visually.

---

# Phase 2 — Simulator Hardening and Configuration

## Goal
Make the simulator configurable, testable, and ready to support apps and AI features.

## Core Features
- formalized event schema
- persisted production sessions
- scenario loading
- richer recipe definitions
- improved fault and recovery model
- simulation parameter editor or config-driven tuning
- automated tests for state transitions and counters

## Deliverables
- event schema documentation
- production session model
- scenario definitions
- test suite for simulator logic
- deterministic mode for test/replay
- simulator API contract for external apps

## Success Criteria
- simulator behavior is reproducible in test mode
- scenarios can be loaded without code changes
- logs are structured enough for AI and dashboard features
- state transitions are validated by tests

## Demo Milestone
A developer can load different scenarios such as starvation, missing blank, or downstream block and get predictable logs and counters.

---

# Phase 3 — Dashboard and AI Foundation

## Goal
Create a modern app layer that visualizes machine status and uses AI for explanation, reporting, and training.

## Core Features
- web dashboard
- live machine overview panel
- counters and KPIs
- fault timeline
- session summary
- AI shift summary generator
- AI fault explanation assistant
- AI training scenario descriptions

## Recommended Implementation
- React web app
- simple backend or local API bridge
- structured simulator event feed
- AI service wrapper with prompt templates and context packer

## Deliverables
- dashboard app spec
- dashboard implementation
- event viewer
- AI features spec
- AI assistant scope doc
- prompt templates
- reporting templates

## Success Criteria
- live simulator state can be viewed in the app
- a completed session can generate a readable shift report
- a user can ask about a fault and receive a grounded explanation
- AI responses use structured machine context rather than guessing

## Out of Scope for This Phase
- direct AI control of the machine
- safety-critical recommendations
- real PLC connectivity

## Demo Milestone
A user can run the simulator, open the dashboard, see live state/counters, then generate an AI summary of what happened.

---

# Phase 4 — PLC/HMI Layer and Integration Path

## Goal
Add a clean PLC-style control model and define or implement the interface to the simulator.

## Core Features
- PLC state/control specification
- tag list and tag contract
- Siemens Structured Text style control design
- HMI screen specification
- simulator ↔ controller connection contract
- OPC UA or MQTT integration plan
- optional lightweight mock PLC service for development

## Deliverables
- PLC control specification
- PLC tag list
- HMI specification
- HMI screen flow
- PLC-simulator connection specification
- optional ST code skeletons
- optional mock HMI/dashboard bindings

## Success Criteria
- commands and status tags are fully defined
- simulator can be driven through a formal command interface
- future Siemens or PLCSIM integration path is clear
- HMI screen logic aligns with simulator behavior

## Demo Milestone
A simulated control layer can send start/stop/reset/recipe commands and read machine status through the agreed tag interface.

---

# Phase 5 — Training, Analytics, and Portfolio Packaging

## Goal
Turn the project into a polished showcase and training platform.

## Core Features
- scenario library
- training mode
- instructor/demo mode
- richer AI diagnostics
- exportable reports
- portfolio documentation
- architecture diagrams
- demo assets and screenshots
- optional deployment packaging

## Deliverables
- training scenarios spec
- scenario library
- report exports
- demo guide
- screenshots and GIFs
- architecture visuals
- polished README and portfolio case study

## Success Criteria
- project can be demonstrated clearly to recruiters, engineers, or supervisors
- core user journeys are documented
- AI outputs are useful and grounded
- simulator looks intentional and professional

## Demo Milestone
The repo is ready to show as a complete industrial software portfolio project with simulator, dashboard, AI, and PLC/HMI design path.

---

# Cross-Phase Workstreams

## Workstream A — Machine Behavior
Focus:
- states
- cycle logic
- recipes
- counters
- fault behavior
- rejects

## Workstream B — Visualization
Focus:
- animation
- machine layout clarity
- status panels
- dashboard UX
- HMI screen definitions

## Workstream C — Data and Events
Focus:
- event schema
- logging
- sessions
- analytics inputs
- replay and test support

## Workstream D — AI Layer
Focus:
- structured context assembly
- fault explanation
- session summary
- training scenarios
- prompt templates and grounding rules

## Workstream E — Control and Integration
Focus:
- PLC-style logic
- tag list
- command/status contract
- OPC UA/MQTT readiness
- future Siemens integration

---

# Recommended Execution Order for OpenCode Agents

## First Priority
- finalize specs
- implement core simulator state machine
- implement animation
- implement logging

## Second Priority
- stabilize configs and tests
- create event schema
- build dashboard shell
- build session summary flow

## Third Priority
- build AI explanation and reporting features
- build scenario support
- refine app UX

## Fourth Priority
- produce PLC/HMI specs and ST skeletons
- implement connection contract
- test end-to-end control flow

## Fifth Priority
- polish
- validate
- create demos and documentation

---

# Suggested Milestones

## Milestone M1 — Playable Simulator
A user can run a local animated tray packer simulator with recipes, faults, and counters.

## Milestone M2 — Scenario-Driven Simulator
The simulator supports reproducible scenarios and structured event logs.

## Milestone M3 — Dashboard + AI Summary
A web app shows live status and can generate AI shift summaries.

## Milestone M4 — PLC/HMI Interface Ready
The simulator can be driven through a defined PLC-style interface and corresponding HMI specs exist.

## Milestone M5 — Portfolio-Ready Platform
The project includes simulator, dashboard, AI features, documentation, and polished demos.

---

# Main Dependencies
- machine state and event model must be defined before dashboard and AI work
- event schema must be stable before AI/reporting quality improves
- tag interface must be defined before PLC/HMI integration work begins
- recipe/fault models must be stable enough before advanced scenario generation

---

# Main Risks and Mitigations

## Risk: Simulator becomes too mechanically detailed
Mitigation:
- enforce behavioral-model scope in specs
- defer motion-accurate work indefinitely unless truly needed

## Risk: AI outputs become ungrounded
Mitigation:
- use structured logs and definitions as context
- keep AI out of control decisions
- define allowed AI use cases clearly

## Risk: Agents generate inconsistent code
Mitigation:
- provide shared docs, schemas, and decisions files
- break work into narrow task files
- keep assumptions explicit

## Risk: PLC scope becomes too ambitious
Mitigation:
- focus on PackML-style control and tag mapping
- treat Siemens implementation as a later integration target

---

# Final Roadmap Positioning
This project should evolve as:
- a behavioral machine simulator
- a digital twin prototype
- an industrial training platform
- an AI-assisted maintenance analytics demo
- a portfolio-grade industrial software project

