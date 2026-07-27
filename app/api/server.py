import uuid
from typing import Any, Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.shared.tag_store import TagStore
from app.shared.enums import Severity
from app.shared.persistence import EventStore
from app.simulator.engine import SimulatorEngine
from app.control.controller import PLCStyleController
from app.ai.assistant import AIAssistant
from app.ai.gemini_client import GeminiClient
from app.reports import generator

app = FastAPI(title="Tray Packer Digital Twin API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    value: Any


class UpdateRecipeRequest(BaseModel):
    recipe_id: str
    recipe_name: Optional[str] = None
    products_per_pack: Optional[int] = None
    grid_cols: Optional[int] = None
    grid_rows: Optional[int] = None
    nominal_cycle_time_sec: Optional[float] = None
    product_spawn_interval_sec: Optional[float] = None
    reject_probability: Optional[float] = None
    jam_probability: Optional[float] = None
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
    error = None

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
        error = "unsupported action"

    # Run a 0-dt update to let the engine process the command pulse immediately
    SIM.update(0.0)
    CTRL.update()
    _flush_events_to_db()

    response: dict[str, Any] = {"accepted": result, "state": TAGS.snapshot()}
    if error:
        response["error"] = error
    
    return response


@app.post("/recipe")
def recipe(req: RecipeRequest) -> dict:
    accepted = CTRL.select_recipe(req.recipe_id)
    SIM.update(0.0)
    CTRL.update()
    return {"accepted": accepted, "state": TAGS.snapshot()}


@app.post("/recipe/update")
def update_recipe(req: UpdateRecipeRequest) -> dict:
    import json
    from app.simulator.config_loader import load_recipes
    
    # Check if recipe exists
    if req.recipe_id not in SIM.ctx.recipes:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    recipe = SIM.ctx.recipes[req.recipe_id]
    
    # Update fields that are provided
    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(recipe, key) and key != "recipe_id":
            setattr(recipe, key, value)
            
    # Load raw JSON directly and update it
    import os
    recipes_path = "configs/recipes.json"
    try:
        with open(recipes_path, 'r', encoding='utf-8') as f:
            raw_recipes = json.load(f)
            
        for r_dict in raw_recipes:
            if r_dict["recipe_id"] == req.recipe_id:
                for key, value in update_data.items():
                    if key != "recipe_id":
                        r_dict[key] = value
                break
                
        # Save back
        with open(recipes_path, 'w', encoding='utf-8') as f:
            json.dump(raw_recipes, f, indent=2)
            
    except Exception as e:
        print(f"Failed to update recipes.json: {e}")
        
    # Re-evaluate logic based on new settings (re-select active recipe if it's the one modified to trigger resets if necessary)
    if TAGS.state.cfg["active_recipe_id"] == req.recipe_id:
        CTRL.update()
        
    return {"status": "ok", "recipe": _to_dict(recipe), "state": TAGS.snapshot()}


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
    import dataclasses
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
def set_input(req: SetInputRequest) -> dict:
    """Force a machine input value (Dev only)."""
    if req.name in TAGS.state.inputs:
        TAGS.state.inputs[req.name] = req.value
        SIM.update(0.0)
        CTRL.update()
        return {"status": "ok", "state": TAGS.snapshot()}
    raise HTTPException(status_code=400, detail=f"Input {req.name} not found")


@app.post("/dev/inject-fault")
def inject_fault(req: InjectFaultRequest) -> dict:
    """Manually inject a fault (Dev only)."""
    SIM.inject_fault(req.code, req.text or f"Manual injection: {req.code}")
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
    1. Accept commands/inputs from PLC
    2. Execute simulator update
    3. Execute controller scan cycle
    4. Check comms health
    5. Return deterministic PLC-facing snapshot (all integer/boolean fields)

    This is the primary interface for a future Siemens PLC controller.
    """
    # Apply incoming inputs if provided
    if req.inputs:
        for key, value in req.inputs.items():
            if key in TAGS.state.inputs:
                TAGS.state.inputs[key] = value

    # Execute simulator update
    SIM.update(0.1)

    # Execute controller scan cycle with commands
    commands_in = {
        "command_code": req.command_code,
        "requested_mode": req.requested_mode,
        "recipe_select": req.recipe_select,
    }
    scan_result = CTRL.scan_cycle(commands_in)

    # Check comms health
    CTRL.check_comms_health()

    # Return PLC-facing snapshot as dict
    from dataclasses import asdict
    return asdict(scan_result)


@app.get("/plc/status")
def plc_status() -> dict:
    """Get PLC scan cycle status and comms health.

    Returns PLC-facing integer/boolean fields only.
    """
    from app.shared.plc_mapping import tag_store_to_plc_snapshot
    snapshot = tag_store_to_plc_snapshot(TAGS)
    from dataclasses import asdict
    return {
        "version": snapshot.version,
        "plc": asdict(snapshot.plc),
    }
