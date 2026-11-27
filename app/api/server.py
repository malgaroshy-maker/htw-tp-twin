import asyncio
import dataclasses
import json
import os
import tempfile
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, Optional

from fastapi import Depends, FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.shared.tag_store import TagStore
from app.shared.enums import Severity
from app.shared.persistence import EventStore
from app.shared.plc_mapping import tag_store_to_plc_snapshot
from app.simulator.config_loader import validate_recipe
from app.simulator.engine import SimulatorEngine
from app.control.controller import PLCStyleController
from app.ai.assistant import AIAssistant
from app.ai.gemini_client import GeminiClient
from app.reports import generator

app = FastAPI(title="Tray Packer Digital Twin API")

# Vite dev server (5173) and preview server (4173) origins.
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:4173,http://127.0.0.1:4173"
)
RECIPES_PATH = Path(__file__).resolve().parents[2] / "configs" / "recipes.json"


def _cors_origins() -> list[str]:
    """Allowed browser origins from TRAYPACKER_CORS_ORIGINS (comma-separated)."""
    raw = os.environ.get("TRAYPACKER_CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [o.strip() for o in raw.split(",") if o.strip()]


# The dashboard does not use cookies, so credentials stay disabled.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_dev_routes() -> None:
    """Reject /dev/* routes with 403 when TRAYPACKER_DISABLE_DEV_ROUTES=1 (read per request)."""
    if os.environ.get("TRAYPACKER_DISABLE_DEV_ROUTES") == "1":
        raise HTTPException(status_code=403, detail="Dev routes are disabled")


DevOnly = Annotated[None, Depends(require_dev_routes)]

TAGS = TagStore()
# Initialize session ID
TAGS.state.cfg["session_id"] = str(uuid.uuid4())

SIM = SimulatorEngine(TAGS)
CTRL = PLCStyleController(TAGS)
AI = AIAssistant(TAGS, SIM.event_logger, GeminiClient())
DB = EventStore()

# Initial update to set HMI flags
CTRL.update()

# Log initial session start and persist it
SIM._log_event("SESSION_STARTED", "SYSTEM", Severity.INFO, f"Initial session started: {TAGS.state.cfg['session_id']}")
DB.upsert_session(TAGS.state.cfg["session_id"])


def _flush_events_to_db() -> None:
    """Write any new in-memory events to SQLite."""
    session_id = TAGS.state.cfg.get("session_id", "")
    for event in SIM.event_logger.events:
        DB.write_event(event)
    # Update session counters
    if session_id:
        DB.upsert_session(session_id)


class CommandRequest(BaseModel):
    action: str


class RecipeRequest(BaseModel):
    recipe_id: str


class ScenarioStartRequest(BaseModel):
    scenario_id: str


class TickRequest(BaseModel):
    dt: float = 0.1


class SetInputRequest(BaseModel):
    name: str
    value: bool


class UpdateRecipeRequest(BaseModel):
    recipe_id: str
    recipe_name: Optional[str] = None
    products_per_pack: Optional[int] = Field(None, gt=0)
    grid_cols: Optional[int] = Field(None, gt=0)
    grid_rows: Optional[int] = Field(None, gt=0)
    nominal_cycle_time_sec: Optional[float] = Field(None, gt=0)
    product_spawn_interval_sec: Optional[float] = Field(None, gt=0)
    reject_probability: Optional[float] = Field(None, ge=0, le=1)
    jam_probability: Optional[float] = Field(None, ge=0, le=1)
    display_color: Optional[str] = None
    notes: Optional[str] = None


class InjectFaultRequest(BaseModel):
    code: str
    text: Optional[str] = None


class PlcScanRequest(BaseModel):
    """Transactional cyclic exchange request for PLC integration."""
    command_code: int = 0  # 1=START, 2=STOP, 3=RESET, 4=RUN_EMPTY, 5=MODE_AUTO, 6=MODE_MANUAL, 7=ACK_ALARM, 8=CLEAR_COUNTS, 9=REFILL_BLANKS, 10=CLEAR_REJECTS
    requested_mode: Optional[int] = None  # 0=AUTO, 1=MANUAL
    recipe_select: Optional[str] = None
    inputs: Optional[dict[str, bool]] = None


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/state")
def get_state() -> dict:
    return TAGS.snapshot()


# Push rate for the WebSocket state stream (5 Hz)
WS_PUSH_INTERVAL_SEC = 0.2


@app.websocket("/ws/state")
async def ws_state(websocket: WebSocket) -> None:
    """Stream live machine snapshots and recent events to connected clients.

    Replaces dashboard polling: each message carries the full tag snapshot and
    the most recent events. Commands remain HTTP request/response.
    """
    await websocket.accept()
    try:
        while True:
            events = SIM.event_logger.get_recent(5)
            payload = {
                "type": "state",
                "ts": datetime.now(timezone.utc).isoformat(),
                "state": TAGS.snapshot(),
                "events": [e.__dict__ for e in reversed(events)],
            }
            await websocket.send_json(payload)
            await asyncio.sleep(WS_PUSH_INTERVAL_SEC)
    except WebSocketDisconnect:
        pass


@app.get("/events")
def get_events(limit: int = Query(50, ge=1)) -> dict:
    """Return recent structured events, newest first."""
    events = SIM.event_logger.get_recent(limit)
    # Return newest first
    return {"events": [e.__dict__ for e in reversed(events)]}


@app.post("/tick")
def tick(req: Optional[TickRequest] = None) -> dict:
    """Development/testing endpoint to advance simulation."""
    dt = req.dt if req else 0.1
    SIM.update(dt)
    CTRL.update()
    return TAGS.snapshot()


@app.post("/command")
def command(req: CommandRequest) -> dict:
    action = req.action.lower()
    result = False

    if action == "start":
        result = CTRL.request_start()
    elif action == "stop":
        result = CTRL.request_stop()
    elif action == "run_empty":
        result = CTRL.request_run_empty()
    elif action == "reset":
        result = CTRL.request_reset()
    elif action == "mode_auto":
        result = CTRL.request_mode_auto()
    elif action == "mode_manual":
        result = CTRL.request_mode_manual()
    elif action == "refill_blanks":
        result = CTRL.refill_blanks()
    elif action == "clear_rejects":
        result = CTRL.request_clear_rejects()
    elif action == "jog_infeed":
        result = CTRL.jog_infeed()
    elif action == "jog_blank_feed":
        result = CTRL.jog_blank_feed()
    elif action == "jog_pack_advance":
        result = CTRL.jog_pack_advance()
    else:
        raise HTTPException(status_code=400, detail=f"unsupported action: {req.action}")

    # Run a 0-dt update to let the engine process the command pulse immediately
    SIM.update(0.0)
    CTRL.update()
    _flush_events_to_db()

    return {"accepted": result, "state": TAGS.snapshot()}


@app.post("/recipe")
def recipe(req: RecipeRequest) -> dict:
    accepted = CTRL.select_recipe(req.recipe_id)
    SIM.update(0.0)
    CTRL.update()
    return {"accepted": accepted, "state": TAGS.snapshot()}


def _persist_recipe(recipe_id: str, changes: dict[str, Any]) -> None:
    """Write recipe changes to recipes.json atomically (temp file + os.replace)."""
    with open(RECIPES_PATH, "r", encoding="utf-8") as f:
        raw_recipes = json.load(f)
    for r_dict in raw_recipes:
        if r_dict["recipe_id"] == recipe_id:
            r_dict.update(changes)
            break
    fd, tmp_name = tempfile.mkstemp(dir=RECIPES_PATH.parent, prefix=".recipes-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(raw_recipes, f, indent=2)
        os.replace(tmp_name, RECIPES_PATH)
    except BaseException:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise


@app.post("/recipe/update")
def update_recipe(req: UpdateRecipeRequest) -> dict:
    """Validate, persist, then commit a recipe edit so memory never diverges from disk."""
    if req.recipe_id not in SIM.ctx.recipes:
        raise HTTPException(status_code=404, detail="Recipe not found")

    current = SIM.ctx.recipes[req.recipe_id]
    changes = {
        k: v
        for k, v in req.model_dump(exclude_unset=True).items()
        if k != "recipe_id" and v is not None
    }
    candidate = dataclasses.replace(current, **changes)
    try:
        validate_recipe(candidate)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        _persist_recipe(req.recipe_id, changes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update recipes.json: {e}")

    SIM.ctx.recipes[req.recipe_id] = candidate

    # Re-evaluate logic if the active recipe was modified
    if TAGS.state.cfg["active_recipe_id"] == req.recipe_id:
        CTRL.update()

    return {"status": "ok", "recipe": _to_dict(candidate), "state": TAGS.snapshot()}


@app.post("/session/reset")
def reset_session() -> dict:
    """Reset the current session and clear event history."""
    old_session_id = TAGS.state.cfg.get("session_id", "")
    SIM._log_event("SESSION_ENDED", "SYSTEM", Severity.INFO, f"Session ended: {old_session_id}")
    _flush_events_to_db()
    if old_session_id:
        DB.close_session(old_session_id)

    new_session_id = str(uuid.uuid4())
    TAGS.state.cfg["session_id"] = new_session_id
    SIM.event_logger.clear()
    SIM._log_event("SESSION_STARTED", "SYSTEM", Severity.INFO, f"New session started: {new_session_id}")
    DB.upsert_session(new_session_id)
    return {"session_id": new_session_id, "state": TAGS.snapshot()}


@app.post("/scenario/start")
def start_scenario(req: ScenarioStartRequest) -> dict:
    """Start a training scenario."""
    from app.simulator.config_loader import load_scenarios
    scenarios = load_scenarios("configs/scenarios.json")
    scenario = next((s for s in scenarios if s.scenario_id == req.scenario_id), None)
    
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {req.scenario_id} not found")
        
    SIM.scenario_runner.start_scenario(scenario)
    return {"status": "started", "scenario_id": req.scenario_id, "state": TAGS.snapshot()}


@app.post("/scenario/stop")
def stop_scenario() -> dict:
    """Stop the active training scenario."""
    SIM.scenario_runner.stop_scenario()
    return {"status": "stopped", "state": TAGS.snapshot()}


def _to_dict(obj: Any) -> Any:
    """Recursively convert dataclasses and other structures to JSON-serializable dicts."""
    if dataclasses.is_dataclass(obj):
        result = {}
        for field in dataclasses.fields(obj):
            value = getattr(obj, field.name)
            result[field.name] = _to_dict(value)
        return result
    elif isinstance(obj, list):
        return [_to_dict(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: _to_dict(v) for k, v in obj.items()}
    elif isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    else:
        return str(obj)


@app.get("/recipes")
def get_recipes() -> dict:
    """List all available recipes."""
    return {"recipes": [_to_dict(r) for r in SIM.ctx.recipes.values()]}


@app.get("/scenarios")
def get_scenarios() -> dict:
    """List available training scenarios."""
    from app.simulator.config_loader import load_scenarios
    scenarios = load_scenarios("configs/scenarios.json")
    return {"scenarios": [_to_dict(s) for s in scenarios]}


@app.get("/sessions")
def get_sessions(limit: int = Query(20, ge=1, le=100)) -> dict:
    """Return recent sessions from the persistent store, newest first."""
    return {"sessions": DB.get_sessions(limit=limit)}


@app.get("/history/events")
def get_history_events(
    session_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    """Return paginated historical events from SQLite."""
    events = DB.get_events(session_id=session_id, severity=severity, limit=limit, offset=offset)
    return {"events": events, "count": len(events), "limit": limit, "offset": offset}


@app.get("/reports/session")
def get_session_report(format: str = "json") -> Any:
    """Generate a report for the current session."""
    session_id = TAGS.state.cfg.get("session_id", "")
    if not session_id:
        return {"error": "No active session"}
        
    report = generator.generate_session_report(session_id, SIM.event_logger.events)
    
    if format == "markdown":
        return generator.format_markdown_report(report)
        
    return report


@app.post("/dev/set-input")
def set_input(req: SetInputRequest, _dev: DevOnly) -> dict:
    """Force a machine input value (Dev only)."""
    if req.name not in TAGS.state.inputs:
        raise HTTPException(status_code=400, detail=f"Input {req.name} not found")
    TAGS.write_inputs(req.name, req.value)
    SIM.update(0.0)
    CTRL.update()
    return {"status": "ok", "state": TAGS.snapshot()}


@app.post("/dev/inject-fault")
def inject_fault(req: InjectFaultRequest, _dev: DevOnly) -> dict:
    """Manually inject a fault (Dev only)."""
    try:
        SIM.inject_fault(req.code, req.text or f"Manual injection: {req.code}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    CTRL.update()
    return {"status": "ok", "state": TAGS.snapshot()}


@app.get("/ai/explain-state")
def explain_state(debug: bool = False) -> dict:
    result = AI.explain_state()
    if not debug:
        del result["context"]
        del result["prompt"]
    return result


@app.get("/ai/explain-fault")
def explain_fault(debug: bool = False) -> dict:
    result = AI.explain_fault()
    if not debug:
        del result["context"]
        del result["prompt"]
    return result


@app.get("/ai/session-summary")
def session_summary(debug: bool = False) -> dict:
    result = AI.summarize_session()
    if not debug:
        del result["context"]
        del result["prompt"]
    return result


@app.post("/plc/scan")
def plc_scan(req: PlcScanRequest) -> dict:
    """Transactional cyclic exchange for PLC integration.

    This endpoint implements a deterministic scan cycle:
    1. Apply incoming inputs (known input names only, else 400)
    2. Run the controller scan cycle, which applies commands once
    3. Run the simulator update, which consumes the command pulses
    4. Re-evaluate permissives and check comms health
    5. Return the PLC-facing snapshot (all integer/boolean fields)

    This is the primary interface for a future Siemens PLC controller.
    """
    if req.inputs:
        unknown = sorted(k for k in req.inputs if k not in TAGS.state.inputs)
        if unknown:
            raise HTTPException(status_code=400, detail=f"Unknown input names: {unknown}")
        for key, value in req.inputs.items():
            TAGS.write_inputs(key, value)

    commands_in: dict[str, Any] = {"command_code": req.command_code}
    if req.requested_mode is not None:
        commands_in["requested_mode"] = req.requested_mode
    if req.recipe_select is not None:
        commands_in["recipe_select"] = req.recipe_select

    CTRL.scan_cycle(commands_in)
    SIM.update(0.1)
    CTRL.update()
    CTRL.check_comms_health()

    return asdict(tag_store_to_plc_snapshot(TAGS))


@app.get("/plc/status")
def plc_status() -> dict:
    """Get PLC scan cycle status and comms health.

    Returns PLC-facing integer/boolean fields only.
    """
    snapshot = tag_store_to_plc_snapshot(TAGS)
    return {
        "version": snapshot.version,
        "plc": asdict(snapshot.plc),
    }
