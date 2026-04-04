# Meurer CM/HTW Tray Packer — Machine Sequence from Manuals

This file summarizes the real machine sequence from the uploaded training PDFs so an agent can align the digital twin with the actual machine logic.

Primary sources:
- `OT traypacker HTW CBOB (1).pdf`
- `HTW_sensors (2).pdf`
- `365257_18_OI.pdf`

---

## 1. Big Picture Machine Flow

The machine is best understood as a monitored sequence of sections:

1. **Infeed / lane distribution**
2. **Grouping in transport lanes**
3. **Release by stopper + terminal**
4. **Short transfer by chain slide-in / infeed pusher**
5. **Tray magazine / cross transfer / tray infeed**
6. **Main transport chains for forming / gluing / folding**
7. **Discharge / reject / open flap detection**

The current digital twin should treat these as distinct mechanisms, not as one long generic conveyor push.

---

## 2. Divider / Lane Distribution

### Mechanical behavior
From the training document:
- The **separator and divider** distribute the incoming single-track products into several lanes.
- The separator generates the gap needed for counting products and for swinging the divider.

### Implication for simulation
- Incoming product should not jump directly into a complete grouping matrix.
- A **lane distribution stage** should exist before grouping is considered complete.
- The divider should be modeled as a lane-feeding mechanism, not just decoration.

### Source pages
- OT traypacker HTW CBOB (1).pdf — **Page 9**

---

## 3. Grouping Logic

### Mechanical behavior
From the training document:
- Products move through **individual transport lanes** until they reach a **closed stopper**.
- To transfer the grouped product information to the chain slide-in, the **terminal closes** and the **stopper opens**.
- Only the products between the stopper and terminal are transported forward.
- Filling of the lanes is monitored by a **light sensor** and corrected by the divider if required.

### Implication for simulation
The grouping model should include:
- lanes with fill state
- a stopper at lane exit
- a terminal/clamp that isolates a product formation
- a release event where only the captured formation advances

This means:
- grouping completion should be based on lane fill and lane release conditions
- the grouping area should not behave like a static rectangular buffer only

### Source pages
- OT traypacker HTW CBOB (1).pdf — **Page 10**

---

## 4. Chain Slide-In / Infeed Pusher Transfer

### Mechanical behavior
From the training document:
- The grouped product information is accepted by the **slide-in bars** of the **chain slide-in** and moved to the tray.
- The gap required for lowering the slide-in bars is monitored through a sensor.

From the sensor training document:
- There is a **gap control sensor** for the **infeed pusher** that checks whether there is a package below the pusher plate before the pusher sinks.

### Implication for simulation
The digital twin should stop showing a single long pusher motion across the whole machine.
Instead:
- grouping capture happens first
- a **short-stroke transfer** happens next
- transfer should only be permitted when the gap / pusher area is clear

Suggested sequence:
1. terminal closes
2. stopper opens
3. short transfer window created
4. slide-in bars descend
5. slide-in stroke pushes formation to tray/transport section
6. bars retract

### Source pages
- OT traypacker HTW CBOB (1).pdf — **Page 11**
- HTW_sensors (2).pdf — **Page 4**

---

## 5. Tray Magazine / Cross Transfer / Blank Feed

### Mechanical behavior
From the training document:
- The **tray magazine** is filled with tray blanks during production.
- There should be a gap between blank stacks.
- The magazine includes **roll conveyor**, **cross conveyor**, and **end stop**.

From the tray infeed page:
- The **suction arm** helps the tray blanks reach the guiding shaft and be stored before tray transport.
- Vacuum is generated at the suction cups.
- In the lower end position, low pressure generation is shut down.
- The **blank holders** maintain the tray side plates after storing.
- A tray-monitoring sensor checks actual tray availability before tray transport.

### Implication for simulation
Blank feed should not be a simple rectangle appearing above the forming zone.
It should have a sequence like:
1. blank stack available in magazine
2. transfer from magazine/cross conveyor
3. suction arm picks one blank
4. suction arm moves blank to tray path
5. blank holder / tray-ready state becomes true
6. transport to main chain section begins

### Source pages
- OT traypacker HTW CBOB (1).pdf — **Page 12**
- OT traypacker HTW CBOB (1).pdf — **Page 13**

---

## 6. Main Transport Chains / Forming / Gluing

### Mechanical behavior
From the training document:
- The tray blank and product formation are taken over by the **transport chains**.
- The side guiding extends while accepting the product formation.
- During transport, tray plates are glued by applicator heads.
- In the end, tray plates are folded by tray guiding and the cover feeder.
- The tray plates are pressed in by the carrier of the transport chains.

### Implication for simulation
After slide-in transfer, motion should feel **chain-driven**, not push-driven.
This area should visually/behaviorally represent:
- chain transport takeover
- forming/folding guidance
- glue release positions
- transition toward discharge

### Source pages
- OT traypacker HTW CBOB (1).pdf — **Page 14**

---

## 7. Discharge / Open Flap / Reject

### Mechanical behavior
From the training document:
- **Open tray flap detection** checks for unsealed tray flaps.
- If an unsealed tray is detected by tray plate sensors, a message is given to the machine control.
- The control system decides how the unsealed tray is handled.

From the sensor training document:
- **Gap control in the transport chain** can force an immediate stop if a tray is at a forbidden position.
- **Open tray flap detection** sensors monitor the discharge side.

### Implication for simulation
Reject and discharge logic should be at the outlet side.
The digital twin should support:
- successful discharge to end of outfeed conveyor
- rejected discharge into reject lane/bin
- accumulation / blockage / stop conditions at the reject or discharge end
- open flap as a reject / alarm cause near discharge, not earlier in the machine

### Source pages
- OT traypacker HTW CBOB (1).pdf — **Page 16**
- HTW_sensors (2).pdf — **Page 8**

---

## 8. HMI / Alarm Behavior Semantics

From the operating instruction manual:
- **Red = fault** → machine stop, fault must be fixed, then **Reset** is required.
- **Yellow = warning** → machine does not stop immediately; if the cause is corrected, warning resets automatically; if not corrected, it may become a fault later.
- **Blue = note/state** → state indication only; automatically resets when the state/cause is gone.

### Implication for simulation
The digital twin should distinguish clearly between:
- direct faults (immediate stop)
- warnings that can escalate
- notes/state indicators

This is especially important for:
- blank shortage
- reject accumulation near full vs full
- lane fill mismatch
- downstream blockage developing into a stop

### Source pages
- 365257_18_OI.pdf — **Control panel / troubleshooting pages around 6-49 to 6-52 and 9-7 to 9-8**

---

## 9. Recommended Sequence Model for the Digital Twin

A better behavioral model for the twin is:

1. **Infeed active**
   - products enter
   - divider/lane logic distributes them

2. **Lane fill monitoring**
   - count sensor increments per lane
   - lane control checks actual fill vs expected fill

3. **Grouping ready**
   - stopper closed
   - terminal open while filling
   - when formation ready, terminal closes and stopper opens

4. **Transfer permitted**
   - pusher/slide-in gap sensor confirms clear space
   - short stroke transfer executes

5. **Tray ready**
   - blank stack present
   - suction arm sequence succeeds
   - tray detected and held ready

6. **Forming/transport active**
   - chains take formation + tray blank
   - glue release sensors and forming guidance are active

7. **Discharge decision**
   - outfeed clear → good pack exits fully
   - reject/open flap → pack diverts to reject path
   - reject bin full or discharge blocked → warning/fault escalation as appropriate

---

## 10. What the Current Twin Should Replace First

Highest-priority simplifications to replace:

1. **Simple grouping fill only** → replace with lane fill + stopper + terminal logic
2. **Long generic pusher** → replace with short slide-in transfer logic
3. **Blank rectangle spawn** → replace with tray magazine + suction arm + tray ready state
4. **Instant discharge disappear** → replace with full discharge path and reject handling at outlet
5. **Flat phase transitions only** → support sensor/interlock-permitted transitions

---

## 11. Best Use of This File by an Agent

If an agent uses this file, it should:
- treat it as the primary behavioral sequence reference
- map the current simulator phases onto this sequence without overcomplicating physics
- design a virtual sensor/interlock model that supports future Siemens PLC mapping
- keep the twin deterministic, testable, and industrially believable
