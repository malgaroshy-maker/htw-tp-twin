# Training Scenarios Specification

## 1. Purpose

This document defines the training scenario system for the tray packer digital twin project.

Training scenarios make the simulator more useful as:
- a learning tool
- a troubleshooting trainer
- a guided demo platform
- an AI-assisted review environment

---

## 2. Design Goals

Scenarios should:
- be easy to define
- create believable abnormal conditions
- support operator learning
- support AI review and reporting
- work without deep physics or real hardware

---

## 3. What a Scenario Is

A scenario is a structured training or demo situation that changes machine conditions over time.

Examples:
- product starvation after normal running
- blank supply interruption
- downstream block
- high reject session
- repeated jam challenge

A scenario can:
- force external conditions
- modify probabilities
- inject events
- define training goals

---

## 4. Minimum Scenario Fields

| Field | Type | Description |
|---|---|---|
| scenario_id | string | Unique identifier |
| scenario_name | string | Human-readable name |
| description | string | What the scenario teaches |
| goals | list | Learning or demo goals |
| initial_recipe | string | Starting recipe |
| steps | list | Ordered scenario steps |
| success_criteria | list | How to judge successful completion |

---

## 5. Scenario Step Model

Each step may contain:
- trigger type
- trigger condition
- action
- duration
- notes

Trigger examples:
- elapsed time
- cycle count reached
- machine state reached
- fault cleared
- manual operator action

Action examples:
- set `product_available = false`
- set `blank_available = false`
- set `downstream_available = false`
- increase reject probability
- inject jam event

---

## 6. Recommended V1 Scenario Types

### 6.1 Product Starvation Scenario
Goal:
teach recognition of upstream loss and recovery

### 6.2 Blank Supply Interruption
Goal:
teach stop fault recognition and reset workflow

### 6.3 Downstream Block Scenario
Goal:
teach blocked-state interpretation

### 6.4 High Reject Scenario
Goal:
teach difference between reject-only events and stop faults

### 6.5 Mixed Session Scenario
Goal:
combine multiple issues in a realistic training run

---

## 7. Example Scenario Structure

```json
{
  "scenario_id": "blank-interruption-01",
  "scenario_name": "Blank Supply Interruption",
  "description": "The machine runs normally, then loses blank supply at cycle start.",
  "goals": [
    "Recognize stopping fault",
    "Restore supply",
    "Perform correct reset"
  ],
  "initial_recipe": "24-pack",
  "steps": [
    {
      "trigger": {"type": "elapsed_sec", "value": 20},
      "action": {"type": "set_input", "name": "blank_available", "value": false}
    }
  ],
  "success_criteria": [
    "Operator identifies BLANK_MISSING",
    "Blank supply restored",
    "Reset performed successfully"
  ]
}
```

---

## 8. Scenario UI Needs

The dashboard/training view should be able to show:
- scenario name
- scenario objective
- current active step
- current abnormal condition
- trainee actions
- final outcome

---

## 9. AI Use in Scenarios

The AI layer should help with:
- scenario explanation
- hint generation
- trainee feedback
- session review
- training report generation

---

## 10. Final Guidance

Scenarios should be simple, structured, and educational.

The key rule is:
**a scenario should teach or demonstrate something specific about machine behavior.**
