"""PLC-facing data structures and mapping functions.

This module provides a clean mapping between the internal tag store
(string-based, developer-friendly) and PLC-facing structures
(integer-coded, compact, Siemens UDT-style).

Key principle: PLC-facing data uses integer codes, not strings.
Human-readable text stays in the internal tag store and dashboard layer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.shared.enums import CyclePhase, MachineMode, MachineState, PackResult, Severity


# ------------------------------------------------------------------ #
#  Explicit PLC Code Mappings (Single Source of Truth)               #
# ------------------------------------------------------------------ #

# Machine state codes
MACHINE_STATE_CODES: dict[str, int] = {
    "STOPPED": 0,
    "STARTING": 1,
    "RUNNING": 2,
    "STARVED": 3,
    "BLOCKED": 4,
    "FAULTED": 5,
    "RUN_EMPTY": 6,
}

# Machine mode codes
MACHINE_MODE_CODES: dict[str, int] = {
    "AUTO": 0,
    "MANUAL": 1,
}

# Cycle phase codes
CYCLE_PHASE_CODES: dict[str, int] = {
    "IDLE": 0,
    "GROUPING": 1,
    "CAPTURED": 2,
    "BLANK_FEED": 3,
    "TRANSFER": 4,
    "PACKING": 5,
    "DISCHARGE": 6,
}

# Severity codes
SEVERITY_CODES: dict[str, int] = {
    "INFO": 0,
    "WARNING": 1,
    "FAULT": 2,
    "CRITICAL": 3,
}

# Pack result codes
PACK_RESULT_CODES: dict[str, int] = {
    "GOOD": 0,
    "REJECT": 1,
}

# Fault code mappings
FAULT_CODE_MAP: dict[str, int] = {
    "": 0,
    "STARVATION": 1,
    "DOWNSTREAM_BLOCK": 2,
    "BLANK_MISSING": 3,
    "GAP_CONTROL_JAM": 4,
    "INCOMPLETE_PACK": 5,
    "OPEN_FLAP": 6,
    "REJECT_BIN_FULL": 7,
    "REJECT_BIN_NEAR_FULL": 8,
    "TRANSPORT_CHAIN_GAP": 9,
}

# Warning code mappings
WARNING_CODE_MAP: dict[str, int] = {
    "": 0,
    "BLANK_LOW": 1,
    "BLANK_EMPTY": 2,
}

# Recipe code mappings
RECIPE_CODE_MAP: dict[str, int] = {
    "21-pack": 0,
    "24-pack": 1,
    "27-pack": 2,
    "30-pack": 3,
}

# Reject reason mappings
REJECT_REASON_MAP: dict[str, int] = {
    "": 0,
    "INCOMPLETE_PACK": 1,
    "OPEN_FLAP": 2,
}

# Reserved invalid code for unknown values
_INVALID_CODE = -1


# ------------------------------------------------------------------ #
#  Mapping Helpers                                                   #
# ------------------------------------------------------------------ #

def _map_code(code_map: dict[str, int], value: str) -> int:
    """Map a string value to its PLC integer code.

    Raises ValueError if the value is not in the mapping.
    """
    if value not in code_map:
        raise ValueError(f"Unknown PLC code mapping for: {value!r}")
    return code_map[value]


def fault_code_to_int(code: str) -> int:
    """Map fault code string to PLC integer code."""
    return _map_code(FAULT_CODE_MAP, code)


def warning_code_to_int(code: str) -> int:
    """Map warning code string to PLC integer code."""
    return _map_code(WARNING_CODE_MAP, code)


def recipe_to_int(recipe_id: str) -> int:
    """Map recipe ID to PLC integer code."""
    return _map_code(RECIPE_CODE_MAP, recipe_id)


def reject_reason_to_int(reason: str) -> int:
    """Map reject reason string to PLC integer code."""
    return _map_code(REJECT_REASON_MAP, reason)


# ------------------------------------------------------------------ #
#  PLC-Facing Data Structures                                        #
# ------------------------------------------------------------------ #

@dataclass
class PlcCmd:
    """PLC command interface — represents requested/accepted commands.

    Direction: PLC writes commands, controller reads them.
    This is the command view, not machine truth.
    """
    start: bool = False
    stop: bool = False
    reset: bool = False
    run_empty: bool = False
    ack_alarm: bool = False
    clear_counts: bool = False
    refill_blanks: bool = False
    clear_rejects: bool = False
    requested_mode: int = 0       # 0=AUTO, 1=MANUAL
    requested_recipe_code: int = 1  # 0=21-pack, 1=24-pack, 2=27-pack, 3=30-pack


@dataclass
class PlcSts:
    """PLC machine status — simulator writes, PLC reads."""
    machine_state: int = 0        # 0=STOPPED, 1=STARTING, 2=RUNNING, 3=STARVED, 4=BLOCKED, 5=FAULTED, 6=RUN_EMPTY
    machine_mode: int = 0         # 0=AUTO, 1=MANUAL
    cycle_phase: int = 0          # 0=IDLE, 1=GROUPING, 2=CAPTURED, 3=BLANK_FEED, 4=TRANSFER, 5=PACKING, 6=DISCHARGE
    cycle_phase_progress: float = 0.0
    ready_to_start: bool = True
    cycle_active: bool = False
    run_empty_active: bool = False
    fault_active: bool = False
    warning_active: bool = False
    start_permissive_ok: bool = True


@dataclass
class PlcOut:
    """PLC production counters — simulator writes, PLC reads."""
    grouped_count: int = 0
    target_group_count: int = 24
    cycle_count: int = 0
    good_pack_count: int = 0
    reject_pack_count: int = 0
    reject_accumulation_count: int = 0
    blanks_remaining: int = 100
    total_product_in: int = 0
    total_product_used: int = 0
    runtime_sec: float = 0.0
    downtime_sec: float = 0.0
    last_cycle_time_sec: float = 0.0
    avg_cycle_time_sec: float = 0.0
    last_pack_result: int = 0     # 0=GOOD, 1=REJECT
    last_reject_reason: int = 0   # 0=none, 1=INCOMPLETE_PACK, 2=OPEN_FLAP


@dataclass
class PlcFault:
    """PLC fault/alarm interface — simulator writes, PLC reads."""
    active_code: int = 0          # 0=none, 1-9 = fault codes
    active_severity: int = 0      # 0=INFO, 1=WARNING, 2=FAULT, 3=CRITICAL
    latched: bool = False
    active_count: int = 0
    last_acknowledged: int = 0    # Same codes as active_code


@dataclass
class PlcWarn:
    """PLC warning interface — simulator writes, PLC reads."""
    active_code: int = 0          # 0=none, 1=BLANK_LOW, 2=BLANK_EMPTY
    active_count: int = 0


@dataclass
class PlcSns:
    """PLC virtual sensor interface — simulator writes, PLC reads."""
    divider_gap_clear: bool = True
    divider_min_jam_ok: bool = True
    lane_fill_ok: bool = False
    lane_fill_mismatch: bool = False
    stopper_closed: bool = True
    terminal_closed: bool = False
    transfer_gap_clear: bool = True
    tray_stack_present: bool = True
    tray_vacuum_ok: bool = False
    tray_positioned: bool = False
    tray_in_transport: bool = False
    chain_clear: bool = True
    outlet_sensor_ok: bool = True
    tray_plate_sensor_ok: bool = True
    open_flap_detected: bool = False


@dataclass
class PlcPlc:
    """PLC scan cycle state — controller writes, PLC reads."""
    scan_counter: int = 0
    heartbeat_counter: int = 0
    comms_healthy: bool = True
    command_ack_code: int = 0     # 0=none, 1=accepted, 2=denied, 3=error
    last_command_code: int = 0    # 0-10
    current_mode: int = 0         # 0=AUTO, 1=MANUAL
    mode_ack: bool = False
    scan_duration_ms: float = 0.0


@dataclass
class PlcSnapshot:
    """Top-level PLC-facing snapshot.

    All fields are strictly numeric or boolean.
    No human-readable text, no ISO timestamps, no recipe names,
    no color strings, no footer/status text.
    """
    version: int = 0              # = scan_counter
    cmd: PlcCmd = field(default_factory=PlcCmd)
    sts: PlcSts = field(default_factory=PlcSts)
    out: PlcOut = field(default_factory=PlcOut)
    fault: PlcFault = field(default_factory=PlcFault)
    warn: PlcWarn = field(default_factory=PlcWarn)
    sns: PlcSns = field(default_factory=PlcSns)
    plc: PlcPlc = field(default_factory=PlcPlc)


# ------------------------------------------------------------------ #
#  Mapping Functions                                                 #
# ------------------------------------------------------------------ #

def tag_store_to_plc_snapshot(tags: Any) -> PlcSnapshot:
    """Map internal tag store to PLC-facing snapshot.

    Args:
        tags: TagStore instance

    Returns:
        PlcSnapshot with all string fields converted to integer codes.
    """
    s = tags.state

    return PlcSnapshot(
        version=s.plc["scan_counter"],
        cmd=PlcCmd(
            start=s.cmd["start"],
            stop=s.cmd["stop"],
            reset=s.cmd["reset"],
            run_empty=s.cmd["run_empty"],
            ack_alarm=s.cmd["ack_alarm"],
            clear_counts=s.cmd["clear_counts"],
            refill_blanks=s.cmd["refill_blanks"],
            clear_rejects=s.cmd["clear_rejects"],
            requested_mode=s.plc["requested_mode"],
            requested_recipe_code=recipe_to_int(s.cmd["recipe_select"]),
        ),
        sts=PlcSts(
            machine_state=MACHINE_STATE_CODES[s.sts["machine_state"]],
            machine_mode=MACHINE_MODE_CODES[s.sts["machine_mode"]],
            cycle_phase=CYCLE_PHASE_CODES[s.sts["cycle_phase"]],
            cycle_phase_progress=s.sts["cycle_phase_progress"],
            ready_to_start=s.sts["ready_to_start"],
            cycle_active=s.sts["cycle_active"],
            run_empty_active=s.sts["run_empty_active"],
            fault_active=s.sts["fault_active"],
            warning_active=s.sts["warning_active"],
            start_permissive_ok=s.sts["start_permissive_ok"],
        ),
        out=PlcOut(
            grouped_count=s.out["grouped_count"],
            target_group_count=s.out["target_group_count"],
            cycle_count=s.out["cycle_count"],
            good_pack_count=s.out["good_pack_count"],
            reject_pack_count=s.out["reject_pack_count"],
            reject_accumulation_count=s.out["reject_accumulation_count"],
            blanks_remaining=s.out["blanks_remaining"],
            total_product_in=s.out["total_product_in"],
            total_product_used=s.out["total_product_used"],
            runtime_sec=s.out["runtime_sec"],
            downtime_sec=s.out["downtime_sec"],
            last_cycle_time_sec=s.out["last_cycle_time_sec"],
            avg_cycle_time_sec=s.out["avg_cycle_time_sec"],
            last_pack_result=PACK_RESULT_CODES[s.out["last_pack_result"]],
            last_reject_reason=reject_reason_to_int(s.out["last_reject_reason"]),
        ),
        fault=PlcFault(
            active_code=fault_code_to_int(s.fault["active_code"]),
            active_severity=SEVERITY_CODES[s.fault["active_severity"]],
            latched=s.fault["latched"],
            active_count=s.fault["active_count"],
            last_acknowledged=fault_code_to_int(s.fault["last_acknowledged"]),
        ),
        warn=PlcWarn(
            active_code=warning_code_to_int(s.warn["active_code"]),
            active_count=s.warn["active_count"],
        ),
        sns=PlcSns(
            divider_gap_clear=s.sns["divider_gap_clear"],
            divider_min_jam_ok=s.sns["divider_min_jam_ok"],
            lane_fill_ok=s.sns["lane_fill_ok"],
            lane_fill_mismatch=s.sns["lane_fill_mismatch"],
            stopper_closed=s.sns["stopper_closed"],
            terminal_closed=s.sns["terminal_closed"],
            transfer_gap_clear=s.sns["transfer_gap_clear"],
            tray_stack_present=s.sns["tray_stack_present"],
            tray_vacuum_ok=s.sns["tray_vacuum_ok"],
            tray_positioned=s.sns["tray_positioned"],
            tray_in_transport=s.sns["tray_in_transport"],
            chain_clear=s.sns["chain_clear"],
            outlet_sensor_ok=s.sns["outlet_sensor_ok"],
            tray_plate_sensor_ok=s.sns["tray_plate_sensor_ok"],
            open_flap_detected=s.sns["open_flap_detected"],
        ),
        plc=PlcPlc(
            scan_counter=s.plc["scan_counter"],
            heartbeat_counter=s.plc["heartbeat_counter"],
            comms_healthy=s.plc["comms_healthy"],
            command_ack_code=s.plc["command_ack_code"],
            last_command_code=s.plc["last_command_code"],
            current_mode=s.plc["current_mode"],
            mode_ack=s.plc["mode_ack"],
            scan_duration_ms=s.plc["scan_duration_ms"],
        ),
    )
