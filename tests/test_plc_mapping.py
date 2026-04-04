"""Tests for PLC-facing mapping functions and structures (Phase D.3)."""
import pytest

from app.shared.tag_store import TagStore
from app.shared.plc_mapping import (
    PlcSnapshot,
    PlcCmd,
    PlcSts,
    PlcOut,
    PlcFault,
    PlcWarn,
    PlcSns,
    PlcPlc,
    tag_store_to_plc_snapshot,
    fault_code_to_int,
    warning_code_to_int,
    recipe_to_int,
    reject_reason_to_int,
    MACHINE_STATE_CODES,
    MACHINE_MODE_CODES,
    CYCLE_PHASE_CODES,
    SEVERITY_CODES,
    PACK_RESULT_CODES,
    FAULT_CODE_MAP,
    WARNING_CODE_MAP,
    RECIPE_CODE_MAP,
    REJECT_REASON_MAP,
)


# ------------------------------------------------------------------ #
#  Mapping Tables
# ------------------------------------------------------------------ #

def test_machine_state_mapping_has_all_states():
    assert len(MACHINE_STATE_CODES) == 7
    assert MACHINE_STATE_CODES["STOPPED"] == 0
    assert MACHINE_STATE_CODES["STARTING"] == 1
    assert MACHINE_STATE_CODES["RUNNING"] == 2
    assert MACHINE_STATE_CODES["STARVED"] == 3
    assert MACHINE_STATE_CODES["BLOCKED"] == 4
    assert MACHINE_STATE_CODES["FAULTED"] == 5
    assert MACHINE_STATE_CODES["RUN_EMPTY"] == 6


def test_machine_mode_mapping():
    assert MACHINE_MODE_CODES["AUTO"] == 0
    assert MACHINE_MODE_CODES["MANUAL"] == 1


def test_cycle_phase_mapping_has_all_phases():
    assert len(CYCLE_PHASE_CODES) == 7
    assert CYCLE_PHASE_CODES["IDLE"] == 0
    assert CYCLE_PHASE_CODES["GROUPING"] == 1
    assert CYCLE_PHASE_CODES["CAPTURED"] == 2
    assert CYCLE_PHASE_CODES["BLANK_FEED"] == 3
    assert CYCLE_PHASE_CODES["TRANSFER"] == 4
    assert CYCLE_PHASE_CODES["PACKING"] == 5
    assert CYCLE_PHASE_CODES["DISCHARGE"] == 6


def test_severity_mapping():
    assert SEVERITY_CODES["INFO"] == 0
    assert SEVERITY_CODES["WARNING"] == 1
    assert SEVERITY_CODES["FAULT"] == 2
    assert SEVERITY_CODES["CRITICAL"] == 3


def test_pack_result_mapping():
    assert PACK_RESULT_CODES["GOOD"] == 0
    assert PACK_RESULT_CODES["REJECT"] == 1


def test_fault_code_mapping():
    assert fault_code_to_int("") == 0
    assert fault_code_to_int("STARVATION") == 1
    assert fault_code_to_int("DOWNSTREAM_BLOCK") == 2
    assert fault_code_to_int("BLANK_MISSING") == 3
    assert fault_code_to_int("GAP_CONTROL_JAM") == 4
    assert fault_code_to_int("INCOMPLETE_PACK") == 5
    assert fault_code_to_int("OPEN_FLAP") == 6
    assert fault_code_to_int("REJECT_BIN_FULL") == 7
    assert fault_code_to_int("REJECT_BIN_NEAR_FULL") == 8
    assert fault_code_to_int("TRANSPORT_CHAIN_GAP") == 9


def test_fault_code_mapping_rejects_unknown():
    with pytest.raises(ValueError, match="Unknown PLC code mapping"):
        fault_code_to_int("UNKNOWN_FAULT")


def test_warning_code_mapping():
    assert warning_code_to_int("") == 0
    assert warning_code_to_int("BLANK_LOW") == 1
    assert warning_code_to_int("BLANK_EMPTY") == 2


def test_warning_code_mapping_rejects_unknown():
    with pytest.raises(ValueError, match="Unknown PLC code mapping"):
        warning_code_to_int("UNKNOWN_WARNING")


def test_recipe_code_mapping():
    assert recipe_to_int("21-pack") == 0
    assert recipe_to_int("24-pack") == 1
    assert recipe_to_int("27-pack") == 2
    assert recipe_to_int("30-pack") == 3


def test_recipe_code_mapping_rejects_unknown():
    with pytest.raises(ValueError, match="Unknown PLC code mapping"):
        recipe_to_int("99-pack")


def test_reject_reason_mapping():
    assert reject_reason_to_int("") == 0
    assert reject_reason_to_int("INCOMPLETE_PACK") == 1
    assert reject_reason_to_int("OPEN_FLAP") == 2


def test_reject_reason_mapping_rejects_unknown():
    with pytest.raises(ValueError, match="Unknown PLC code mapping"):
        reject_reason_to_int("UNKNOWN_REASON")


# ------------------------------------------------------------------ #
#  PLC Snapshot Structure
# ------------------------------------------------------------------ #

def test_plc_snapshot_has_all_groups():
    snapshot = PlcSnapshot()
    assert isinstance(snapshot.cmd, PlcCmd)
    assert isinstance(snapshot.sts, PlcSts)
    assert isinstance(snapshot.out, PlcOut)
    assert isinstance(snapshot.fault, PlcFault)
    assert isinstance(snapshot.warn, PlcWarn)
    assert isinstance(snapshot.sns, PlcSns)
    assert isinstance(snapshot.plc, PlcPlc)


def test_plc_snapshot_version_defaults_to_zero():
    assert PlcSnapshot().version == 0


def test_plc_snapshot_uses_integers_not_strings():
    """All PLC-facing fields should be int or bool, not strings."""
    snapshot = PlcSnapshot()

    # Sts fields
    assert isinstance(snapshot.sts.machine_state, int)
    assert isinstance(snapshot.sts.machine_mode, int)
    assert isinstance(snapshot.sts.cycle_phase, int)
    assert isinstance(snapshot.sts.cycle_phase_progress, float)

    # Out fields
    assert isinstance(snapshot.out.cycle_count, int)
    assert isinstance(snapshot.out.good_pack_count, int)
    assert isinstance(snapshot.out.last_pack_result, int)
    assert isinstance(snapshot.out.last_reject_reason, int)

    # Fault fields
    assert isinstance(snapshot.fault.active_code, int)
    assert isinstance(snapshot.fault.active_severity, int)

    # Warn fields
    assert isinstance(snapshot.warn.active_code, int)

    # Cmd fields
    assert isinstance(snapshot.cmd.requested_mode, int)
    assert isinstance(snapshot.cmd.requested_recipe_code, int)

    # Plc fields
    assert isinstance(snapshot.plc.scan_counter, int)
    assert isinstance(snapshot.plc.command_ack_code, int)


def test_plc_snapshot_excludes_string_fields():
    """PLC snapshot should not contain human-readable text fields."""
    snapshot = PlcSnapshot()
    import dataclasses

    def check_no_strings(obj, path=""):
        if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
            for field in dataclasses.fields(obj):
                value = getattr(obj, field.name)
                check_no_strings(value, f"{path}.{field.name}")
        else:
            assert not isinstance(obj, str), f"String field found: {path}"

    check_no_strings(snapshot)


# ------------------------------------------------------------------ #
#  Tag Store to PLC Snapshot Mapping
# ------------------------------------------------------------------ #

def test_plc_snapshot_reflects_current_state():
    """Snapshot should reflect actual tag store values."""
    tags = TagStore()
    tags.state.sts["machine_state"] = "RUNNING"
    tags.state.sts["machine_mode"] = "AUTO"
    tags.state.sts["cycle_phase"] = "GROUPING"
    tags.state.out["good_pack_count"] = 42
    tags.state.out["reject_pack_count"] = 3
    tags.state.fault["active_code"] = ""
    tags.state.plc["scan_counter"] = 10

    snapshot = tag_store_to_plc_snapshot(tags)

    assert snapshot.sts.machine_state == 2  # RUNNING
    assert snapshot.sts.machine_mode == 0   # AUTO
    assert snapshot.sts.cycle_phase == 1    # GROUPING
    assert snapshot.out.good_pack_count == 42
    assert snapshot.out.reject_pack_count == 3
    assert snapshot.fault.active_code == 0  # none
    assert snapshot.version == 10


def test_plc_snapshot_version_equals_scan_counter():
    tags = TagStore()
    tags.state.plc["scan_counter"] = 55
    snapshot = tag_store_to_plc_snapshot(tags)
    assert snapshot.version == 55


def test_plc_snapshot_maps_fault_codes():
    tags = TagStore()
    tags.state.fault["active_code"] = "BLANK_MISSING"
    tags.state.fault["active_severity"] = "FAULT"
    tags.state.fault["latched"] = True
    tags.state.fault["active_count"] = 2

    snapshot = tag_store_to_plc_snapshot(tags)

    assert snapshot.fault.active_code == 3  # BLANK_MISSING
    assert snapshot.fault.active_severity == 2  # FAULT
    assert snapshot.fault.latched is True
    assert snapshot.fault.active_count == 2


def test_plc_snapshot_maps_warning_codes():
    tags = TagStore()
    tags.state.warn["active_code"] = "BLANK_LOW"
    tags.state.warn["active_count"] = 1

    snapshot = tag_store_to_plc_snapshot(tags)

    assert snapshot.warn.active_code == 1  # BLANK_LOW
    assert snapshot.warn.active_count == 1


def test_plc_snapshot_maps_recipe_code():
    tags = TagStore()
    tags.state.cmd["recipe_select"] = "27-pack"

    snapshot = tag_store_to_plc_snapshot(tags)

    assert snapshot.cmd.requested_recipe_code == 2  # 27-pack


def test_plc_snapshot_maps_pack_result():
    tags = TagStore()
    tags.state.out["last_pack_result"] = "REJECT"
    tags.state.out["last_reject_reason"] = "OPEN_FLAP"

    snapshot = tag_store_to_plc_snapshot(tags)

    assert snapshot.out.last_pack_result == 1  # REJECT
    assert snapshot.out.last_reject_reason == 2  # OPEN_FLAP


def test_plc_snapshot_maps_all_sensors():
    tags = TagStore()
    tags.state.sns["chain_clear"] = False
    tags.state.sns["tray_stack_present"] = False
    tags.state.sns["open_flap_detected"] = True

    snapshot = tag_store_to_plc_snapshot(tags)

    assert snapshot.sns.chain_clear is False
    assert snapshot.sns.tray_stack_present is False
    assert snapshot.sns.open_flap_detected is True


def test_plc_snapshot_deterministic():
    """Same tag store state should produce identical snapshot."""
    tags = TagStore()
    tags.state.sts["machine_state"] = "RUNNING"
    tags.state.out["good_pack_count"] = 100

    snap1 = tag_store_to_plc_snapshot(tags)
    snap2 = tag_store_to_plc_snapshot(tags)

    from dataclasses import asdict
    assert asdict(snap1) == asdict(snap2)


def test_plc_snapshot_cmd_is_requested_view():
    """Cmd in snapshot represents requested commands, not machine truth."""
    tags = TagStore()
    tags.state.cmd["start"] = True
    tags.state.cmd["recipe_select"] = "30-pack"
    tags.state.plc["requested_mode"] = 1  # MANUAL

    snapshot = tag_store_to_plc_snapshot(tags)

    assert snapshot.cmd.start is True
    assert snapshot.cmd.requested_recipe_code == 3  # 30-pack
    assert snapshot.cmd.requested_mode == 1  # MANUAL
