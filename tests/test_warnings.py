"""Tests for warning escalation and BLANK_FEED sub-sequence (Phase B)."""
import random

import pytest

from app.shared.enums import CyclePhase, MachineState, Severity
from app.shared.tag_store import TagStore
from app.simulator.engine import SimulatorEngine


@pytest.fixture
def engine():
    tags = TagStore()
    eng = SimulatorEngine(tags, rng=random.Random(42))
    for key in eng.tags.state.inputs:
        eng.tags.state.inputs[key] = True
    return eng


def _run_until_phase(engine, target_phase, max_steps=2000, dt=0.02):
    for _ in range(max_steps):
        engine.update(dt)
        if engine.tags.state.sts["cycle_phase"] == target_phase:
            return True
    return False


# ------------------------------------------------------------------ #
#  BLANK_FEED sub-sequence
# ------------------------------------------------------------------ #

def test_blank_feed_subsequence_progresses(engine):
    """Verify BLANK_FEED goes through magazine_check → suction → position → ready."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    # Run startup
    for _ in range(75):
        eng.update(0.02)
    assert eng.tags.state.sts["machine_state"] == MachineState.RUNNING.value

    # Run until grouping completes
    _run_until_phase(eng, CyclePhase.IDLE.value)

    # IDLE → CAPTURED
    eng.update(0.02)
    assert eng.tags.state.sts["cycle_phase"] == CyclePhase.CAPTURED.value

    # CAPTURED → BLANK_FEED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)

    # Check sub-sequence starts at magazine_check
    assert eng._blank_feed_subphase == "magazine_check"

    # Run through BLANK_FEED sub-sequence
    _run_until_phase(eng, CyclePhase.TRANSFER.value)

    # Sub-sequence should have completed
    assert eng._blank_feed_subphase == "ready"


def test_tray_vacuum_ok_during_suction(engine):
    """tray_vacuum_ok should be True only during suction subphase."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)

    # During magazine_check: vacuum not yet engaged
    assert eng.tags.state.sns["tray_vacuum_ok"] is False

    # Run through magazine_check (0.05s) and into suction
    for _ in range(10):
        eng.update(0.02)
        if eng._blank_feed_subphase == "suction":
            break

    # After sensor update for suction phase, vacuum should be OK
    eng.update(0.02)
    assert eng.tags.state.sns["tray_vacuum_ok"] is True


def test_tray_positioned_after_position_subphase(engine):
    """tray_positioned should be True after position subphase completes."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)

    # Run through suction and position
    _run_until_phase(eng, CyclePhase.TRANSFER.value)

    # tray_positioned should be True
    assert eng.tags.state.sns["tray_positioned"] is True


# ------------------------------------------------------------------ #
#  Warning escalation
# ------------------------------------------------------------------ #

def test_blank_low_warning_when_blanks_below_threshold(engine):
    """BLANK_LOW warning should trigger when blanks_remaining < 20."""
    eng = engine
    eng.tags.state.out["blanks_remaining"] = 15
    eng.tags.state.inputs["blank_available"] = True
    eng.update(0.0)

    warn = eng.tags.state.warn
    assert warn["active_code"] == "BLANK_LOW"
    assert eng.tags.state.sts["warning_active"] is True


def test_blank_empty_warning_when_no_blanks(engine):
    """BLANK_EMPTY warning should trigger when blanks_remaining == 0."""
    eng = engine
    eng.tags.state.out["blanks_remaining"] = 0
    eng.tags.state.inputs["blank_available"] = False
    eng.update(0.0)

    warn = eng.tags.state.warn
    assert warn["active_code"] == "BLANK_EMPTY"


def test_warning_auto_clears_when_blanks_refilled(engine):
    """Warnings should auto-clear when blanks are refilled (no Reset needed)."""
    eng = engine
    eng.tags.state.out["blanks_remaining"] = 10
    eng.tags.state.inputs["blank_available"] = True
    eng.update(0.0)
    assert eng.tags.state.warn["active_code"] == "BLANK_LOW"

    # Refill blanks
    eng.tags.state.out["blanks_remaining"] = 100
    eng.tags.state.inputs["blank_available"] = True
    eng.update(0.0)

    # Warning should auto-clear
    assert eng.tags.state.warn["active_code"] == ""
    assert eng.tags.state.sts["warning_active"] is False


def test_blank_empty_escalates_to_fault_after_cycles(engine):
    """BLANK_EMPTY should escalate to BLANK_MISSING fault after N cycles."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)

    # Remove blanks
    eng.tags.state.out["blanks_remaining"] = 0
    eng.tags.state.inputs["blank_available"] = False

    # Run multiple cycles — should escalate to fault
    for _ in range(200):
        eng.update(0.02)
        if eng.tags.state.sts["machine_state"] == MachineState.FAULTED.value:
            break

    assert eng.tags.state.sts["machine_state"] == MachineState.FAULTED.value
    assert eng.tags.state.fault["active_code"] == "BLANK_MISSING"


def test_refill_blanks_resets_escalation_counter(engine):
    """Refilling blanks should reset the blank_empty_cycles counter."""
    eng = engine
    eng.tags.state.out["blanks_remaining"] = 0
    eng.tags.state.inputs["blank_available"] = False
    eng._blank_empty_cycles = 2  # Simulate near-escalation

    # Refill
    eng.tags.state.cmd["refill_blanks"] = True
    eng.update(0.0)
    eng.tags.state.cmd["refill_blanks"] = False

    assert eng._blank_empty_cycles == 0
    assert eng.tags.state.warn["active_code"] == ""


# ------------------------------------------------------------------ #
#  Warning vs Fault distinction
# ------------------------------------------------------------------ #

def test_warning_does_not_stop_machine(engine):
    """A warning should not change the machine state."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    assert eng.tags.state.sts["machine_state"] == MachineState.RUNNING.value

    # Trigger a warning
    eng.tags.state.out["blanks_remaining"] = 10
    eng.update(0.0)

    assert eng.tags.state.sts["warning_active"] is True
    assert eng.tags.state.sts["machine_state"] == MachineState.RUNNING.value


def test_fault_stops_machine(engine):
    """A fault should stop the machine."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)

    # Remove blanks — should eventually fault
    eng.tags.state.out["blanks_remaining"] = 0
    eng.tags.state.inputs["blank_available"] = False

    for _ in range(200):
        eng.update(0.02)
        if eng.tags.state.sts["machine_state"] == MachineState.FAULTED.value:
            break

    assert eng.tags.state.sts["machine_state"] == MachineState.FAULTED.value
    # When fault triggers, warning is cleared by _trigger_fault path
    # (the warning system will clear it on next _process_warning_escalation)
    eng.update(0.02)  # One more update to clear warning
    assert eng.tags.state.sts["warning_active"] is False
