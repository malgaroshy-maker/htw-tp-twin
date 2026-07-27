import pytest
from fastapi.testclient import TestClient
from app.api.server import app, TAGS, SIM, CTRL
from app.shared.enums import MachineMode, MachineState, CyclePhase

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_simulator():
    """Reset the simulator and controller to a clean state before each test."""
    TAGS.__init__()
    SIM.__init__(TAGS)
    SIM.event_logger.clear()
    CTRL.update()

def test_manual_mode_gating():
    """Test that automatic logic is suspended in MANUAL mode."""
    # 1. Switch to MANUAL
    client.post("/command", json={"action": "reset"})  # Reset to get to STOPPED
    TAGS.write_sts("machine_mode", MachineMode.MANUAL.value)
    
    # 2. Try to START - it should fail or at least not transition to RUNNING in the engine
    client.post("/command", json={"action": "start"})
    
    # 3. Step the engine
    SIM.update(1.0)
    
    # Machine should NOT be RUNNING because engine gates transitions in MANUAL
    assert TAGS.state.sts["machine_state"] != MachineState.RUNNING.value

def test_manual_input_override():
    """Test that inputs can be overridden in MANUAL mode."""
    TAGS.write_sts("machine_mode", MachineMode.MANUAL.value)
    
    # Force safety_ok to False
    client.post("/dev/set-input", json={"name": "safety_ok", "value": False})
    assert TAGS.state.inputs["safety_ok"] is False
    
    # Force safety_ok to True
    client.post("/dev/set-input", json={"name": "safety_ok", "value": True})
    assert TAGS.state.inputs["safety_ok"] is True

def test_jog_infeed():
    """Test that jog_infeed increments grouped_count."""
    TAGS.write_sts("machine_mode", MachineMode.MANUAL.value)
    initial_count = TAGS.state.out["grouped_count"]
    
    # Send jog command
    client.post("/command", json={"action": "jog_infeed"})
    
    # Step engine to process
    SIM.update(0.1)
    
    assert TAGS.state.out["grouped_count"] == initial_count + 1

def test_jog_blank_feed():
    """Test that jog_blank_feed triggers the BLANK_FEED phase."""
    TAGS.write_sts("machine_mode", MachineMode.MANUAL.value)
    
    # Send jog command
    client.post("/command", json={"action": "jog_blank_feed"})
    
    # Step engine
    SIM.update(0.1)
    
    assert TAGS.state.sts["cycle_phase"] == CyclePhase.BLANK_FEED.value

def test_jog_pack_advance():
    """Test that jog_pack_advance steps through phases."""
    TAGS.write_sts("machine_mode", MachineMode.MANUAL.value)
    TAGS.write_sts("cycle_phase", CyclePhase.IDLE.value)
    
    # Advance to next phase
    client.post("/command", json={"action": "jog_pack_advance"})
    SIM.update(0.1)
    
    # From IDLE, next is typically GROUPING or whatever is next in enum order
    assert TAGS.state.sts["cycle_phase"] == CyclePhase.GROUPING.value
