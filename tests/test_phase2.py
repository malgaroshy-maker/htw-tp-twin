import random
import pytest
from app.shared.tag_store import TagStore
from app.shared.enums import MachineState, CyclePhase, Severity, PackResult
from app.simulator.engine import SimulatorEngine

@pytest.fixture
def engine():
    tags = TagStore()
    rng = random.Random(42)
    return SimulatorEngine(tags, rng=rng)

def _run_until_phase(engine, target_phase, max_steps=2000, dt=0.02):
    for _ in range(max_steps):
        engine.update(dt)
        if engine.tags.state.sts["cycle_phase"] == target_phase:
            return True
    return False

def test_normal_production_cycle(engine):
    tags = engine.tags
    
    # 1. Start the machine
    tags.state.cmd["start"] = True
    engine.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.STARTING.value
    
    # 2. Wait for startup → RUNNING + GROUPING
    assert _run_until_phase(engine, CyclePhase.GROUPING.value)
    assert tags.state.sts["machine_state"] == MachineState.RUNNING.value
    
    # 3. Grouping → IDLE (24 products)
    assert _run_until_phase(engine, CyclePhase.IDLE.value)
    assert tags.state.out["grouped_count"] == 24
    
    # 4. IDLE → CAPTURED (next update after grouping complete)
    engine.update(0.02)
    assert tags.state.sts["cycle_phase"] == CyclePhase.CAPTURED.value
    
    # 5. CAPTURED → BLANK_FEED (0.3s capture timer)
    assert _run_until_phase(engine, CyclePhase.BLANK_FEED.value)
    
    # 6. BLANK_FEED → TRANSFER (0.64s blank feed timer)
    assert _run_until_phase(engine, CyclePhase.TRANSFER.value)
    
    # 7. TRANSFER → PACKING (0.32s transfer timer)
    assert _run_until_phase(engine, CyclePhase.PACKING.value)
    
    # 8. PACKING → DISCHARGE (1.12s packing timer)
    assert _run_until_phase(engine, CyclePhase.DISCHARGE.value)
    
    # 9. DISCHARGE → IDLE (0.80s discharge timer)
    assert _run_until_phase(engine, CyclePhase.IDLE.value)
    
    assert tags.state.out["cycle_count"] == 1
    assert tags.state.out["good_pack_count"] + tags.state.out["reject_pack_count"] == 1

def test_starvation_recovery(engine):
    tags = engine.tags
    tags.state.cmd["start"] = True
    engine.update(1.1)
    
    tags.state.inputs["product_available"] = False
    engine.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.STARVED.value
    
    tags.state.inputs["product_available"] = True
    engine.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.RUNNING.value

def test_blockage_recovery(engine):
    tags = engine.tags
    tags.state.cmd["start"] = True
    engine.update(1.1)
    
    _run_until_phase(engine, CyclePhase.IDLE.value)
    
    tags.state.inputs["downstream_available"] = False
    engine.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.BLOCKED.value
    
    tags.state.inputs["downstream_available"] = True
    engine.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.RUNNING.value

def test_blank_missing_fault(engine):
    tags = engine.tags
    tags.state.cmd["start"] = True
    engine.update(1.1)
    
    _run_until_phase(engine, CyclePhase.IDLE.value)
    
    # Lose blanks before the CAPTURED phase checks them
    tags.state.inputs["blank_available"] = False
    engine.update(0.02)  # IDLE → CAPTURED
    assert tags.state.sts["cycle_phase"] == CyclePhase.CAPTURED.value
    # Next update: CAPTURED checks blank_available → should fault
    engine.update(0.02)
    assert tags.state.sts["machine_state"] == MachineState.FAULTED.value
    assert tags.state.fault["active_code"] == "BLANK_MISSING"
    assert tags.state.fault["latched"] is True
    
    tags.state.inputs["blank_available"] = True
    tags.state.cmd["reset"] = True
    engine.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.STOPPED.value

def test_gap_control_jam_fault(engine):
    engine.ctx.recipes["24-pack"].jam_probability = 1.0
    
    tags = engine.tags
    tags.state.cmd["start"] = True
    engine.update(1.1)
    _run_until_phase(engine, CyclePhase.IDLE.value)
    engine.update(0.02)  # → CAPTURED
    _run_until_phase(engine, CyclePhase.BLANK_FEED.value)
    _run_until_phase(engine, CyclePhase.TRANSFER.value)
    _run_until_phase(engine, CyclePhase.PACKING.value)
    
    # Packing phase — jam check happens when packing timer expires
    _run_until_phase(engine, CyclePhase.DISCHARGE.value)
    # With jam_probability=1.0, should fault before reaching DISCHARGE
    assert tags.state.sts["machine_state"] == MachineState.FAULTED.value
    assert tags.state.fault["active_code"] == "GAP_CONTROL_JAM"

def test_reject_event(engine):
    engine.ctx.recipes["24-pack"].reject_probability = 1.0
    
    tags = engine.tags
    tags.state.cmd["start"] = True
    engine.update(1.1)
    _run_until_phase(engine, CyclePhase.IDLE.value)
    engine.update(0.02)  # → CAPTURED
    _run_until_phase(engine, CyclePhase.BLANK_FEED.value)
    _run_until_phase(engine, CyclePhase.TRANSFER.value)
    _run_until_phase(engine, CyclePhase.PACKING.value)
    _run_until_phase(engine, CyclePhase.DISCHARGE.value)
    _run_until_phase(engine, CyclePhase.IDLE.value)
    
    assert tags.state.out["reject_pack_count"] == 1
    assert tags.state.out["last_pack_result"] == PackResult.REJECT.value
    assert tags.state.sts["machine_state"] == MachineState.RUNNING.value

def test_run_empty_partial_group(engine):
    tags = engine.tags
    tags.state.cmd["start"] = True
    engine.update(1.1)
    
    for _ in range(5): engine.update(0.1)
    assert tags.state.out["grouped_count"] == 5
    
    tags.state.cmd["stop"] = True
    engine.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.RUN_EMPTY.value
    assert tags.state.out["grouped_count"] == 0

    engine.update(0.02)
    assert tags.state.sts["machine_state"] == MachineState.STOPPED.value
    
    events = engine.event_logger.events
    assert any(e.event_code == "RUN_EMPTY_PARTIAL_GROUP_CLEARED" for e in events)

def test_event_emission(engine):
    tags = engine.tags
    engine.event_logger.clear()
    tags.state.cmd["start"] = True
    engine.update(0.1)
    
    events = engine.event_logger.events
    assert len(events) > 0
    assert events[0].event_code == "MACHINE_START_REQUESTED"
    assert tags.state.evt["last_event_code"] == "MACHINE_START_REQUESTED"
