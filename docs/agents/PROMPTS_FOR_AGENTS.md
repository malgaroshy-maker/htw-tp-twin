# Prompts for Agents

## 1. Simulator Engine Prompt

Build the behavioral tray packer simulator according to the spec files in `docs/specs/`.

Requirements:
- implement the top-level machine states from `State_Machine_Spec.md`
- implement the internal cycle phases from `State_Machine_Spec.md`
- load recipes from `configs/recipes.json`
- use faults from `configs/faults.json`
- emit events matching `Event_Schema.md`
- update the shared tag store defined by `Tag_Interface_Spec.md`

Do not implement full servo physics or exact OEM internals.
Focus on behavioral realism.

## 2. PLC-Style Control Prompt

Implement a PLC-style control layer in Python that:
- validates start permissives
- handles Start / Stop / Reset / Mode / Recipe commands
- writes commands to the shared tag store
- respects `PLC_Control_Spec.md`
- does not duplicate the simulator internals

## 3. Dashboard Prompt

Build a dashboard app aligned with:
- `HMI_Spec.md`
- `HMI_Screen_Flow.md`
- `Dashboard_App_Spec.md`

Requirements:
- Overview page
- Control actions
- Fault banner
- Recipe panel
- Production counters
- AI side panel placeholder

Use the shared API/tag model. Do not invent alternative state names.

## 4. AI Assistant Prompt

Implement an AI context builder and assistant scaffold that:
- reads tags, events, logs, recipes, scenarios, and fault definitions
- supports fault explanation and session summary use cases
- follows `AI_Features_Spec.md` and `AI_Assistant_Scope.md`
- never directly writes control commands

## 5. Test Prompt

Write tests for:
- state transitions
- start permissive logic
- blank missing and jam faults
- reject-only events
- recipe loading
- event generation
