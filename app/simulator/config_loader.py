from __future__ import annotations

import json
from pathlib import Path

from app.shared.models import FaultDefinition, Recipe, Scenario, ScenarioAction, ScenarioCondition, ScenarioStep, ScenarioTrigger


def load_recipes(path: str | Path) -> list[Recipe]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    recipes = [Recipe(**item) for item in data]
    for r in recipes:
        if not (0 <= r.reject_probability <= 1):
            raise ValueError(f"Invalid reject_probability for {r.recipe_id}")
        if not (0 <= r.jam_probability <= 1):
            raise ValueError(f"Invalid jam_probability for {r.recipe_id}")
        if r.grid_cols * r.grid_rows < r.products_per_pack:
            raise ValueError(f"Grid size too small for {r.recipe_id}")
    return recipes


def load_faults(path: str | Path) -> list[FaultDefinition]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [FaultDefinition(**item) for item in data["faults"]]


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
