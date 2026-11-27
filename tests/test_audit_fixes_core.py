"""Regression tests for scan_cycle, manual-mode, recipe validation and unknown-ID handling."""
import json
from dataclasses import replace

import pytest

from app.control.controller import PLCStyleController
from app.shared.enums import MachineMode, MachineState
from app.shared.models import Recipe, ScenarioAction
from app.shared.tag_store import TagStore
from app.simulator.config_loader import load_faults, load_recipes, validate_engine_fault_ids, validate_recipe
from app.simulator.engine import SimulatorEngine


@pytest.fixture
def rig():
    tags = TagStore()
    sim = SimulatorEngine(tags)
    ctrl = PLCStyleController(tags)
    ctrl.update()
    return tags, sim, ctrl


def _good_recipe() -> Recipe:
    return load_recipes("configs/recipes.json")[0]


def _manual_stopped(tags, sim, ctrl):
    ctrl.scan_cycle({"command_code": 6})
    sim.update(0.1)
    ctrl.update()
    assert tags.state.sts["machine_mode"] == MachineMode.MANUAL.value


# ---- scan_cycle ---------------------------------------------------------

def test_scan_cycle_start_reaches_simulator(rig):
    tags, sim, ctrl = rig
    ctrl.scan_cycle({"command_code": 1})
    sim.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.STARTING.value


def test_scan_cycle_does_not_clear_pulses(rig):
    tags, _, ctrl = rig
    ctrl.scan_cycle({"command_code": 1})
    assert tags.state.cmd["start"] is True


def test_scan_cycle_ignores_none_values(rig):
    tags, _, ctrl = rig
    snap = ctrl.scan_cycle({"requested_mode": None, "recipe_select": None})
    assert tags.state.plc["command_ack_code"] == 0
    assert tags.state.plc["requested_mode"] == 0
    assert snap is not None


def test_recipe_select_acks_and_denies(rig):
    tags, _, ctrl = rig
    ctrl.scan_cycle({"recipe_select": "27-pack"})
    assert tags.state.plc["command_ack_code"] == 1
    tags.state.hmi["recipe_change_enabled"] = False
    tags.state.sts["machine_state"] = MachineState.RUNNING.value
    ctrl.scan_cycle({"recipe_select": "30-pack"})
    assert tags.state.plc["command_ack_code"] == 2


def test_recipe_select_does_not_override_command_ack(rig):
    tags, _, ctrl = rig
    ctrl.scan_cycle({"command_code": 99, "recipe_select": "27-pack"})
    assert tags.state.plc["command_ack_code"] == 2


def test_mode_command_codes_change_mode(rig):
    tags, _, ctrl = rig
    ctrl.scan_cycle({"command_code": 6})
    assert tags.state.sts["machine_mode"] == MachineMode.MANUAL.value
    assert tags.state.plc["command_ack_code"] == 1
    ctrl.update()
    ctrl.scan_cycle({"command_code": 5})
    assert tags.state.sts["machine_mode"] == MachineMode.AUTO.value
    assert tags.state.plc["command_ack_code"] == 1


def test_recipe_select_cleared_after_consumed(rig):
    tags, sim, ctrl = rig
    tags.state.sts["machine_state"] = MachineState.RUNNING.value
    tags.state.cmd["recipe_select"] = "27-pack"
    sim.update(0.1)
    # Settles back to the active recipe (stays a valid id for the PLC mapping)
    assert tags.state.cmd["recipe_select"] == tags.state.cfg["active_recipe_id"]
    sim.update(0.1)
    denied = [e for e in sim.event_logger.events if e.event_code == "RECIPE_CHANGE_DENIED"]
    assert len(denied) == 1
    # A denied change must not be applied later when the machine stops
    tags.state.sts["machine_state"] = MachineState.STOPPED.value
    sim.update(0.1)
    assert tags.state.cfg["active_recipe_id"] != "27-pack"


# ---- manual mode --------------------------------------------------------

def test_mode_switch_only_from_stopped_or_faulted(rig):
    tags, _, ctrl = rig
    for state in (MachineState.RUNNING, MachineState.STARVED, MachineState.BLOCKED,
                  MachineState.RUN_EMPTY, MachineState.STARTING):
        tags.state.sts["machine_state"] = state.value
        ctrl.update()
        assert not tags.state.hmi["manual_mode_enabled"], state
    for state in (MachineState.STOPPED, MachineState.FAULTED):
        tags.state.sts["machine_state"] = state.value
        ctrl.update()
        assert tags.state.hmi["manual_mode_enabled"], state


def test_manual_mode_ignores_start_stop(rig):
    tags, sim, ctrl = rig
    _manual_stopped(tags, sim, ctrl)
    tags.state.cmd["start"] = True
    sim.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.STOPPED.value
    tags.state.sts["machine_state"] = MachineState.STARVED.value
    tags.state.cmd["stop"] = True
    sim.update(0.1)
    assert tags.state.sts["machine_state"] == MachineState.STARVED.value


# ---- recipe validation --------------------------------------------------

@pytest.mark.parametrize("field,value", [
    ("products_per_pack", 0),
    ("grid_cols", 0),
    ("grid_rows", 0),
    ("nominal_cycle_time_sec", 0),
    ("product_spawn_interval_sec", -1.0),
    ("reject_probability", 1.5),
    ("jam_probability", -0.1),
    ("products_per_pack", 10_000),
])
def test_validate_recipe_rejects_bad_values(field, value):
    with pytest.raises(ValueError):
        validate_recipe(replace(_good_recipe(), **{field: value}))


def test_validate_recipe_accepts_good():
    validate_recipe(_good_recipe())


def test_load_recipes_rejects_duplicates_and_unknown_keys(tmp_path):
    item = json.loads(open("configs/recipes.json", encoding="utf-8").read())[0]
    dup = tmp_path / "dup.json"
    dup.write_text(json.dumps([item, item]), encoding="utf-8")
    with pytest.raises(ValueError, match="Duplicate"):
        load_recipes(dup)
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps([{**item, "bogus": 1}]), encoding="utf-8")
    with pytest.raises(ValueError):
        load_recipes(bad)


def test_missing_engine_fault_id_rejected():
    ids = {f.fault_id for f in load_faults("configs/faults.json")}
    validate_engine_fault_ids(ids)
    with pytest.raises(ValueError):
        validate_engine_fault_ids(ids - {"BLANK_MISSING"})


# ---- unknown recipe / fault IDs ----------------------------------------

def test_unknown_active_recipe_reverts(rig):
    tags, sim, _ = rig
    sim.update(0.1)
    tags.state.cfg["active_recipe_id"] = "nope"
    sim.update(0.1)
    sim.update(0.1)
    assert tags.state.cfg["active_recipe_id"] == "24-pack"


def test_inject_unknown_fault_raises_value_error(rig):
    _, sim, _ = rig
    with pytest.raises(ValueError, match="Unknown fault code: NOPE"):
        sim.inject_fault("NOPE", "x")


def test_internal_trigger_unknown_fault_is_noop(rig):
    tags, sim, _ = rig
    sim._trigger_fault("NOPE")
    assert tags.state.sts["fault_active"] is False


def test_scenario_unknown_ids_skipped(rig):
    tags, sim, _ = rig
    runner = sim.scenario_runner
    runner._apply_action(ScenarioAction(type="SET_CFG", name="active_recipe_id", value="nope"))
    assert tags.state.cfg["active_recipe_id"] == "24-pack"
    runner._apply_action(ScenarioAction(type="INJECT_FAULT", name="NOPE", value=None))
    assert tags.state.sts["fault_active"] is False
