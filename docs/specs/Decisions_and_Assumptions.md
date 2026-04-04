# Decisions and Assumptions

## 1. Purpose

This document captures key project decisions and assumptions so future implementation stays aligned.

---

## 2. Key Decisions

### Decision 1
The project will model a **single tray packer**, not a full packaging line.

### Decision 2
The machine model will be **behaviorally realistic but mechanically simplified**.

### Decision 3
The simulator will initially be built in Python with a simple animated 2D view.

### Decision 4
The PLC layer will be **high-level control logic**, not full servo-motion or OEM-equivalent machine code.

### Decision 5
The HMI/dashboard will follow a **WinCC Unified-style industrial UX**, but remain implementation-agnostic.

### Decision 6
The connection model will begin with a shared internal/software interface and later support OPC UA and other bridges.

### Decision 7
AI is included as a core project feature for:
- reporting
- troubleshooting
- training
- analytics

### Decision 8
AI will remain outside the control loop and should not directly command the machine in standard architecture.

---

## 3. Main Assumptions

### Assumption 1
There is no physical PLC or real machine hardware available for the first implementation.

### Assumption 2
The project should still feel professional and industrial even without hardware.

### Assumption 3
Exact OEM internals, servo cam tables, and detailed motion physics are not required for V1.

### Assumption 4
Structured tags and event logs are sufficient to support useful AI features.

### Assumption 5
The repo is intended for agent-assisted development, so specs must be explicit and stable.

---

## 4. Scope Assumptions

The first strong version should include:
- simulator
- dashboard/HMI
- logging/events
- AI explanation/reporting foundation
- PLC-style specs and tag contract

Not all later integrations need to be fully implemented in the first coding phase.

---

## 5. Final Guidance

If future contributors want to change a major project direction, this file should be updated along with the affected specs.

The key principle is:
**keep the project intentionally simplified, but never vague.**
