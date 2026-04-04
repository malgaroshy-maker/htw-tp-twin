from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.shared.enums import MachineMode, MachineState, Severity
from app.shared.models import EventRecord, TagStoreModel


def create_event(
    event_code: str,
    message: str,
    category: str,
    severity: Severity,
    tag_state: TagStoreModel,
    session_id: str = "",
    scenario_id: str = "",
    metadata: dict | None = None,
) -> EventRecord:
    """Create a structured EventRecord from current machine state."""
    return EventRecord(
        event_id=str(uuid.uuid4()),
        ts=datetime.now(timezone.utc).isoformat(),
        event_code=event_code,
        category=category,
        severity=severity,
        machine_state=MachineState(tag_state.sts["machine_state"]),
        machine_mode=MachineMode(tag_state.sts["machine_mode"]),
        recipe_id=tag_state.cfg["active_recipe_id"],
        message=message,
        session_id=session_id or tag_state.cfg.get("session_id", ""),
        scenario_id=scenario_id or tag_state.cfg.get("active_scenario_id", ""),
        metadata=metadata or {},
    )
