# Recipe Model

## 1. Purpose

This document defines the recipe model for the simplified tray packer digital twin project.

In this project, a recipe is the operational definition of a pack format. It controls:
- how many products are required per pack
- how products are visually grouped in the simulation
- nominal cycle timing
- reject and jam tendencies
- display values for HMI, dashboard, and AI explanations

This is a **behavioral recipe model**, not a full OEM changeover or servo-motion recipe system.

---

## 2. Design Intent

The recipe model should:
- feel realistic from an operator and production perspective
- be simple enough for fast implementation
- support simulation, HMI, dashboard, and AI features
- separate product/format behavior from core machine logic
- allow later extension without breaking V1

The recipe model is not intended to reproduce every real machine adjustment parameter.

---

## 3. What a Recipe Represents

A recipe represents one complete operating format for the machine.

Each recipe should define:
- the pack name
- products per pack
- visual grouping layout
- nominal cycle time
- fault/reject tendency modifiers
- optional display and training metadata

Examples:
- 24-pack
- 27-pack
- 30-pack

These are project-level recipe examples, not necessarily exact factory definitions.

---

## 4. Recipe Design Principles

The recipe system should follow these principles:

### 4.1 Machine Logic Stays Stable
Changing recipe should not change the main state machine.
It should only change:
- targets
- timings
- counters
- layout
- probabilities
- labels

### 4.2 Recipes Drive Behavior, Not Architecture
A recipe should tune machine behavior without changing the fundamental simulator structure.

### 4.3 Recipes Must Be Human-Readable
Recipes should be easy to inspect and edit by developers and agents.

### 4.4 Recipes Must Be Externalized
Recipes should be stored in configuration files, not hardcoded deep in simulator logic.

Recommended formats:
- JSON
- YAML

---

## 5. Minimum V1 Recipe Fields

Each recipe should define the following minimum fields.

| Field | Type | Required | Description |
|---|---|---|---|
| recipe_id | string | Yes | Stable recipe identifier |
| recipe_name | string | Yes | Human-readable name |
| products_per_pack | int | Yes | Logical target count for one pack |
| grid_cols | int | Yes | Number of visual grouping columns |
| grid_rows | int | Yes | Number of visual grouping rows |
| nominal_cycle_time_sec | float | Yes | Base cycle time |
| product_spawn_interval_sec | float | Yes | Incoming product interval |
| reject_probability | float | Yes | Base probability of reject-only event |
| jam_probability | float | Yes | Base probability of stopping jam |
| display_color | string | No | Optional UI color hint |
| notes | string | No | Human-readable notes |

---

## 6. Recommended V1 Recipe Behavior

The recipe should influence these simulator behaviors:

### 6.1 Grouping Requirement
How many products are needed before a cycle can start.

### 6.2 Visual Layout
How grouped products are drawn in the grouping zone.

### 6.3 Throughput
How long a cycle takes under nominal conditions.

### 6.4 Product Arrival Rate
How quickly the infeed can fill the grouping area.

### 6.5 Quality Trend
How likely the machine is to create reject-only events under this format.

### 6.6 Fault Trend
How likely certain disruptions are under this format.

This is enough to make recipes feel distinct without overcomplicating the model.

---

## 7. Example V1 Recipe Definitions

These are suggested starter recipes for the project.

## 7.1 Recipe A: 24-pack

- recipe_id: `24-pack`
- recipe_name: `24-pack`
- products_per_pack: 24
- grid_cols: 8
- grid_rows: 3
- nominal_cycle_time_sec: 3.2
- product_spawn_interval_sec: 0.09
- reject_probability: 0.05
- jam_probability: 0.015

Behavioral interpretation:
- relatively stable baseline recipe
- moderate speed
- lowest difficulty among the starter recipes

## 7.2 Recipe B: 27-pack

- recipe_id: `27-pack`
- recipe_name: `27-pack`
- products_per_pack: 27
- grid_cols: 9
- grid_rows: 3
- nominal_cycle_time_sec: 3.6
- product_spawn_interval_sec: 0.10
- reject_probability: 0.06
- jam_probability: 0.020

Behavioral interpretation:
- slightly heavier grouping requirement
- a little slower
- slightly higher quality and jam sensitivity

## 7.3 Recipe C: 30-pack

- recipe_id: `30-pack`
- recipe_name: `30-pack`
- products_per_pack: 30
- grid_cols: 10
- grid_rows: 3
- nominal_cycle_time_sec: 4.0
- product_spawn_interval_sec: 0.11
- reject_probability: 0.08
- jam_probability: 0.025

Behavioral interpretation:
- largest pack format in V1 set
- slowest baseline cycle
- highest reject/jam tendency of starter group

These starter values are behavioral defaults and can be tuned later.

---

## 8. Recipe Parameters Explained

## 8.1 products_per_pack
Defines the grouping target before a cycle can start.

Example:
- 24 means the machine must accumulate 24 products before packaging.

This is one of the most important recipe parameters.

## 8.2 grid_cols and grid_rows
These define the visual grouping layout for the animation and UI.

Example:
- 24-pack -> 8 x 3
- 27-pack -> 9 x 3
- 30-pack -> 10 x 3

This does not need to match exact OEM geometry. It only needs to look clear and believable.

## 8.3 nominal_cycle_time_sec
Defines the base time for a full packaging cycle under normal conditions.

This value can be used as:
- a total cycle time
- or split into internal sub-phase timings such as blank feed, packing, and discharge

## 8.4 product_spawn_interval_sec
Defines how quickly incoming products appear.

Smaller value = faster supply.
This should be chosen so grouping can normally complete in a believable way relative to cycle time.

## 8.5 reject_probability
Defines the baseline chance that a completed cycle produces a rejected pack rather than a good pack.

This is a simplification of multiple real causes:
- incomplete formation
- open flap
- packaging defect

## 8.6 jam_probability
Defines the baseline chance that a cycle triggers a stopping machine fault.

This is a simplified way to represent transfer or pack-area jam behavior.

---

## 9. Optional V2/V3 Recipe Fields

Later versions may add:
- product_display_name
- product_width_mm
- product_height_mm
- product_mass_g
- lane_count
- blank_type
- carton_type
- changeover_notes
- preferred_training_scenarios
- microstop_probability
- warmup_cycle_multiplier
- downstream_sensitivity_factor
- AI hint text

These are optional and not required for V1.

---

## 10. Recipe Effects on Simulation

The simulator should use recipe data in these ways.

## 10.1 Group Completion Logic
Cycle cannot start until:
- grouped_count >= products_per_pack

## 10.2 Animation Layout
Grouped products should be drawn using:
- grid_cols
- grid_rows

## 10.3 Timing Behavior
The recipe should define:
- base cycle time
- optional phase splits

Example internal split:
- blank_feed_time = 20% of total cycle time
- packing_time = 45% of total cycle time
- discharge_time = 25% of total cycle time
- remaining time = small idle/transition overhead

These are implementation choices, not part of the recipe format itself unless explicitly stored.

## 10.4 Event Frequency
Reject and jam probability should be evaluated during or at the end of a cycle.

## 10.5 Reporting
Analytics should group output by recipe:
- total cycles
- total good packs
- total rejects
- downtime by recipe
- fault frequency by recipe

---

## 11. Recipe Selection Rules

Recommended V1 rules:

### Allowed when:
- machine is STOPPED
- machine is in MANUAL mode
- machine is setup-ready

### Not recommended when:
- machine is actively RUNNING
- machine is in FAULTED state with active unresolved issue
- run-empty is active

For a simplified implementation, recipe change should usually be allowed only when machine is STOPPED.

---

## 12. Recipe Validation Rules

Each recipe should be validated before use.

Minimum validation:
- recipe_id is unique
- products_per_pack > 0
- grid_cols > 0
- grid_rows > 0
- grid_cols * grid_rows >= products_per_pack
- nominal_cycle_time_sec > 0
- product_spawn_interval_sec > 0
- reject_probability between 0.0 and 1.0
- jam_probability between 0.0 and 1.0

Invalid recipes should not be loaded.

---

## 13. Recipe Performance Interpretation

Recipe values should be treated as:
- operational tuning values
- scenario defaults
- behavior modifiers

They are not intended to represent exact real machine capability unless later verified.

Important rule:
**recipes influence machine behavior, but they do not replace the control model.**

---

## 14. Recipe Impact on AI Features

The AI layer should use recipe data for:
- explaining why one recipe performs differently than another
- comparing reject rates
- comparing average cycle time
- generating shift summaries
- generating training scenarios

Example AI question:
- "Why did the 30-pack run slower than the 24-pack?"

Structured answer should use:
- products_per_pack
- nominal_cycle_time_sec
- reject_probability
- jam_probability
- session statistics

The AI should prefer structured recipe data over guesswork.

---

## 15. Recipe Impact on Dashboard and HMI

The dashboard/HMI should display:
- current recipe
- products per pack
- current grouped count vs target
- nominal cycle time
- recipe-related notes
- performance by recipe

Optional visual features:
- recipe color theme
- pack layout preview
- current recipe difficulty badge

These are helpful but not required in V1.

---

## 16. Recipe File Format Example (JSON)

```json
[
  {
    "recipe_id": "24-pack",
    "recipe_name": "24-pack",
    "products_per_pack": 24,
    "grid_cols": 8,
    "grid_rows": 3,
    "nominal_cycle_time_sec": 3.2,
    "product_spawn_interval_sec": 0.09,
    "reject_probability": 0.05,
    "jam_probability": 0.015,
    "display_color": "#3CBF6B",
    "notes": "Baseline starter recipe"
  },
  {
    "recipe_id": "27-pack",
    "recipe_name": "27-pack",
    "products_per_pack": 27,
    "grid_cols": 9,
    "grid_rows": 3,
    "nominal_cycle_time_sec": 3.6,
    "product_spawn_interval_sec": 0.10,
    "reject_probability": 0.06,
    "jam_probability": 0.020,
    "display_color": "#F0C846",
    "notes": "Slightly slower with higher sensitivity"
  },
  {
    "recipe_id": "30-pack",
    "recipe_name": "30-pack",
    "products_per_pack": 30,
    "grid_cols": 10,
    "grid_rows": 3,
    "nominal_cycle_time_sec": 4.0,
    "product_spawn_interval_sec": 0.11,
    "reject_probability": 0.08,
    "jam_probability": 0.025,
    "display_color": "#DC4646",
    "notes": "Highest pack count in V1 set"
  }
]
```

---

## 17. Recipe File Format Example (YAML)

```yaml
recipes:
  - recipe_id: "24-pack"
    recipe_name: "24-pack"
    products_per_pack: 24
    grid_cols: 8
    grid_rows: 3
    nominal_cycle_time_sec: 3.2
    product_spawn_interval_sec: 0.09
    reject_probability: 0.05
    jam_probability: 0.015
    display_color: "#3CBF6B"
    notes: "Baseline starter recipe"

  - recipe_id: "27-pack"
    recipe_name: "27-pack"
    products_per_pack: 27
    grid_cols: 9
    grid_rows: 3
    nominal_cycle_time_sec: 3.6
    product_spawn_interval_sec: 0.10
    reject_probability: 0.06
    jam_probability: 0.020
    display_color: "#F0C846"
    notes: "Slightly slower with higher sensitivity"

  - recipe_id: "30-pack"
    recipe_name: "30-pack"
    products_per_pack: 30
    grid_cols: 10
    grid_rows: 3
    nominal_cycle_time_sec: 4.0
    product_spawn_interval_sec: 0.11
    reject_probability: 0.08
    jam_probability: 0.025
    display_color: "#DC4646"
    notes: "Highest pack count in V1 set"
```

---

## 18. Recommended Internal Data Class

A simple implementation may use a data class like this:

```python
from dataclasses import dataclass

@dataclass
class Recipe:
    recipe_id: str
    recipe_name: str
    products_per_pack: int
    grid_cols: int
    grid_rows: int
    nominal_cycle_time_sec: float
    product_spawn_interval_sec: float
    reject_probability: float
    jam_probability: float
    display_color: str = "#FFFFFF"
    notes: str = ""
```

This is enough for V1 and easy for agents to implement.

---

## 19. Recommended V1 Defaults

If no verified production data exists, use these rules:
- choose 3 starter recipes
- use visibly different target counts
- make higher pack-count recipes slightly slower
- make larger recipes slightly more fault/reject sensitive
- keep all values configurable

This gives believable behavior without pretending to be exact factory truth.

---

## 20. Future Extension Path

Later phases may add:
- recipe editor UI
- per-recipe scenario overrides
- recipe-specific maintenance patterns
- recipe-specific AI hints
- recipe versioning
- import/export tools
- changeover simulation

These are useful but not required for the first project version.

---

## 21. Final Guidance

The recipe model should be treated as the authoritative source for format-specific machine behavior in the project.

If the simulator, dashboard, HMI, AI layer, or analytics disagree on recipe definitions, this document and the external recipe files should be used as the reference.

The key rule is:
**recipes should make the machine feel different to operate without making the simulator architecture complicated.**
