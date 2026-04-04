from __future__ import annotations

from dataclasses import asdict
from typing import Any

from app.shared.enums import CyclePhase, MachineMode, MachineState, PackResult, Severity
from app.shared.models import TagStoreModel, TagValidationError


# Valid recipe IDs — validated at write time
KNOWN_RECIPES = {"24-pack", "27-pack", "30-pack", "21-pack"}

# Valid command codes for PLC-facing interface
VALID_COMMAND_CODES = set(range(0, 11))  # 0-10

# Valid mode values
VALID_MODES = {0, 1}  # 0=AUTO, 1=MANUAL


class TagStore:
    """Central shared behavioral tag store for simulator, control, API, and AI.

    Provides controlled write methods that enforce:
    - Layer ownership (simulator writes sts/sns/out, controller writes cmd, etc.)
    - Value validation (valid enums, ranges, non-negative counters)
    - Deterministic failure via TagValidationError
    """

    def __init__(self) -> None:
        self.state = TagStoreModel(
            cmd={
                "start": False,
                "stop": False,
                "reset": False,
                "mode_auto": True,
                "mode_manual": False,
                "run_empty": False,
                "recipe_select": "24-pack",
                "ack_alarm": False,
                "clear_counts": False,
                "refill_blanks": False,
                "clear_rejects": False,
            },
            cfg={
                "active_recipe_id": "24-pack",
                "active_recipe_name": "24-pack",
                "target_pack_count": 24,
                "grid_cols": 8,
                "nominal_cycle_time_sec": 3.2,
                "reject_probability": 0.05,
                "jam_probability": 0.015,
                "auto_restart_on_recovery": True,
                "session_id": "",
                "active_scenario_id": "",
                "active_scenario_status": "IDLE",
            },
            inputs={
                "product_available": True,
                "blank_available": True,
                "downstream_available": True,
                "safety_ok": True,
                "estop_ok": True,
                "guards_closed": True,
                "utilities_ok": True,
            },
            sts={
                "machine_state": MachineState.STOPPED.value,
                "machine_mode": MachineMode.AUTO.value,
                "cycle_phase": CyclePhase.IDLE.value,
                "cycle_phase_progress": 0.0,
                "ready_to_start": True,
                "cycle_active": False,
                "run_empty_active": False,
                "fault_active": False,
                "warning_active": False,
                "start_permissive_ok": True,
            },
            out={
                "grouped_count": 0,
                "target_group_count": 24,
                "cycle_count": 0,
                "good_pack_count": 0,
                "reject_pack_count": 0,
                "reject_accumulation_count": 0,
                "blanks_remaining": 100,
                "total_product_in": 0,
                "total_product_used": 0,
                "runtime_sec": 0.0,
                "downtime_sec": 0.0,
                "last_cycle_time_sec": 0.0,
                "avg_cycle_time_sec": 0.0,
                "last_pack_result": PackResult.GOOD.value,
                "last_reject_reason": "",
            },
            fault={
                "active_code": "",
                "active_text": "",
                "active_severity": Severity.INFO.value,
                "latched": False,
                "timestamp": "",
                "active_count": 0,
                "last_acknowledged": "",
            },
            evt={
                "last_event_code": "SYSTEM_READY",
                "last_event_text": "Tag store initialized",
                "last_event_ts": "",
                "last_state_change": "",
                "last_pack_result": "",
                "last_reject_reason": "",
            },
            hmi={
                "start_button_enabled": False,
                "stop_button_enabled": False,
                "reset_button_enabled": False,
                "recipe_change_enabled": True,
                "auto_mode_enabled": True,
                "manual_mode_enabled": True,
                "show_fault_banner": False,
                "show_warning_banner": False,
                "status_lamp_color": "gray",
                "footer_message": "System Ready",
            },
            sns={
                # Divider / lane distribution
                "divider_gap_clear": True,
                "divider_min_jam_ok": True,
                # Grouping lanes
                "lane_fill_ok": False,
                "lane_fill_mismatch": False,
                # Stopper / terminal
                "stopper_closed": True,
                "terminal_closed": False,
                # Transfer interlock
                "transfer_gap_clear": True,
                # Tray / blank
                "tray_stack_present": True,
                "tray_vacuum_ok": False,
                "tray_positioned": False,
                "tray_in_transport": False,
                # Forming / chain
                "chain_clear": True,
                # Discharge / outlet
                "outlet_sensor_ok": True,
                "tray_plate_sensor_ok": True,
                # Discharge / quality
                "open_flap_detected": False,
            },
            warn={
                "active_code": "",
                "active_text": "",
                "active_severity": Severity.WARNING.value,
                "timestamp": "",
                "active_count": 0,
            },
            plc={
                # PLC Scan Cycle
                "scan_counter": 0,
                "last_scan_ts": 0.0,
                "scan_duration_ms": 0.0,
                # Heartbeat / Comms
                "heartbeat_counter": 0,
                "comms_healthy": True,
                "comms_timeout_sec": 5.0,
                # Command Handshake
                "command_seq": 0,
                "command_ack_code": 0,  # 0=none, 1=accepted, 2=denied, 3=error
                "last_command_code": 0,  # Integer command code
                # Mode Handshake
                "requested_mode": 0,  # 0=AUTO, 1=MANUAL
                "current_mode": 0,    # 0=AUTO, 1=MANUAL
                "mode_ack": False,
            },
        )

    # ------------------------------------------------------------------ #
    #  Controlled Write Methods (Ownership-Enforced)                     #
    # ------------------------------------------------------------------ #

    def write_cmd(self, key: str, value: Any) -> None:
        """Write to command tags. Owned by controller/PLC layer."""
        if key not in self.state.cmd:
            raise TagValidationError(f"Unknown command tag: {key}")
        if not isinstance(value, bool) and key != "recipe_select":
            raise TagValidationError(f"Command '{key}' must be bool, got {type(value).__name__}")
        if key == "recipe_select" and value not in KNOWN_RECIPES:
            raise TagValidationError(f"Unknown recipe: {value}")
        self.state.cmd[key] = value

    def write_sts(self, key: str, value: Any) -> None:
        """Write to status tags. Owned by simulator layer."""
        if key not in self.state.sts:
            raise TagValidationError(f"Unknown status tag: {key}")

        # Validate enum values
        if key == "machine_state":
            if value not in MachineState._value2member_map_:
                raise TagValidationError(f"Invalid machine_state: {value}")
        elif key == "machine_mode":
            if value not in MachineMode._value2member_map_:
                raise TagValidationError(f"Invalid machine_mode: {value}")
        elif key == "cycle_phase":
            if value not in CyclePhase._value2member_map_:
                raise TagValidationError(f"Invalid cycle_phase: {value}")
        elif key == "cycle_phase_progress":
            if not isinstance(value, (int, float)) or not (0.0 <= value <= 1.0):
                raise TagValidationError(f"cycle_phase_progress must be 0.0-1.0, got {value}")
        elif key in ("ready_to_start", "cycle_active", "run_empty_active", "fault_active", "warning_active", "start_permissive_ok"):
            if not isinstance(value, bool):
                raise TagValidationError(f"Status '{key}' must be bool, got {type(value).__name__}")

        self.state.sts[key] = value

    def write_sns(self, key: str, value: Any) -> None:
        """Write to sensor tags. Owned by simulator layer."""
        if key not in self.state.sns:
            raise TagValidationError(f"Unknown sensor tag: {key}")
        if not isinstance(value, bool):
            raise TagValidationError(f"Sensor '{key}' must be bool, got {type(value).__name__}")
        self.state.sns[key] = value

    def write_out(self, key: str, value: Any) -> None:
        """Write to output/counter tags. Owned by simulator layer."""
        if key not in self.state.out:
            raise TagValidationError(f"Unknown output tag: {key}")

        # Non-negative counter validation
        counter_keys = {
            "grouped_count", "target_group_count", "cycle_count",
            "good_pack_count", "reject_pack_count", "reject_accumulation_count",
            "blanks_remaining", "total_product_in", "total_product_used",
        }
        if key in counter_keys:
            if not isinstance(value, (int, float)) or value < 0:
                raise TagValidationError(f"Counter '{key}' must be non-negative, got {value}")

        # Probability range validation
        if key in ("reject_probability", "jam_probability"):
            if not isinstance(value, (int, float)) or not (0.0 <= value <= 1.0):
                raise TagValidationError(f"Probability '{key}' must be 0.0-1.0, got {value}")

        # Pack result validation
        if key == "last_pack_result":
            if value not in PackResult._value2member_map_:
                raise TagValidationError(f"Invalid last_pack_result: {value}")

        self.state.out[key] = value

    def write_fault(self, key: str, value: Any) -> None:
        """Write to fault tags. Owned by simulator layer."""
        if key not in self.state.fault:
            raise TagValidationError(f"Unknown fault tag: {key}")
        if key == "active_severity":
            if value not in Severity._value2member_map_:
                raise TagValidationError(f"Invalid fault severity: {value}")
        if key in ("latched",):
            if not isinstance(value, bool):
                raise TagValidationError(f"Fault '{key}' must be bool, got {type(value).__name__}")
        if key == "active_count":
            if not isinstance(value, int) or value < 0:
                raise TagValidationError(f"Fault count must be non-negative, got {value}")
        self.state.fault[key] = value

    def write_warn(self, key: str, value: Any) -> None:
        """Write to warning tags. Owned by simulator layer."""
        if key not in self.state.warn:
            raise TagValidationError(f"Unknown warning tag: {key}")
        if key == "active_severity":
            if value not in Severity._value2member_map_:
                raise TagValidationError(f"Invalid warning severity: {value}")
        if key == "active_count":
            if not isinstance(value, int) or value < 0:
                raise TagValidationError(f"Warning count must be non-negative, got {value}")
        self.state.warn[key] = value

    def write_inputs(self, key: str, value: Any) -> None:
        """Write to input tags. Owned by scenario/test harness or external conditions."""
        if key not in self.state.inputs:
            raise TagValidationError(f"Unknown input tag: {key}")
        if not isinstance(value, bool):
            raise TagValidationError(f"Input '{key}' must be bool, got {type(value).__name__}")
        self.state.inputs[key] = value

    def write_plc(self, key: str, value: Any) -> None:
        """Write to PLC scan cycle tags. Owned by controller layer."""
        if key not in self.state.plc:
            raise TagValidationError(f"Unknown PLC tag: {key}")

        # Command code range validation
        if key == "command_code" or key == "last_command_code":
            if not isinstance(value, int) or value not in VALID_COMMAND_CODES:
                raise TagValidationError(f"Command code must be 0-10, got {value}")

        # Mode value validation
        if key in ("requested_mode", "current_mode"):
            if not isinstance(value, int) or value not in VALID_MODES:
                raise TagValidationError(f"Mode must be 0 or 1, got {value}")

        # Ack code validation
        if key == "command_ack_code":
            if not isinstance(value, int) or value not in {0, 1, 2, 3}:
                raise TagValidationError(f"Command ack code must be 0-3, got {value}")

        # Non-negative counters
        if key in ("scan_counter", "heartbeat_counter"):
            if not isinstance(value, int) or value < 0:
                raise TagValidationError(f"PLC counter '{key}' must be non-negative, got {value}")

        self.state.plc[key] = value

    def write_cfg(self, key: str, value: Any) -> None:
        """Write to configuration tags. Owned by controller layer."""
        if key not in self.state.cfg:
            raise TagValidationError(f"Unknown config tag: {key}")
        if key == "active_recipe_id" and value not in KNOWN_RECIPES:
            raise TagValidationError(f"Unknown recipe: {value}")
        self.state.cfg[key] = value

    # ------------------------------------------------------------------ #
    #  Snapshot & Utilities                                              #
    # ------------------------------------------------------------------ #

    def snapshot(self) -> dict[str, Any]:
        return asdict(self.state)

    def pulse_clear(self) -> None:
        """Clear pulse-style commands after a scan/update loop."""
        for key in ("start", "stop", "reset", "run_empty", "ack_alarm", "clear_counts", "refill_blanks", "clear_rejects"):
            self.state.cmd[key] = False
