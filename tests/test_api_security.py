"""Security and validation tests for the FastAPI server."""
import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api import server
from app.api.server import app, TAGS, SIM, CTRL
from app.shared.enums import MachineState

client = TestClient(app)

REAL_RECIPES = Path(server.__file__).resolve().parents[2] / "configs" / "recipes.json"


@pytest.fixture(autouse=True)
def reset_simulator():
    TAGS.__init__()
    SIM.__init__(TAGS)
    SIM.event_logger.clear()
    CTRL.update()


def test_cors_allows_dashboard_origin():
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-credentials" not in r.headers


def test_cors_rejects_unknown_origin():
    r = client.get("/health", headers={"Origin": "http://evil.example.com"})
    assert "access-control-allow-origin" not in r.headers


def test_set_input_rejects_non_bool():
    r = client.post("/dev/set-input", json={"name": "safety_ok", "value": "maybe"})
    assert r.status_code == 422


def test_set_input_unknown_name():
    r = client.post("/dev/set-input", json={"name": "nope", "value": True})
    assert r.status_code == 400


def test_inject_fault_unknown_code():
    r = client.post("/dev/inject-fault", json={"code": "NOT_A_FAULT"})
    assert r.status_code == 400


def test_dev_routes_disabled_by_env(monkeypatch):
    monkeypatch.setenv("TRAYPACKER_DISABLE_DEV_ROUTES", "1")
    assert client.post("/dev/set-input", json={"name": "safety_ok", "value": True}).status_code == 403
    assert client.post("/dev/inject-fault", json={"code": "X"}).status_code == 403


def test_dev_routes_enabled_by_default(monkeypatch):
    monkeypatch.delenv("TRAYPACKER_DISABLE_DEV_ROUTES", raising=False)
    r = client.post("/dev/set-input", json={"name": "safety_ok", "value": True})
    assert r.status_code == 200


def test_recipe_update_invalid_leaves_file_and_memory_unchanged(monkeypatch, tmp_path):
    tmp_recipes = tmp_path / "recipes.json"
    shutil.copy(REAL_RECIPES, tmp_recipes)
    monkeypatch.setattr(server, "RECIPES_PATH", tmp_recipes)
    before = tmp_recipes.read_text(encoding="utf-8")
    recipe_id = next(iter(SIM.ctx.recipes))
    old_count = SIM.ctx.recipes[recipe_id].products_per_pack

    r = client.post("/recipe/update", json={"recipe_id": recipe_id, "products_per_pack": 0})
    assert r.status_code == 422
    assert tmp_recipes.read_text(encoding="utf-8") == before
    assert SIM.ctx.recipes[recipe_id].products_per_pack == old_count


def test_recipe_update_valid_writes_tmp_copy_only(monkeypatch, tmp_path):
    tmp_recipes = tmp_path / "recipes.json"
    shutil.copy(REAL_RECIPES, tmp_recipes)
    monkeypatch.setattr(server, "RECIPES_PATH", tmp_recipes)
    real_before = REAL_RECIPES.read_text(encoding="utf-8")
    recipe_id = next(iter(SIM.ctx.recipes))

    r = client.post("/recipe/update", json={"recipe_id": recipe_id, "notes": "edited"})
    assert r.status_code == 200
    assert SIM.ctx.recipes[recipe_id].notes == "edited"
    saved = json.loads(tmp_recipes.read_text(encoding="utf-8"))
    assert next(x for x in saved if x["recipe_id"] == recipe_id)["notes"] == "edited"
    assert REAL_RECIPES.read_text(encoding="utf-8") == real_before


def test_recipe_update_write_failure_returns_500_and_keeps_memory(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "RECIPES_PATH", tmp_path / "missing" / "recipes.json")
    recipe_id = next(iter(SIM.ctx.recipes))
    old_notes = SIM.ctx.recipes[recipe_id].notes

    r = client.post("/recipe/update", json={"recipe_id": recipe_id, "notes": "x"})
    assert r.status_code == 500
    assert SIM.ctx.recipes[recipe_id].notes == old_notes


def test_plc_scan_start_moves_to_starting():
    r = client.post("/plc/scan", json={"command_code": 1})
    assert r.status_code == 200
    assert TAGS.state.sts["machine_state"] == MachineState.STARTING.value
    assert r.json()["plc"]["command_ack_code"] == 1


def test_plc_scan_unknown_input_rejected():
    r = client.post("/plc/scan", json={"command_code": 0, "inputs": {"bogus": True}})
    assert r.status_code == 400
    assert "bogus" in r.json()["detail"]
