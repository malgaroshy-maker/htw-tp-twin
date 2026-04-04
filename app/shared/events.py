from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.shared.enums import MachineMode, MachineState, Severity
from app.shared.models import EventRecord


class EventLogger:
    """Standardized event logging for the tray packer platform."""

    def __init__(self) -> None:
        self.events: list[EventRecord] = []

    def log(
        self,
        event_code: str,
        category: str,
        severity: Severity,
        machine_state: MachineState,
        machine_mode: MachineMode,
        recipe_id: str,
        message: str,
        session_id: str = "",
        scenario_id: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> EventRecord:
        """Create and store a new event record."""
        event = EventRecord(
            event_id=str(uuid.uuid4()),
            ts=datetime.now(timezone.utc).isoformat(),
            event_code=event_code,
            category=category,
            severity=severity,
            machine_state=machine_state,
            machine_mode=machine_mode,
            recipe_id=recipe_id,
            message=message,
            session_id=session_id,
            scenario_id=scenario_id,
            metadata=metadata or {},
        )
        self.events.append(event)
        return event

    def clear(self) -> None:
        """Clear the in-memory event log."""
        self.events = []

    def get_recent(self, limit: int = 50) -> list[EventRecord]:
        """Return the most recent events."""
        return self.events[-limit:]
