import time
import pytest
from app.shared.tag_store import TagStore
from app.shared.models import Scenario, ScenarioStep, ScenarioTrigger, ScenarioAction, ScenarioCondition
from app.shared.enums import ScenarioStatus
from app.simulator.engine import SimulatorEngine

@pytest.fixture
def engine():
    tags = TagStore()
    return SimulatorEngine(tags)

def test_scenario_lifecycle_v2(engine):
    """Test full scenario lifecycle: ACTIVE -> WAITING -> COMPLETED."""
    # Avoid command overwrite
    engine.tags.state.cmd["recipe_select"] = ""
    
    scenario = Scenario(
        scenario_id="test-v2",
        scenario_name="Test Lifecycle",
        description="Test",
        goals=[],
        initial_recipe="24-pack",
        steps=[
            ScenarioStep(
                trigger=ScenarioTrigger(type="IMMEDIATE", value=None),
                action=ScenarioAction(type="SET_INPUT", name="product_available", value=False)
            )
        ],
        recovery_condition=ScenarioCondition(
            type="all_of",
            conditions=[
                ScenarioCondition(type="tag_equals", tag="product_available", value=True),
                ScenarioCondition(type="machine_state_in", value=["RUNNING"])
            ]
        ),
        success_criteria=[]
    )
    
    # 1. Start scenario
    engine.scenario_runner.start_scenario(scenario)
    assert engine.scenario_runner.status == ScenarioStatus.ACTIVE
    assert engine.tags.state.cfg["active_scenario_status"] == ScenarioStatus.ACTIVE
    
    # 2. Trigger step
    engine.update(0.1)
    assert engine.tags.state.inputs["product_available"] is False
    # Since it was the only step, it should transition to WAITING_FOR_RECOVERY
    assert engine.scenario_runner.status == ScenarioStatus.WAITING_FOR_RECOVERY
    assert engine.tags.state.cfg["active_scenario_status"] == ScenarioStatus.WAITING_FOR_RECOVERY

    # 3. Simulate partial recovery (product returned, but not yet running)
    engine.tags.state.inputs["product_available"] = True
    engine.update(0.1)
    assert engine.scenario_runner.status == ScenarioStatus.WAITING_FOR_RECOVERY
    
    # 4. Success: Machine returns to running
    engine.tags.state.sts["machine_state"] = "RUNNING"
    # We need 3 stable cycles in my current ScenarioRunner implementation
    engine.update(0.1) # cycle 1
    engine.update(0.1) # cycle 2
    engine.update(0.1) # cycle 3 -> Complete
    
    assert engine.scenario_runner.status == ScenarioStatus.COMPLETED
    assert engine.tags.state.cfg["active_scenario_id"] == ""

def test_scenario_state_reversibility(engine):
    """Test that all forced tags are restored on completion or abort."""
    # 1. Capture initial state
    initial_product = engine.tags.state.inputs["product_available"]
    initial_recipe = engine.tags.state.cfg["active_recipe_id"]
    
    # Avoid command overwrite
    engine.tags.state.cmd["recipe_select"] = ""
    
    scenario = Scenario(
        scenario_id="reversibility-test",
        scenario_name="Test Cleanup",
        description="Test",
        goals=[],
        initial_recipe="27-pack",
        steps=[
            ScenarioStep(
                trigger=ScenarioTrigger(type="IMMEDIATE", value=None),
                action=ScenarioAction(type="SET_INPUT", name="product_available", value=False)
            )
        ],
        success_criteria=[]
    )
    
    engine.scenario_runner.start_scenario(scenario)
    engine.update(0.1)
    
    # Verify tags are currently forced
    assert engine.tags.state.inputs["product_available"] is False
    assert engine.tags.state.cfg["active_recipe_id"] == "27-pack"
    
    # 2. Perform abort
    engine.scenario_runner.stop_scenario()
    
    # Verify restoration
    assert engine.tags.state.inputs["product_available"] == initial_product
    assert engine.tags.state.cfg["active_recipe_id"] == initial_recipe
    assert engine.scenario_runner.status == ScenarioStatus.ABORTED

def test_scenario_timeout(engine):
    """Test that scenario fails if recovery takes too long."""
    scenario = Scenario(
        scenario_id="timeout-test",
        scenario_name="Timeout Test",
        description="Test",
        goals=[],
        initial_recipe="24-pack",
        steps=[
            ScenarioStep(
                trigger=ScenarioTrigger(type="IMMEDIATE", value=None),
                action=ScenarioAction(type="SET_INPUT", name="product_available", value=False)
            )
        ],
        recovery_condition=ScenarioCondition(
            type="tag_equals", tag="product_available", value=True
        ),
        timeout_sec=0.5,
        success_criteria=[]
    )
    
    engine.scenario_runner.start_scenario(scenario)
    engine.update(0.1) # Enter recovery
    assert engine.scenario_runner.status == ScenarioStatus.WAITING_FOR_RECOVERY
    
    time.sleep(0.6)
    engine.update(0.1)
    
    assert engine.scenario_runner.status == ScenarioStatus.FAILED
    assert any(e.event_code == "SCENARIO_FAILED" for e in engine.event_logger.events)
