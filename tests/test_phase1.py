import pytest
from pathlib import Path
from app.shared.tag_store import TagStore
from app.shared.enums import MachineState, MachineMode, CyclePhase, PackResult, Severity
from app.simulator.config_loader import load_recipes, load_faults, load_scenarios

def test_tag_store_defaults():
    store = TagStore()
    state = store.snapshot()
    
    # Check cmd defaults
    assert state["cmd"]["start"] is False
    assert state["cmd"]["run_empty"] is False
    
    # Check sts defaults
    assert state["sts"]["machine_state"] == MachineState.STOPPED.value
    assert state["sts"]["machine_mode"] == MachineMode.AUTO.value
    
    # Check out defaults
    assert state["out"]["last_pack_result"] == PackResult.GOOD.value
    
    # Check fault defaults
    assert state["fault"]["active_severity"] == Severity.INFO.value

def test_pulse_clear():
    store = TagStore()
    store.state.cmd["start"] = True
    store.state.cmd["run_empty"] = True
    store.pulse_clear()
    assert store.state.cmd["start"] is False
    assert store.state.cmd["run_empty"] is False

def test_load_recipes():
    path = Path("configs/recipes.json")
    recipes = load_recipes(path)
    assert len(recipes) >= 3  # At least 21, 24, 27, 30
    recipe_ids = [r.recipe_id for r in recipes]
    assert "24-pack" in recipe_ids
    assert 0 <= recipes[0].reject_probability <= 1

def test_load_faults():
    path = Path("configs/faults.json")
    faults = load_faults(path)
    assert len(faults) > 0
    # The faults.json has a "faults" key
    assert faults[0].fault_id is not None

def test_load_scenarios():
    path = Path("configs/scenarios.json")
    scenarios = load_scenarios(path)
    assert len(scenarios) > 0
    assert scenarios[0].scenario_id == "product-starvation-01"
    assert len(scenarios[0].steps) > 0
    assert scenarios[0].steps[0].trigger.type == "ELAPSED_SEC"

def test_recipe_validation():
    from app.shared.models import Recipe
    import json
    
    # Test invalid probability
    invalid_data = [
        {
            "recipe_id": "invalid",
            "recipe_name": "Invalid",
            "products_per_pack": 24,
            "grid_cols": 8,
            "grid_rows": 3,
            "nominal_cycle_time_sec": 3.2,
            "product_spawn_interval_sec": 0.09,
            "reject_probability": 1.5, # Invalid
            "jam_probability": 0.015
        }
    ]
    
    with open("tests/invalid_recipe.json", "w") as f:
        json.dump(invalid_data, f)
    
    with pytest.raises(ValueError, match="Invalid reject_probability"):
        load_recipes("tests/invalid_recipe.json")
    
    # Test grid size too small
    invalid_grid = [
        {
            "recipe_id": "small_grid",
            "recipe_name": "Small Grid",
            "products_per_pack": 24,
            "grid_cols": 2,
            "grid_rows": 2, # 4 < 24
            "nominal_cycle_time_sec": 3.2,
            "product_spawn_interval_sec": 0.09,
            "reject_probability": 0.05,
            "jam_probability": 0.015
        }
    ]
    
    with open("tests/invalid_grid.json", "w") as f:
        json.dump(invalid_grid, f)
    
    with pytest.raises(ValueError, match="Grid size too small"):
        load_recipes("tests/invalid_grid.json")
