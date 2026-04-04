# Project Context for Agents

## 1. Project Summary

This repository contains a simplified tray packer digital twin platform.

It combines:
- a Python animated simulator
- a PLC-style control model
- an HMI/dashboard design
- structured tags, events, logs, and reports
- AI features for explanation, reporting, and training

The project is intentionally **behavioral**, not a full motion-accurate OEM twin.

---

## 2. What This Project Is Trying to Achieve

The goal is to build a machine simulation platform that:
- looks and behaves like a real industrial tray packer from the outside
- is simple enough to build without hardware
- supports PLC/HMI style control thinking
- supports AI analytics and reporting
- can later connect to Siemens-style tooling

---

## 3. Core Project Principles

1. behavioral realism over full mechanical realism
2. structured tags as shared truth
3. event logs as system memory
4. AI as explainer, not controller
5. stable specs drive consistent vibe coding
6. simulator and controller have separate responsibilities

---

## 4. What Agents Should Avoid

Agents should avoid:
- adding exact servo-motion complexity unless requested
- inventing hidden OEM internals
- bypassing the tag contract
- making AI directly control the machine
- adding features that conflict with the state machine or PLC control spec

---

## 5. Core Specs To Respect First

If there is a conflict, agents should prioritize:
1. `PRD.md`
2. `Simulation_Specifications.md`
3. `State_Machine_Spec.md`
4. `Tag_Interface_Spec.md`
5. `PLC_Control_Spec.md`
6. `HMI_Spec.md`
7. `Fault_Model.md`
8. `Recipe_Model.md`

---

## 6. Main Product Layers

### Simulator Layer
Python-based machine behavior and animation

### PLC/Control Layer
High-level control logic, permissives, reset rules, recipe gating

### HMI/Dashboard Layer
Operator-facing screens and controls

### AI Layer
Explains, summarizes, compares, and reviews

### Logging/Analytics Layer
Stores events, counters, sessions, reports

---

## 7. What “Done Well” Looks Like

A strong implementation should:
- feel industrial
- stay understandable
- match the written specs
- expose machine behavior through stable tags/events
- support future expansion without rewrite

---

## 8. Recommended Development Order

1. shared models and configs
2. simulator engine
3. live dashboard/HMI
4. logging/events
5. AI features
6. PLC-style bridge/integration
7. training scenarios and polish

---

## 9. Final Guidance

Agents should treat this project as a structured product build, not a loose prototype.

The key principle is:
**implement what the operator sees and what the logs prove, not what the hidden mechanics might theoretically do.**
