"""Tests for tag ownership enforcement, validation, and pulse discipline (Phase D.2)."""
import pytest

from app.shared.tag_store import TagStore, TagValidationError
from app.shared.enums import MachineState, CyclePhase, MachineMode, Severity, PackResult


@pytest.fixture
def tags():
    return TagStore()


# ------------------------------------------------------------------ #
#  Ownership Enforcement
# ------------------------------------------------------------------ #

def test_write_cmd_accepts_valid_bool(tags):
    tags.write_cmd("start", True)
    assert tags.state.cmd["start"] is True


def test_write_cmd_rejects_invalid_key(tags):
    with pytest.raises(TagValidationError, match="Unknown command tag"):
        tags.write_cmd("nonexistent", True)


def test_write_cmd_rejects_non_bool(tags):
    with pytest.raises(TagValidationError, match="must be bool"):
        tags.write_cmd("start", "yes")


def test_write_cmd_accepts_recipe_select_string(tags):
    tags.write_cmd("recipe_select", "24-pack")
    assert tags.state.cmd["recipe_select"] == "24-pack"


def test_write_cmd_rejects_unknown_recipe(tags):
    with pytest.raises(TagValidationError, match="Unknown recipe"):
        tags.write_cmd("recipe_select", "99-pack")


def test_write_sts_accepts_valid_state(tags):
    tags.write_sts("machine_state", MachineState.RUNNING.value)
    assert tags.state.sts["machine_state"] == "RUNNING"


def test_write_sts_rejects_invalid_state(tags):
    with pytest.raises(TagValidationError, match="Invalid machine_state"):
        tags.write_sts("machine_state", "INVALID_STATE")


def test_write_sts_accepts_valid_phase(tags):
    tags.write_sts("cycle_phase", CyclePhase.GROUPING.value)
    assert tags.state.sts["cycle_phase"] == "GROUPING"


def test_write_sts_rejects_invalid_phase(tags):
    with pytest.raises(TagValidationError, match="Invalid cycle_phase"):
        tags.write_sts("cycle_phase", "INVALID_PHASE")


def test_write_sts_accepts_valid_mode(tags):
    tags.write_sts("machine_mode", MachineMode.MANUAL.value)
    assert tags.state.sts["machine_mode"] == "MANUAL"


def test_write_sts_rejects_invalid_mode(tags):
    with pytest.raises(TagValidationError, match="Invalid machine_mode"):
        tags.write_sts("machine_mode", "INVALID_MODE")


def test_write_sts_validates_progress_range(tags):
    tags.write_sts("cycle_phase_progress", 0.5)
    assert tags.state.sts["cycle_phase_progress"] == 0.5


def test_write_sts_rejects_progress_out_of_range(tags):
    with pytest.raises(TagValidationError, match="cycle_phase_progress must be 0.0-1.0"):
        tags.write_sts("cycle_phase_progress", 1.5)


def test_write_sns_accepts_valid_bool(tags):
    tags.write_sns("chain_clear", False)
    assert tags.state.sns["chain_clear"] is False


def test_write_sns_rejects_non_bool(tags):
    with pytest.raises(TagValidationError, match="must be bool"):
        tags.write_sns("chain_clear", 1)


def test_write_sns_rejects_unknown_key(tags):
    with pytest.raises(TagValidationError, match="Unknown sensor tag"):
        tags.write_sns("nonexistent_sensor", True)


def test_write_out_accepts_valid_counter(tags):
    tags.write_out("good_pack_count", 100)
    assert tags.state.out["good_pack_count"] == 100


def test_write_out_rejects_negative_counter(tags):
    with pytest.raises(TagValidationError, match="must be non-negative"):
        tags.write_out("good_pack_count", -1)


def test_write_out_accepts_zero_counter(tags):
    tags.write_out("good_pack_count", 0)
    assert tags.state.out["good_pack_count"] == 0


def test_write_out_rejects_invalid_pack_result(tags):
    with pytest.raises(TagValidationError, match="Invalid last_pack_result"):
        tags.write_out("last_pack_result", "UNKNOWN")


def test_write_fault_accepts_valid_severity(tags):
    tags.write_fault("active_severity", Severity.FAULT.value)
    assert tags.state.fault["active_severity"] == "FAULT"


def test_write_fault_rejects_invalid_severity(tags):
    with pytest.raises(TagValidationError, match="Invalid fault severity"):
        tags.write_fault("active_severity", "UNKNOWN")


def test_write_fault_rejects_negative_count(tags):
    with pytest.raises(TagValidationError, match="must be non-negative"):
        tags.write_fault("active_count", -1)


def test_write_warn_accepts_valid_severity(tags):
    tags.write_warn("active_severity", Severity.WARNING.value)
    assert tags.state.warn["active_severity"] == "WARNING"


def test_write_warn_rejects_negative_count(tags):
    with pytest.raises(TagValidationError, match="must be non-negative"):
        tags.write_warn("active_count", -1)


def test_write_inputs_accepts_valid_bool(tags):
    tags.write_inputs("product_available", False)
    assert tags.state.inputs["product_available"] is False


def test_write_inputs_rejects_non_bool(tags):
    with pytest.raises(TagValidationError, match="must be bool"):
        tags.write_inputs("product_available", "yes")


def test_write_plc_accepts_valid_command_code(tags):
    tags.write_plc("last_command_code", 5)
    assert tags.state.plc["last_command_code"] == 5


def test_write_plc_rejects_invalid_command_code(tags):
    with pytest.raises(TagValidationError, match="Command code must be 0-10"):
        tags.write_plc("last_command_code", 15)


def test_write_plc_accepts_valid_mode(tags):
    tags.write_plc("requested_mode", 1)
    assert tags.state.plc["requested_mode"] == 1


def test_write_plc_rejects_invalid_mode(tags):
    with pytest.raises(TagValidationError, match="Mode must be 0 or 1"):
        tags.write_plc("requested_mode", 2)


def test_write_plc_accepts_valid_ack_code(tags):
    tags.write_plc("command_ack_code", 1)
    assert tags.state.plc["command_ack_code"] == 1


def test_write_plc_rejects_invalid_ack_code(tags):
    with pytest.raises(TagValidationError, match="Command ack code must be 0-3"):
        tags.write_plc("command_ack_code", 5)


def test_write_cfg_accepts_valid_recipe(tags):
    tags.write_cfg("active_recipe_id", "27-pack")
    assert tags.state.cfg["active_recipe_id"] == "27-pack"


def test_write_cfg_rejects_unknown_recipe(tags):
    with pytest.raises(TagValidationError, match="Unknown recipe"):
        tags.write_cfg("active_recipe_id", "99-pack")


# ------------------------------------------------------------------ #
#  Pulse Discipline
# ------------------------------------------------------------------ #

def test_pulse_clear_resets_all_pulse_commands(tags):
    # Set multiple pulse commands
    tags.state.cmd["start"] = True
    tags.state.cmd["stop"] = True
    tags.state.cmd["reset"] = True
    tags.state.cmd["run_empty"] = True
    tags.state.cmd["ack_alarm"] = True
    tags.state.cmd["clear_counts"] = True
    tags.state.cmd["refill_blanks"] = True
    tags.state.cmd["clear_rejects"] = True

    tags.pulse_clear()

    assert tags.state.cmd["start"] is False
    assert tags.state.cmd["stop"] is False
    assert tags.state.cmd["reset"] is False
    assert tags.state.cmd["run_empty"] is False
    assert tags.state.cmd["ack_alarm"] is False
    assert tags.state.cmd["clear_counts"] is False
    assert tags.state.cmd["refill_blanks"] is False
    assert tags.state.cmd["clear_rejects"] is False


def test_pulse_clear_preserves_non_pulse_commands(tags):
    # Non-pulse commands should not be affected
    tags.state.cmd["recipe_select"] = "27-pack"
    tags.state.cmd["mode_auto"] = True

    tags.pulse_clear()

    assert tags.state.cmd["recipe_select"] == "27-pack"
    assert tags.state.cmd["mode_auto"] is True
