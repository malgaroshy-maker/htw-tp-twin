# Tray Packer Digital Twin — Simulation Alignment Notes

This file compares the current type of digital twin approach with the machine behavior described in the manuals and identifies the best next upgrades.

---

## 1. What the Current Twin Already Gets Right

The current project already gets several important things right:
- behavioral state-machine approach instead of fake decorative animation
- grouping, blank feed, packing, and discharge as separate high-level phases
- fault/warning ideas already exist
- reject / blank / downstream concepts already exist
- a diagnostics mindset is already present in the UI
- PLC-style controller separation already exists

This is a strong base.

---

## 2. What Is Still Too Simplified

### 2.1 Grouping is too abstract
The real machine groups via:
- lane distribution
- stopper
- terminal
- lane fill monitoring
- divider correction

The twin should stop treating grouping as only “render N products in a block”.

### 2.2 Transfer is too generic
The real machine uses:
- gap-checked infeed pusher / chain slide-in
- short-stroke transfer
- homed mechanical sequence

The twin should replace the idea of a long generic pusher with a short interlocked transfer stage.

### 2.3 Blank feed is too simple
The real machine has:
- tray magazine
- cross transfer
- suction arm
- blank holders
- tray monitoring

The twin should give blank feed its own sensor-backed sequence.

### 2.4 Forming/discharge could be more sensor-informed
The real machine includes:
- tray-position-triggered glue release
- transport chain clearance check
- open tray flap detection near discharge

The twin should not just “spawn output”; it should use clearer outlet decision logic.

### 2.5 Warning vs fault semantics need stronger alignment
The manuals clearly distinguish:
- fault / red / stop / reset required
- warning / yellow / may escalate
- note / blue / state only

The twin should enforce this more consistently.

---

## 3. Best Next Upgrade Direction

The next major upgrade should be:

## Sensor-informed, PLC-friendly behavioral simulation

Meaning:
- not physics
- not cinematic animation
- not raw PLC code yet
- but a machine sequence justified by virtual sensors and interlocks

This is the right bridge toward future Siemens PLC control.

---

## 4. Highest-Priority Changes

### Priority 1 — Lane / grouping realism
Add virtual lane logic for:
- lane fill counts
- lane fill mismatch
- stopper / terminal behavior
- release of a captured formation

### Priority 2 — Transfer interlock realism
Add:
- pusher gap clear condition
- short slide-in transfer sequence
- clear boundary between grouping and transfer

### Priority 3 — Blank/tray preparation realism
Add:
- magazine available state
- tray transfer / blank-ready state
- suction arm sequence
- tray present before forming

### Priority 4 — Discharge/reject realism
Add:
- full discharge travel
- reject divergence and accumulation
- transport chain clearance faulting
- open flap detection as a discharge-side quality decision

### Priority 5 — Alarm semantics alignment
Add or refine:
- warnings that can escalate
- latched red faults that require reset
- blue note/state indicators

---

## 5. Suggested Ownership by Layer

### Simulator backend
Owns:
- virtual sensor truth generation
- sequence/interlock rules
- warnings/faults based on machine behavior
- discharge/reject accumulation behavior

### Controller / PLC-style logic
Owns:
- permissives
- command gating
- reset rules
- HMI helper flags
- later PLC tag mapping

### Dashboard / diagnostics
Owns:
- showing sensor states
- showing warnings/faults/notes clearly
- visualizing sequence stages
- exposing dev/test inputs safely

---

## 6. Best First Implementation Chunk

The best first chunk is:

### Virtual sensor + sequence upgrade for:
- lane fill / lane control
- stopper / terminal release
- pusher gap control
- tray present / blank ready
- discharge / reject clearance

This chunk gives the highest realism gain while staying manageable.

---

## 7. Suggested Simplification Policy

Keep simplified:
- exact servo motion profiles
- physical forces / collisions
- millisecond-level axis motion
- full pneumatic timing details

Improve now:
- sequence permission logic
- sensor-backed transition rules
- warning/fault escalation
- clearer diagnostics and machine visualization

---

## 8. Best Use of This File by an Agent

An agent should use this file to decide:
- which current machine behaviors are acceptable simplifications
- which ones should be replaced now
- what the next architecture upgrade should focus on
- how to keep the twin both realistic and buildable
