"""Tests for PLC scan cycle, heartbeat, and comms health (Phase D.1)."""
import random
import time

import pytest

from app.shared.tag_store import TagStore
from app.shared.enums import MachineState, CyclePhase
from app.shared.plc_mapping import PlcSnapshot
from app.control.controller import PLCStyleController


@pytest.fixture
def controller():
    tags = TagStore()
    return PLCStyleController(tags)


@pytest.fixture
def running_controller():
    """Controller with machine in RUNNING state."""
    tags = TagStore()
    tags.state.sts["machine_state"] = MachineState.RUNNING.value
    tags.state.sts["cycle_phase"] = CyclePhase.GROUPING.value
    return PLCStyleController(tags)


# ------------------------------------------------------------------ #
#  PLC Scan Cycle
# ------------------------------------------------------------------ #

def test_scan_cycle_increments_counter(controller):
    """Each scan cycle should increment the scan counter."""
    result1 = controller.scan_cycle()
    assert isinstance(result1, PlcSnapshot)
    assert result1.version == 1
    assert result1.plc.scan_counter == 1

    result2 = controller.scan_cycle()
    assert result2.version == 2
    assert result2.plc.scan_counter == 2

    result3 = controller.scan_cycle()
    assert result3.version == 3
    assert result3.plc.scan_counter == 3


def test_scan_cycle_increments_heartbeat(controller):
    """Each scan cycle should increment the heartbeat counter."""
    controller.scan_cycle()
    assert controller.tags.state.plc["heartbeat_counter"] == 1

    controller.scan_cycle()
    assert controller.tags.state.plc["heartbeat_counter"] == 2


def test_scan_cycle_returns_plc_snapshot(controller):
    """Scan cycle should return a PlcSnapshot with expected groups."""
    result = controller.scan_cycle()

    assert isinstance(result, PlcSnapshot)
    assert result.sts is not None
    assert result.out is not None
    assert result.fault is not None
    assert result.warn is not None
    assert result.sns is not None
    assert result.plc is not None
    assert result.cmd is not None


def test_scan_cycle_measures_duration(controller):
    """Scan cycle should measure scan duration in milliseconds."""
    result = controller.scan_cycle()
    assert result.plc.scan_duration_ms >= 0
    assert isinstance(result.plc.scan_duration_ms, float)


# ------------------------------------------------------------------ #
#  Command Handshake
# ------------------------------------------------------------------ #

def test_command_code_accepted_when_enabled(controller):
    """Command code 1 (START) should be accepted when start button is enabled."""
    # Machine is STOPPED, permissives OK → start button enabled
    result = controller.scan_cycle({"command_code": 1})
    assert result.plc.command_ack_code == 1  # Accepted
    assert result.plc.last_command_code == 1


def test_command_code_denied_when_disabled(running_controller):
    """Command code 1 (START) should be denied when start button is disabled."""
    # Machine is RUNNING → start button disabled
    result = running_controller.scan_cycle({"command_code": 1})
    assert result.plc.command_ack_code == 2  # Denied


def test_command_ack_resets_each_cycle(controller):
    """Command acknowledgement should reset at the start of each cycle."""
    # First cycle with command
    controller.scan_cycle({"command_code": 1})
    assert controller.tags.state.plc["command_ack_code"] == 1

    # Second cycle without command → ack should reset to 0
    result = controller.scan_cycle()
    assert result.plc.command_ack_code == 0


def test_invalid_command_code(controller):
    """Invalid command code should be denied."""
    result = controller.scan_cycle({"command_code": 99})
    assert result.plc.command_ack_code == 2  # Denied


# ------------------------------------------------------------------ #
#  Mode Handshake
# ------------------------------------------------------------------ #

def test_mode_handshake_syncs_when_modes_match(controller):
    """Mode ACK should be True when current mode matches requested mode."""
    # Default is AUTO (0), request AUTO
    controller.scan_cycle({"requested_mode": 0})
    assert controller.tags.state.plc["mode_ack"] is True


def test_mode_handshake_pending_when_modes_differ(controller):
    """Mode ACK should be False when current mode differs from requested mode."""
    # Default is AUTO (0), request MANUAL (1)
    controller.scan_cycle({"requested_mode": 1})
    assert controller.tags.state.plc["mode_ack"] is False


def test_current_mode_reflects_actual_state(controller):
    """Current mode in PLC should reflect actual machine mode."""
    controller.tags.state.sts["machine_mode"] = "AUTO"
    controller.scan_cycle()
    assert controller.tags.state.plc["current_mode"] == 0

    controller.tags.state.sts["machine_mode"] = "MANUAL"
    controller.scan_cycle()
    assert controller.tags.state.plc["current_mode"] == 1


# ------------------------------------------------------------------ #
#  Comms Health
# ------------------------------------------------------------------ #

def test_comms_healthy_on_first_scan(controller):
    """Comms should be healthy on first scan."""
    controller.scan_cycle()
    assert controller.check_comms_health() is True
    assert controller.tags.state.plc["comms_healthy"] is True


def test_comms_unhealthy_after_timeout(controller):
    """Comms should be unhealthy if no scan for longer than timeout."""
    controller.scan_cycle()

    # Simulate time passing beyond timeout
    fake_now = controller.tags.state.plc["last_scan_ts"] + 10.0  # 10 seconds later
    assert controller.check_comms_health(current_time=fake_now) is False
    assert controller.tags.state.plc["comms_healthy"] is False


def test_comms_healthy_within_timeout(controller):
    """Comms should be healthy if scan is recent."""
    controller.scan_cycle()

    # Simulate time within timeout
    fake_now = controller.tags.state.plc["last_scan_ts"] + 2.0  # 2 seconds later
    assert controller.check_comms_health(current_time=fake_now) is True


def test_comms_timeout_is_configurable(controller):
    """Comms timeout should be configurable."""
    controller.tags.state.plc["comms_timeout_sec"] = 1.0
    controller.scan_cycle()

    # 0.5 seconds should be healthy
    fake_now = controller.tags.state.plc["last_scan_ts"] + 0.5
    assert controller.check_comms_health(current_time=fake_now) is True

    # 1.5 seconds should be unhealthy
    fake_now = controller.tags.state.plc["last_scan_ts"] + 1.5
    assert controller.check_comms_health(current_time=fake_now) is False


# ------------------------------------------------------------------ #
#  PLC Scan Result Structure
# ------------------------------------------------------------------ #

def test_plc_scan_result_contains_required_fields(controller):
    """PLC scan result should contain all required fields for PLC integration."""
    result = controller.scan_cycle()

    # Top-level fields
    assert isinstance(result.version, int)

    # PLC-specific fields
    assert isinstance(result.plc.scan_counter, int)
    assert isinstance(result.plc.heartbeat_counter, int)
    assert isinstance(result.plc.command_ack_code, int)
    assert isinstance(result.plc.last_command_code, int)
    assert isinstance(result.plc.current_mode, int)
    assert isinstance(result.plc.mode_ack, bool)
    assert isinstance(result.plc.comms_healthy, bool)


def test_plc_scan_result_uses_integer_codes(controller):
    """PLC scan result should use integer codes, not strings, for PLC-facing fields."""
    result = controller.scan_cycle()

    assert isinstance(result.version, int)
    assert isinstance(result.sts.machine_state, int)
    assert isinstance(result.sts.machine_mode, int)
    assert isinstance(result.sts.cycle_phase, int)
    assert isinstance(result.out.last_pack_result, int)
    assert isinstance(result.out.last_reject_reason, int)
    assert isinstance(result.fault.active_code, int)
    assert isinstance(result.fault.active_severity, int)
    assert isinstance(result.warn.active_code, int)
    assert isinstance(result.cmd.requested_mode, int)
    assert isinstance(result.cmd.requested_recipe_code, int)
    assert isinstance(result.plc.command_ack_code, int)
    assert isinstance(result.plc.last_command_code, int)
    assert isinstance(result.plc.current_mode, int)
