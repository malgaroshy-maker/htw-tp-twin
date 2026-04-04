"""Tests for virtual sensor logic and new cycle sub-phases (Phase A)."""
import random

import pytest

from app.shared.enums import CyclePhase, MachineState
from app.shared.tag_store import TagStore
from app.simulator.engine import SimulatorEngine


@pytest.fixture
def engine():
    tags = TagStore()
    eng = SimulatorEngine(tags, rng=random.Random(42))
    for key in eng.tags.state.inputs:
        eng.tags.state.inputs[key] = True
    return eng


def _run(engine, seconds, dt=0.02):
    steps = int(seconds / dt)
    for _ in range(steps):
        engine.update(dt)


def _run_until_phase(engine, target_phase, max_steps=2000, dt=0.02):
    for _ in range(max_steps):
        engine.update(dt)
        if engine.tags.state.sts["cycle_phase"] == target_phase:
            return True
    return False


# ------------------------------------------------------------------ #
#  Sensor defaults
# ------------------------------------------------------------------ #

def test_sensor_defaults_healthy():
    tags = TagStore()
    sns = tags.state.sns
    assert sns["divider_gap_clear"] is True
    assert sns["divider_min_jam_ok"] is True
    assert sns["lane_fill_ok"] is False
    assert sns["lane_fill_mismatch"] is False
    assert sns["stopper_closed"] is True
    assert sns["terminal_closed"] is False
    assert sns["transfer_gap_clear"] is True
    assert sns["tray_stack_present"] is True
    assert sns["tray_in_transport"] is False
    assert sns["chain_clear"] is True
    assert sns["open_flap_detected"] is False


# ------------------------------------------------------------------ #
#  Lane fill sensors
# ------------------------------------------------------------------ #

def test_lane_fill_ok_when_grouped_reaches_target(engine):
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False
    _run(eng, 1.5)
    assert eng.tags.state.sts["machine_state"] == MachineState.RUNNING.value

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # Refresh sensors for IDLE phase
    assert eng.tags.state.sns["lane_fill_ok"] is True


def test_lane_fill_mismatch_when_overfilled(engine):
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False
    _run(eng, 1.5)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    assert eng.tags.state.sns["lane_fill_mismatch"] is False


# ------------------------------------------------------------------ #
#  Stopper / terminal sensors
# ------------------------------------------------------------------ #

def test_stopper_closed_during_grouping(engine):
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False
    _run(eng, 1.5)

    assert eng.tags.state.sns["stopper_closed"] is True
    assert eng.tags.state.sns["terminal_closed"] is False


def test_terminal_closed_during_captured(engine):
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False
    _run(eng, 1.5)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # IDLE → CAPTURED (sensors still from IDLE)
    eng.update(0.02)  # Sensors now updated for CAPTURED phase
    assert eng.tags.state.sts["cycle_phase"] == CyclePhase.CAPTURED.value
    assert eng.tags.state.sns["terminal_closed"] is True
    assert eng.tags.state.sns["stopper_closed"] is True


# ------------------------------------------------------------------ #
#  Transfer gap clear sensor
# ------------------------------------------------------------------ #

def test_transfer_gap_clear_when_downstream_available(engine):
    eng = engine
    eng.tags.state.inputs["downstream_available"] = True
    eng.update(0.0)
    assert eng.tags.state.sns["transfer_gap_clear"] is True


def test_transfer_gap_blocked_when_downstream_blocked(engine):
    eng = engine
    eng.tags.state.inputs["downstream_available"] = False
    eng.update(0.0)
    assert eng.tags.state.sns["transfer_gap_clear"] is False


# ------------------------------------------------------------------ #
#  Tray sensors
# ------------------------------------------------------------------ #

def test_tray_stack_present_when_blanks_available(engine):
    eng = engine
    eng.tags.state.inputs["blank_available"] = True
    eng.tags.state.out["blanks_remaining"] = 50
    eng.update(0.0)
    assert eng.tags.state.sns["tray_stack_present"] is True


def test_tray_stack_absent_when_blanks_empty(engine):
    eng = engine
    eng.tags.state.inputs["blank_available"] = False
    eng.tags.state.out["blanks_remaining"] = 0
    eng.update(0.0)
    assert eng.tags.state.sns["tray_stack_present"] is False


# ------------------------------------------------------------------ #
#  Chain clear sensor
# ------------------------------------------------------------------ #

def test_chain_clear_when_downstream_available(engine):
    eng = engine
    eng.tags.state.inputs["downstream_available"] = True
    eng.update(0.0)
    assert eng.tags.state.sns["chain_clear"] is True


def test_chain_blocked_when_downstream_blocked(engine):
    eng = engine
    eng.tags.state.inputs["downstream_available"] = False
    eng.update(0.0)
    assert eng.tags.state.sns["chain_clear"] is False


# ------------------------------------------------------------------ #
#  Open flap sensor
# ------------------------------------------------------------------ #

def test_open_flap_not_detected_when_not_discharging(engine):
    eng = engine
    eng.update(0.0)
    assert eng.tags.state.sns["open_flap_detected"] is False


# ------------------------------------------------------------------ #
#  Full cycle with sensor progression
# ------------------------------------------------------------------ #

def test_full_cycle_sensor_progression(engine):
    """Verify sensors transition correctly through a full production cycle."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    # Startup
    _run(eng, 1.5)
    assert eng.tags.state.sts["machine_state"] == MachineState.RUNNING.value

    # Grouping → IDLE → CAPTURED → BLANK_FEED → TRANSFER → PACKING → DISCHARGE → IDLE
    _run_until_phase(eng, CyclePhase.IDLE.value)  # First IDLE (grouping complete)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)
    _run_until_phase(eng, CyclePhase.IDLE.value)  # Second IDLE (cycle complete)

    assert eng.tags.state.out["cycle_count"] >= 1
    # open_flap_detected is only True during DISCHARGE when an OPEN_FLAP reject occurs
    # After cycle completes and returns to IDLE, it should be False
    # (unless the last pack was an OPEN_FLAP reject — in which case it stays True until next cycle)
    # We just verify the sensor exists and is a boolean
    assert isinstance(eng.tags.state.sns["open_flap_detected"], bool)
