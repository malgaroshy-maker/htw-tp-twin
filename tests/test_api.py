import pytest
from fastapi.testclient import TestClient
from app.api.server import app, TAGS, SIM, CTRL
from app.shared.enums import MachineState

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_simulator():
    """Reset the simulator state before each test."""
    TAGS.__init__()
    SIM.__init__(TAGS)
    SIM.event_logger.clear()
    CTRL.update()

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_state():
    response = client.get("/state")
    assert response.status_code == 200
    state = response.json()
    assert "sts" in state
    assert "cmd" in state
    assert state["sts"]["machine_state"] == MachineState.STOPPED.value

def test_command_start():
    response = client.post("/command", json={"action": "start"})
    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] is True
    assert data["state"]["sts"]["machine_state"] == MachineState.STARTING.value

def test_command_invalid():
    response = client.post("/command", json={"action": "invalid_action"})
    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] is False
    assert data["error"] == "unsupported action"

def test_command_run_empty():
    # First start it
    client.post("/command", json={"action": "start"})
    client.post("/tick", json={"dt": 1.1}) # Enter RUNNING
    
    # Tick a bit to group some products
    client.post("/tick", json={"dt": 3.0}) # Should be in a cycle now
    
    response = client.post("/command", json={"action": "run_empty"})
    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] is True
    # It might still be in RUN_EMPTY if it's mid-cycle
    assert data["state"]["sts"]["machine_state"] in {MachineState.RUN_EMPTY.value, MachineState.STOPPED.value}

def test_recipe_selection():
    response = client.post("/recipe", json={"recipe_id": "27-pack"})
    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] is True
    assert data["state"]["cfg"]["active_recipe_id"] == "27-pack"

def test_get_events_ordering():
    # Trigger some events
    client.post("/command", json={"action": "start"})
    client.post("/tick", json={"dt": 0.1})
    
    response = client.get("/events")
    assert response.status_code == 200
    events = response.json()["events"]
    assert len(events) >= 1
    
    # Check newest-first ordering
    # MACHINE_START_REQUESTED should be the first in the list (newest)
    assert events[0]["event_code"] == "MACHINE_START_REQUESTED"

def test_tick_dt():
    client.post("/command", json={"action": "start"})
    response = client.post("/tick", json={"dt": 0.5})
    assert response.json()["sts"]["machine_state"] == MachineState.STARTING.value
    response = client.post("/tick", json={"dt": 0.6})
    assert response.json()["sts"]["machine_state"] == MachineState.RUNNING.value
def test_command_manual_jog():
    # 1. Enter Manual Mode
    resp = client.post("/command", json={"action": "mode_manual"})
    assert resp.status_code == 200, f"Mode switch failed: {resp.text}"
    assert resp.json()["accepted"] is True, f"Manual mode rejected: {resp.json().get('error')}"
    
    state = client.get("/state").json()
    assert state["sts"]["machine_mode"] == "MANUAL"
    
    # 2. Try Jog Infeed
    response = client.post("/command", json={"action": "jog_infeed"})
    assert response.status_code == 200
    data = response.json()
    assert data["accepted"] is True, f"Jog Infeed rejected: {data.get('error')}"
    # Note: cmd bits are pulse-style and cleared after the update cycle in server.py
    
    # 3. Try Jog Blank Feed
    response = client.post("/command", json={"action": "jog_blank_feed"})
    assert response.status_code == 200
    assert response.json()["accepted"] is True
    
    # 4. Try Jog Pack Advance
    response = client.post("/command", json={"action": "jog_pack_advance"})
    assert response.status_code == 200
    assert response.json()["accepted"] is True

def test_manual_mode_safety_gate():
    # Ensure jogs are REJECTED in AUTO mode
    client.post("/command", json={"action": "mode_auto"})
    
    response = client.post("/command", json={"action": "jog_infeed"})
    assert response.status_code == 200
    assert response.json()["accepted"] is False
