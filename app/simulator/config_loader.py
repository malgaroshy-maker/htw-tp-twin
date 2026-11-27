from __future__ import annotations

import json
from pathlib import Path

from app.shared.models import FaultDefinition, Recipe, Scenario, ScenarioAction, ScenarioCondition, ScenarioStep, ScenarioTrigger


# Fault IDs the simulator engine raises internally via _trigger_fault().
# Keep in sync with the hardcoded calls in app/simulator/engine.py.
REQUIRED_ENGINE_FAULT_IDS = frozenset({
    "BLANK_MISSING",
    "GAP_CONTROL_JAM",
    "REJECT_BIN_FULL",
    "REJECT_BIN_NEAR_FULL",
    "TRANSPORT_CHAIN_GAP",
})


def validate_recipe(recipe: Recipe) -> None:
    """Raise ValueError if a recipe has values the simulator cannot run with.

    Shared by the config loader and the API so both reject bad recipes with the
    same message instead of failing later inside the simulation loop.
    """
    rid = recipe.recipe_id
    if recipe.products_per_pack < 1:
        raise ValueError(f"Invalid products_per_pack for {rid}: must be >= 1")
    if recipe.grid_cols < 1:
        raise ValueError(f"Invalid grid_cols for {rid}: must be >= 1")
    grid_rows = getattr(recipe, "grid_rows", None)
    if grid_rows is not None and grid_rows < 1:
        raise ValueError(f"Invalid grid_rows for {rid}: must be >= 1")
    if recipe.nominal_cycle_time_sec <= 0:
        raise ValueError(f"Invalid nominal_cycle_time_sec for {rid}: must be > 0")
    if recipe.product_spawn_interval_sec <= 0:
        raise ValueError(f"Invalid product_spawn_interval_sec for {rid}: must be > 0")
    if not (0 <= recipe.reject_probability <= 1):
        raise ValueError(f"Invalid reject_probability for {rid}")
    if not (0 <= recipe.jam_probability <= 1):
        raise ValueError(f"Invalid jam_probability for {rid}")
    if grid_rows is not None and recipe.grid_cols * grid_rows < recipe.products_per_pack:
        raise ValueError(f"Grid size too small for {rid}")


def validate_engine_fault_ids(fault_ids: set[str] | frozenset[str]) -> None:
    """Raise ValueError if a fault ID the engine hardcodes is not configured."""
    missing = sorted(REQUIRED_ENGINE_FAULT_IDS - set(fault_ids))
    if missing:
        raise ValueError(f"Fault config is missing IDs required by the engine: {', '.join(missing)}")


def load_recipes(path: str | Path) -> list[Recipe]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    recipes: list[Recipe] = []
    seen: set[str] = set()
    for item in data:
        try:
            recipe = Recipe(**item)
        except TypeError as exc:
            raise ValueError(f"Invalid recipe entry {item.get('recipe_id', '?')!r}: {exc}") from exc
        if recipe.recipe_id in seen:
            raise ValueError(f"Duplicate recipe_id: {recipe.recipe_id}")
        seen.add(recipe.recipe_id)
        validate_recipe(recipe)
        recipes.append(recipe)
    return recipes


def load_faults(path: str | Path) -> list[FaultDefinition]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    try:
        return [FaultDefinition(**item) for item in data["faults"]]
    except TypeError as exc:
        raise ValueError(f"Invalid fault entry: {exc}") from exc


def _load_condition(data: dict | None) -> ScenarioCondition | None:
    if not data:
        return None
    
    conditions = [_load_condition(c) for c in data.get("conditions", [])]
    # Filter out None from conditions
    nested_conditions = [c for c in conditions if c is not None]
    
    return ScenarioCondition(
        type=data["type"],
        value=data.get("value"),
        tag=data.get("tag"),
        conditions=nested_conditions
    )


def load_scenarios(path: str | Path) -> list[Scenario]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    scenarios = []
    for item in data["scenarios"]:
        steps = []
        for s in item["steps"]:
            trigger = ScenarioTrigger(**s["trigger"])
            action = ScenarioAction(**s["action"])
            steps.append(ScenarioStep(trigger=trigger, action=action))
        
        scenario_data = item.copy()
        scenario_data["steps"] = steps
        
        if "recovery_condition" in item:
            scenario_data["recovery_condition"] = _load_condition(item["recovery_condition"])
            
        scenarios.append(Scenario(**scenario_data))
    return scenarios
