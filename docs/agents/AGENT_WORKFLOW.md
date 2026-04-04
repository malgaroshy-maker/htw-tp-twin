# Agent Workflow

## Purpose

This file explains how coding agents should work inside this repository.

The project is specification-driven. Agents should implement features against the written specs rather than improvising architecture.

## Required reading order

Before changing code, agents should read in this order:

1. `docs/specs/PRD.md`
2. `docs/specs/Simulation_Specifications.md`
3. `docs/specs/State_Machine_Spec.md`
4. `docs/specs/Tag_Interface_Spec.md`
5. `docs/specs/Fault_Model.md`
6. `docs/specs/Recipe_Model.md`
7. `docs/specs/PLC_Control_Spec.md`
8. `docs/specs/HMI_Spec.md`
9. `docs/specs/AI_Features_Spec.md`
10. `docs/specs/Decisions_and_Assumptions.md`

## Core rules

- Do not add full mechanical or servo-motion complexity unless explicitly requested.
- Treat structured tags and events as the source of truth.
- Keep simulator, control, and AI responsibilities separate.
- Do not let AI directly control the machine in normal operation.
- Prefer small, testable modules with stable names.

## Implementation priority

1. Shared enums/models
2. Simulator state machine
3. Simulator cycle logic
4. Fault and reject behavior
5. API surface for status/commands
6. Dashboard integration
7. AI context assembly and prompt pipelines
8. Industrial protocol bridges

## Coding style expectations

- Use typed Python where possible.
- Prefer dataclasses or Pydantic-style models for shared structures.
- Keep files focused and small.
- Add docstrings to public classes/functions.
- Avoid hidden magic behavior.

## When adding features

Every major feature should answer:
- Which spec file defines it?
- Which layer owns it?
- Which tags/events does it use?
- How will it be tested?

## Testing guidance

At minimum, add or update tests for:
- state transitions
- fault handling
- command validation
- tag consistency
- event creation
