# Meurer CM/HTW Tray Packer — Sensor Map from Manuals

This file maps the important sensors mentioned in the manuals to machine behavior and digital twin implications.

Primary sources:
- `HTW_sensors (2).pdf`
- `OT traypacker HTW CBOB (1).pdf`

---

## 1. Divider / Lane Distribution Sensors

### 1.1 Min Jam and Falling Down Sensors
- **Section:** Divider / infeed distribution
- **Manual role:** Check if there is a minimum jam in front of the divider and detect a fallen-over package in the lane.
- **Twin meaning:**
  - confirms product presence before lane distribution continues
  - should support starvation / jam / fallen-product warning or fault logic
- **Suggested virtual tags:**
  - `sns.divider_min_jam_ok`
  - `sns.divider_fallen_product`
- **Likely behavior:**
  - if no product where expected → starvation / feed issue
  - if fallen package → direct stop or high-priority fault
- **Source:** HTW_sensors (2).pdf — Page 1

### 1.2 Count Sensor
- **Section:** Divider / lane feed
- **Manual role:** Light barrier counts products into each lane.
- **Twin meaning:**
  - drives lane fill counting
  - should increment actual per-lane count
- **Suggested tags:**
  - `sns.count_pulse`
  - `calc.lane_actual_count[n]`
- **Source:** HTW_sensors (2).pdf — Page 1

### 1.3 Gap Control (divider area)
- **Section:** Divider / turning device to lanes
- **Manual role:** Checks whether there is a pack between the turning device and the lanes.
- **Twin meaning:**
  - used to validate spacing and safe lane feeding
  - may indicate double-feed or bad spacing
- **Suggested tags:**
  - `sns.divider_gap_clear`
- **Source:** HTW_sensors (2).pdf — Page 2

### 1.4 Encoder
- **Section:** Divider / counting correction
- **Manual role:** Measures package length without a gap from the counting sensor and transmits to controller; if controller detects 2 packs together, count sensor gets an extra counting signal.
- **Twin meaning:**
  - supports correction for double-pack / touching-pack conditions
  - useful for improving virtual counting realism
- **Suggested tags:**
  - `sns.encoder_length_valid`
  - `calc.double_pack_detected`
- **Source:** HTW_sensors (2).pdf — Page 2

### 1.5 Proximity Switch Movement Divider
- **Section:** Divider reference / homing
- **Manual role:** Reference point of turning device during reference drive.
- **Twin meaning:**
  - homing/reference feedback for divider
  - more important for PLC/homing logic than for production cycle
- **Suggested tags:**
  - `sns.divider_home`
- **Source:** HTW_sensors (2).pdf — Page 3

### 1.6 Lane Control Sensors
- **Section:** Grouping lanes
- **Manual role:** Check actual lane filling and compare it with virtual lane filling. If wrong, controller causes an offset.
- **Twin meaning:**
  - key bridge between virtual model and physical lane reality
  - should compare expected lane fill vs actual lane fill
  - should allow correction or trigger warning/fault if mismatch persists
- **Suggested tags:**
  - `sns.lane_fill_ok[n]`
  - `calc.lane_fill_mismatch`
- **Source:** HTW_sensors (2).pdf — Page 3

---

## 2. Grouping / Transfer Sensors

### 2.1 Gap Control Infeed Pusher
- **Section:** Main machine / chain slide-in / pusher
- **Manual role:** Before the infeed pusher sinks to push packs into the tray, this sensor checks if there is a package below the pusher plate.
- **Twin meaning:**
  - transfer should only be permitted if pusher area is clear
  - should prevent unsafe or invalid push-down event
- **Suggested tags:**
  - `sns.pusher_gap_clear`
  - `perm.transfer_ok`
- **Source:** HTW_sensors (2).pdf — Page 4

### 2.2 Proximity Switch Conveyor Advance Infeed
- **Section:** Infeed mechanism reference
- **Manual role:** Reference point of device during reference drive.
- **Twin meaning:**
  - homing/reference only
- **Suggested tags:**
  - `sns.infeed_advance_home`
- **Source:** HTW_sensors (2).pdf — Page 5

### 2.3 Proximity Switch Chain Infeed Pusher
- **Section:** Chain slide-in / pusher reference
- **Manual role:** Reference point of device during reference drive.
- **Twin meaning:**
  - homing/reference feedback for chain slide-in bars / pusher
- **Suggested tags:**
  - `sns.chain_slide_in_home`
- **Source:** HTW_sensors (2).pdf — Page 5

---

## 3. Tray / Blank / Magazine Sensors

### 3.1 Tray Sensor Release Crosswise Gluing
- **Section:** Main transport chains
- **Manual role:** Checks if there is a tray in a specific position of the transport chain and releases crosswise gluing.
- **Twin meaning:**
  - confirms tray position before glue release
  - should gate a gluing event or forming stage
- **Suggested tags:**
  - `sns.tray_pos_cross_glue`
- **Source:** HTW_sensors (2).pdf — Page 6

### 3.2 Tray Sensor Release Gluing
- **Section:** Main transport chains
- **Manual role:** Checks if there is a tray in a specific position of the transport chain and releases gluing.
- **Twin meaning:**
  - second tray-position validation for glue timing
- **Suggested tags:**
  - `sns.tray_pos_glue`
- **Source:** HTW_sensors (2).pdf — Page 7

### 3.3 Tray Detection Traytransport
- **Section:** Tray transport
- **Manual role:** Checks whether there is a tray inside tray transport before it goes upward.
- **Twin meaning:**
  - confirms tray actually exists before the next transport motion
- **Suggested tags:**
  - `sns.tray_present_in_transport`
- **Source:** HTW_sensors (2).pdf — Page 14

### 3.4 Cylinder Tray Guides Above Left and Right
- **Section:** Tray guides
- **Manual role:** Check position of the guides.
- **Twin meaning:**
  - useful for guide-position interlock if modeling more detail later
- **Suggested tags:**
  - `sns.tray_guides_position_ok`
- **Source:** HTW_sensors (2).pdf — Page 14

### 3.5 Traytransport Proximity Switches Left and Right
- **Section:** Traytransport reference
- **Manual role:** Reference point of the device during reference drive.
- **Twin meaning:**
  - homing/reference only
- **Suggested tags:**
  - `sns.tray_transport_home`
- **Source:** HTW_sensors (2).pdf — Page 14

### 3.6 Trayfeeding Empty
- **Section:** Tray magazine
- **Manual role:** Detects whether a tray stack is placed.
- **Twin meaning:**
  - should support blank/tray material-available logic
  - warning first, then fault if not resolved
- **Suggested tags:**
  - `sns.tray_stack_present`
  - `sts.blank_available`
- **Source:** HTW_sensors (2).pdf — Page 15

### 3.7 Transfer Trayfeeding
- **Section:** Tray stack transfer
- **Manual role:** Detects whether there is a tray stack by the transfer.
- **Twin meaning:**
  - confirms internal transfer availability
- **Suggested tags:**
  - `sns.tray_stack_at_transfer`
- **Source:** HTW_sensors (2).pdf — Page 16

### 3.8 Crossconveyor Empty
- **Section:** Tray magazine / cross conveyor
- **Manual role:** Checks whether a tray is on the cross conveyor; otherwise a new stack starts from the external magazine.
- **Twin meaning:**
  - supports auto-refill / transfer request logic
- **Suggested tags:**
  - `sns.cross_conveyor_has_stack`
  - `cmd.request_new_blank_stack`
- **Source:** HTW_sensors (2).pdf — Page 16

### 3.9 Crossconveyor Tray Query
- **Section:** Cross conveyor to internal magazine
- **Manual role:** Once this query is active with a stack of trays, transfer to the internal magazine starts.
- **Twin meaning:**
  - explicit transfer start condition for tray stack replenishment
- **Suggested tags:**
  - `sns.cross_conveyor_query_active`
- **Source:** HTW_sensors (2).pdf — Page 17

---

## 4. Forming / Chain / Folder Sensors

### 4.1 Proximity Switch Edgeflap Folder Right
- **Section:** Folder mechanism
- **Manual role:** Reference point during reference drive.
- **Twin meaning:**
  - homing/reference only for now
- **Suggested tags:**
  - `sns.edge_flap_folder_right_home`
- **Source:** HTW_sensors (2).pdf — Page 6

### 4.2 Proximity Switch Upper Transport Chain
- **Section:** Main transport chain
- **Manual role:** Reference point during reference drive.
- **Twin meaning:**
  - homing/reference for chain motion
- **Suggested tags:**
  - `sns.upper_chain_home`
- **Source:** HTW_sensors (2).pdf — Page 7

### 4.3 Proximity Switch Lower Transport Chain
- **Section:** Main transport chain
- **Manual role:** Reference point during reference drive.
- **Twin meaning:**
  - homing/reference for chain motion
- **Suggested tags:**
  - `sns.lower_chain_home`
- **Source:** HTW_sensors (2).pdf — Page 7

### 4.4 Proximity Switch Edgeflap Folder Left
- **Section:** Folder mechanism
- **Manual role:** Reference point during reference drive.
- **Twin meaning:**
  - homing/reference only for now
- **Suggested tags:**
  - `sns.edge_flap_folder_left_home`
- **Source:** HTW_sensors (2).pdf — Page 7

### 4.5 High Adjustment Limit Sensors Upper Transport Chain
- **Section:** Upper transport chain
- **Manual role:** High adjustment limit sensor for chain adjustment.
- **Twin meaning:**
  - likely setup/reference; lower priority for production simulation
- **Suggested tags:**
  - `sns.upper_chain_high_limit`
- **Source:** HTW_sensors (2).pdf — Page 8

---

## 5. Discharge / Reject / Quality Sensors

### 5.1 Gapcontrol Transport Chain
- **Section:** Outfeed / transport chain clearance
- **Manual role:** If there is a tray below this sensor at a special position of the transport chain, the machine stops directly and operator has to remove the pack from the area.
- **Twin meaning:**
  - should be treated as a strong jam / blocked / direct-stop condition
  - this is not just a warning
- **Suggested tags:**
  - `sns.transport_chain_clear`
  - `fault.transport_chain_gap_blocked`
- **Source:** HTW_sensors (2).pdf — Page 8

### 5.2 Open Trayflap Detection
- **Section:** Discharge quality control
- **Manual role:** Checks whether there is a tray with an open flap.
- **Twin meaning:**
  - should create reject / quality event near discharge
  - can also contribute to reject accumulation logic
- **Suggested tags:**
  - `sns.open_flap_detected`
  - `out.last_reject_reason = OPEN_FLAP`
- **Source:** HTW_sensors (2).pdf — Page 8

### 5.3 Outlet / Tray Plate Sensors
- **Section:** Open flap detection assembly
- **Manual role from OT training document:** outlet sensors and tray plate sensors detect unsealed tray flaps and inform machine control.
- **Twin meaning:**
  - should be represented as quality check sensors on discharge side
- **Suggested tags:**
  - `sns.outlet_sensor_ok`
  - `sns.tray_plate_sensor_ok`
- **Source:** OT traypacker HTW CBOB (1).pdf — Page 16

---

## 6. Utility / Maintenance Sensors

### 6.1 Pressure Sensor
- **Section:** Maintenance unit / pneumatics
- **Manual role:** Checks upper and lower compressed air limits and transmits two signals to controller: high pressure and low pressure.
- **Twin meaning:**
  - should map to utilities / pneumatic health
- **Suggested tags:**
  - `sns.air_pressure_low`
  - `sns.air_pressure_high`
  - `inputs.utilities_ok`
- **Source:** HTW_sensors (2).pdf — Page 18

### 6.2 Float Switch Grease Lubrication Empty
- **Section:** Lubrication system
- **Manual role:** Empty signal from grease tank.
- **Twin meaning:**
  - lower-priority maintenance warning / fault candidate
- **Suggested tags:**
  - `sns.grease_empty`
- **Source:** HTW_sensors (2).pdf — Page 18

### 6.3 Float Switch Oil Lubrication Empty
- **Section:** Lubrication system
- **Manual role:** Empty signal from oil tank.
- **Twin meaning:**
  - lower-priority maintenance warning / fault candidate
- **Suggested tags:**
  - `sns.oil_empty`
- **Source:** HTW_sensors (2).pdf — Page 18

---

## 7. Suggested First Sensor Groups for the Digital Twin

For the next simulation upgrade, the most useful sensor groups are:

### A. Material / feed sensors
- `sns.product_present`
- `sns.blank_stack_present`
- `sns.cross_conveyor_has_stack`
- `sns.tray_present_in_transport`

### B. Lane / grouping sensors
- `sns.count_pulse`
- `sns.divider_gap_clear`
- `sns.lane_fill_ok[n]`
- `sns.divider_fallen_product`

### C. Transfer interlock sensors
- `sns.pusher_gap_clear`
- `sns.chain_slide_in_home`
- `sns.stopper_closed`
- `sns.terminal_closed`

### D. Forming / chain sensors
- `sns.tray_pos_glue`
- `sns.tray_pos_cross_glue`
- `sns.upper_chain_home`
- `sns.lower_chain_home`

### E. Discharge / quality sensors
- `sns.transport_chain_clear`
- `sns.open_flap_detected`
- `sns.outlet_sensor_ok`
- `sns.tray_plate_sensor_ok`

### F. Utilities / maintenance
- `sns.air_pressure_low`
- `sns.grease_empty`
- `sns.oil_empty`

---

## 8. Best Use of This File by an Agent

An agent should use this file to:
- create a PLC-friendly virtual sensor model
- decide which simulator transitions need sensor/interlock conditions
- decide which diagnostics values belong in the HMI
- distinguish between production sensors, homing/reference sensors, and maintenance sensors
