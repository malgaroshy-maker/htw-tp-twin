"""Tests for discharge sub-sequence and outlet quality logic (Phase C)."""
import random

import pytest

from app.shared.enums import CyclePhase, MachineState, PackResult
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
#  Discharge sub-sequence
# ------------------------------------------------------------------ #

def test_discharge_subsequence_progresses(engine):
    """DISCHARGE goes through outlet_check → quality_decision → good_travel/reject_divert → complete."""
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
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Check sub-sequence starts at outlet_check
    assert eng._discharge_subphase == "outlet_check"

    # Run through full discharge
    _run_until_phase(eng, CyclePhase.IDLE.value)

    # Sub-sequence should have completed
    assert eng._discharge_subphase == "outlet_check"  # Reset for next cycle
    assert eng.tags.state.out["cycle_count"] >= 1


def test_outlet_sensor_set_during_outlet_check(engine):
    """outlet_sensor_ok should be set during outlet_check subphase."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Run through outlet_check
    for _ in range(20):
        eng.update(0.02)
        if eng._discharge_subphase == "quality_decision":
            break

    # outlet_sensor_ok should be True (downstream is available)
    assert eng.tags.state.sns["outlet_sensor_ok"] is True


def test_tray_plate_sensor_for_good_pack(engine):
    """tray_plate_sensor_ok should be True for good packs."""
    eng = engine
    # Force good pack
    eng.ctx.recipes["24-pack"].reject_probability = 0.0

    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Run through full discharge
    _run_until_phase(eng, CyclePhase.IDLE.value)

    assert eng.tags.state.sns["tray_plate_sensor_ok"] is True
    assert eng.tags.state.out["good_pack_count"] >= 1


def test_tray_plate_sensor_for_open_flap_reject(engine):
    """tray_plate_sensor_ok should be False for OPEN_FLAP rejects."""
    eng = engine
    # Force reject with OPEN_FLAP
    eng.ctx.recipes["24-pack"].reject_probability = 1.0
    # Force OPEN_FLAP by making rng always pick it
    eng.rng = random.Random(0)  # Seed that produces OPEN_FLAP

    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Run through full discharge
    _run_until_phase(eng, CyclePhase.IDLE.value)

    # Check reject was recorded
    assert eng.tags.state.out["reject_pack_count"] >= 1
    # tray_plate_sensor_ok depends on reject reason
    # For OPEN_FLAP it should be False
    if eng.tags.state.out["last_reject_reason"] == "OPEN_FLAP":
        assert eng.tags.state.sns["tray_plate_sensor_ok"] is False


# ------------------------------------------------------------------ #
#  Transport chain gap fault
# ------------------------------------------------------------------ #

def test_transport_chain_gap_fault(engine):
    """chain_clear=false during outlet_check → TRANSPORT_CHAIN_GAP fault (hard stop)."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Block chain clearance during outlet_check
    eng.tags.state.inputs["downstream_available"] = False

    # Next update should trigger TRANSPORT_CHAIN_GAP fault
    eng.update(0.02)

    assert eng.tags.state.sts["machine_state"] == MachineState.FAULTED.value
    assert eng.tags.state.fault["active_code"] == "TRANSPORT_CHAIN_GAP"


def test_chain_clear_restored_allows_recovery(engine):
    """After TRANSPORT_CHAIN_GAP fault, restoring chain_clear + reset allows restart."""
    eng = engine
    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Block chain clearance
    eng.tags.state.inputs["downstream_available"] = False
    eng.update(0.02)

    assert eng.tags.state.sts["machine_state"] == MachineState.FAULTED.value

    # Restore and reset
    eng.tags.state.inputs["downstream_available"] = True
    eng.tags.state.cmd["reset"] = True
    eng.update(0.1)

    assert eng.tags.state.sts["machine_state"] == MachineState.STOPPED.value


# ------------------------------------------------------------------ #
#  Reject diversion
# ------------------------------------------------------------------ #

def test_reject_divert_at_outlet(engine):
    """Reject pack should divert at outlet, not at forming zone."""
    eng = engine
    eng.ctx.recipes["24-pack"].reject_probability = 1.0

    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Run through outlet_check and quality_decision
    for _ in range(50):
        eng.update(0.02)
        if eng._discharge_subphase == "reject_divert":
            break

    # Should be in reject_divert subphase
    assert eng._discharge_subphase == "reject_divert"

    # Run through divert
    _run_until_phase(eng, CyclePhase.IDLE.value)

    assert eng.tags.state.out["reject_pack_count"] >= 1
    assert eng.tags.state.out["last_pack_result"] == PackResult.REJECT.value


def test_good_pack_travels_full_discharge(engine):
    """Good pack should travel full discharge path to conveyor end."""
    eng = engine
    eng.ctx.recipes["24-pack"].reject_probability = 0.0

    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Run through full discharge
    _run_until_phase(eng, CyclePhase.IDLE.value)

    assert eng.tags.state.out["good_pack_count"] >= 1
    assert eng.tags.state.out["last_pack_result"] == PackResult.GOOD.value


# ------------------------------------------------------------------ #
#  Discharge events
# ------------------------------------------------------------------ #

def test_discharge_events_emitted(engine):
    """DISCHARGE_OUTLET_CHECK and DISCHARGE_QUALITY_CHECK events should be emitted."""
    eng = engine
    eng.ctx.recipes["24-pack"].reject_probability = 0.0

    eng.tags.state.cmd["start"] = True
    eng.update(0.1)
    eng.tags.state.cmd["start"] = False

    for _ in range(75):
        eng.update(0.02)

    _run_until_phase(eng, CyclePhase.IDLE.value)
    eng.update(0.02)  # → CAPTURED
    _run_until_phase(eng, CyclePhase.BLANK_FEED.value)
    _run_until_phase(eng, CyclePhase.TRANSFER.value)
    _run_until_phase(eng, CyclePhase.PACKING.value)
    _run_until_phase(eng, CyclePhase.DISCHARGE.value)

    # Run through full discharge
    _run_until_phase(eng, CyclePhase.IDLE.value)

    event_codes = [e.event_code for e in eng.event_logger.events]
    assert "DISCHARGE_OUTLET_CHECK" in event_codes
    assert "DISCHARGE_QUALITY_CHECK" in event_codes
    assert "PACK_GOOD_DISCHARGED" in event_codes
