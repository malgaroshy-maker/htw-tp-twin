from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.shared.enums import CyclePhase, MachineMode, MachineState, PackResult, Severity


class TagValidationError(Exception):
    """Raised when a tag write violates ownership or validation rules."""
    pass


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


@dataclass
class FaultDefinition:
    fault_id: str
    category: str
    severity: str
    behavior_type: str
    machine_state_effect: str | None
    requires_reset: bool
    reject_created: bool
    recovery_mode: str


@dataclass
class EventRecord:
    event_id: str
    ts: str
    event_code: str
    category: str
    severity: Severity
    machine_state: MachineState
    machine_mode: MachineMode
    recipe_id: str
    message: str
    session_id: str = ""
    scenario_id: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ScenarioTrigger:
    type: str
    value: Any


@dataclass
class ScenarioAction:
    type: str
    name: str
    value: Any


@dataclass
class ScenarioCondition:
    type: str  # "all_of", "any_of", "tag_equals", "machine_state_in", "fault_cleared"
    value: Any = None
    tag: str | None = None
    conditions: list[ScenarioCondition] = field(default_factory=list)


@dataclass
class ScenarioStep:
    trigger: ScenarioTrigger
    action: ScenarioAction


@dataclass
class Scenario:
    scenario_id: str
    scenario_name: str
    description: str
    goals: list[str]
    initial_recipe: str
    steps: list[ScenarioStep]
    success_criteria: list[str]
    recovery_condition: ScenarioCondition | None = None
    timeout_sec: float = 300.0
    abort_allowed: bool = True
    manual_complete_allowed: bool = False


@dataclass
class SensorModel:
    """Virtual sensor states derived from machine behavior.
    Maps to future PLC input tags for Siemens integration.
    """
    # Divider / lane distribution
    divider_gap_clear: bool = True
    divider_min_jam_ok: bool = True
    # Grouping lanes
    lane_fill_ok: bool = False
    lane_fill_mismatch: bool = False
    # Stopper / terminal
    stopper_closed: bool = True
    terminal_closed: bool = False
    # Transfer interlock
    transfer_gap_clear: bool = True
    # Tray / blank
    tray_stack_present: bool = True
    tray_vacuum_ok: bool = False
    tray_positioned: bool = False
    tray_in_transport: bool = False
    # Forming / chain
    chain_clear: bool = True
    # Discharge / outlet
    outlet_sensor_ok: bool = True
    tray_plate_sensor_ok: bool = True
    # Discharge / quality
    open_flap_detected: bool = False


@dataclass
class TagStoreModel:
    cmd: dict[str, Any] = field(default_factory=dict)
    cfg: dict[str, Any] = field(default_factory=dict)
    inputs: dict[str, Any] = field(default_factory=dict)
    sts: dict[str, Any] = field(default_factory=dict)
    out: dict[str, Any] = field(default_factory=dict)
    fault: dict[str, Any] = field(default_factory=dict)
    warn: dict[str, Any] = field(default_factory=dict)
    evt: dict[str, Any] = field(default_factory=dict)
    hmi: dict[str, Any] = field(default_factory=dict)
    sns: dict[str, Any] = field(default_factory=dict)
    plc: dict[str, Any] = field(default_factory=dict)
