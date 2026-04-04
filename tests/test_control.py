import pytest
from app.shared.tag_store import TagStore
from app.shared.enums import MachineState, MachineMode
from app.control.controller import PLCStyleController

@pytest.fixture
def controller():
    tags = TagStore()
    return PLCStyleController(tags)

def test_start_permissive_logic(controller):
    tags = controller.tags
    controller.update()
    
    # Default: AUTO mode, all inputs OK -> start_permissive_ok should be True
    assert tags.state.sts["start_permissive_ok"] is True
    assert tags.state.hmi["start_button_enabled"] is True

    # Switch to MANUAL -> start_permissive_ok should be False
    controller.request_mode_manual()
    controller.update()
    assert tags.state.sts["start_permissive_ok"] is False
    assert tags.state.hmi["start_button_enabled"] is False

    # Switch back to AUTO, but lose safety -> start_permissive_ok should be False
    controller.request_mode_auto()
    tags.state.inputs["safety_ok"] = False
    controller.update()
    assert tags.state.sts["start_permissive_ok"] is False

def test_reset_gating(controller):
    tags = controller.tags
    
    # Not faulted -> reset should be rejected
    assert controller.request_reset() is False
    
    # Faulted -> reset should be accepted
    tags.state.sts["machine_state"] = MachineState.FAULTED.value
    controller.update()
    assert tags.state.hmi["reset_button_enabled"] is True
    assert controller.request_reset() is True

def test_recipe_change_gating(controller):
    tags = controller.tags
    
    # STOPPED -> allowed
    assert controller.select_recipe("27-pack") is True
    
    # RUNNING and AUTO -> denied
    tags.state.sts["machine_state"] = MachineState.RUNNING.value
    tags.state.sts["machine_mode"] = MachineMode.AUTO.value
    controller.update()
    assert tags.state.hmi["recipe_change_enabled"] is False
    assert controller.select_recipe("30-pack") is False
    
    # RUNNING and MANUAL -> allowed
    # First, switch to STOPPED to allow mode change
    tags.state.sts["machine_state"] = MachineState.STOPPED.value
    controller.update()
    
    controller.request_mode_manual()
    controller.update()
    
    # Now set state back to RUNNING
    tags.state.sts["machine_state"] = MachineState.RUNNING.value
    controller.update()
    
    assert tags.state.hmi["recipe_change_enabled"] is True
    assert controller.select_recipe("30-pack") is True

def test_mode_switching_restrictions(controller):
    tags = controller.tags
    
    # STOPPED -> allowed
    assert controller.request_mode_manual() is True
    assert tags.state.sts["machine_mode"] == MachineMode.MANUAL.value
    
    # RUNNING -> denied
    tags.state.sts["machine_state"] = MachineState.RUNNING.value
    controller.update()
    assert tags.state.hmi["auto_mode_enabled"] is False
    assert controller.request_mode_auto() is False

def test_hmi_helper_flags(controller):
    tags = controller.tags
    
    # STARTING -> stop enabled, start disabled
    tags.state.sts["machine_state"] = MachineState.STARTING.value
    controller.update()
    assert tags.state.hmi["start_button_enabled"] is False
    assert tags.state.hmi["stop_button_enabled"] is True
    
    # FAULTED -> reset enabled, start disabled
    tags.state.sts["machine_state"] = MachineState.FAULTED.value
    controller.update()
    assert tags.state.hmi["reset_button_enabled"] is True
    assert tags.state.hmi["start_button_enabled"] is False
