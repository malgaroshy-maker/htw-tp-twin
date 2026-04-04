# Domain Glossary

## 1. Purpose

This glossary defines the main terms used across the project so agents and contributors interpret the industrial language consistently.

---

## 2. Core Terms

### Tray Packer
A packaging machine that groups products and places them into a tray/carton format.

### Behavioral Digital Twin
A simplified model that reproduces the observable behavior of a machine without reproducing all internal physics.

### PackML-like State Model
A machine state approach using clear operational states such as stopped, starting, running, faulted, and held-like conditions.

### Grouping
Accumulating the required number of products before a pack cycle starts.

### Blank
The flat carton or tray material that is fed into the packing process.

### Run Empty
A controlled stop behavior where internal material is cleared before the machine stops fully.

### Starved
State where the machine is waiting because upstream product is unavailable.

### Blocked
State where the machine cannot continue because downstream discharge is unavailable.

### Reject
A bad pack that is counted and routed out without necessarily stopping the machine.

### Fault
A condition that stops the machine or requires intervention.

### Permissive
A condition that must be true before a machine action, such as Start, is allowed.

### Recipe
A structured definition of a pack format, including target count and timing tendencies.

### Event
A structured record of something important that happened in the machine or control flow.

### Session
A bounded run of the simulator used for analysis, training, or reporting.

### Scenario
A structured training or demo condition that changes the machine environment over time.

### HMI
Human-Machine Interface. The operator-facing control and status layer.

### PLC-style Control
High-level industrial control logic for commands, permissives, resets, and mode handling.

### AI Assistant
The analytics/explanation/reporting layer of the project.

---

## 3. Final Guidance

If a new term is introduced later, it should be added here so all agents and contributors stay aligned.
