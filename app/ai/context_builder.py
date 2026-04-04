from __future__ import annotations

from typing import Any
from app.shared.tag_store import TagStore
from app.shared.events import EventRecord

def build_state_context(tags: TagStore) -> dict[str, Any]:
    """Extract current machine state and production metrics."""
    state = tags.snapshot()
    return {
        "machine_state": state["sts"]["machine_state"],
        "machine_mode": state["sts"]["machine_mode"],
        "cycle_phase": state["sts"]["cycle_phase"],
        "active_recipe": state["cfg"]["active_recipe_id"],
        "active_recipe_name": state["cfg"]["active_recipe_name"],
        "grouped_count": state["out"]["grouped_count"],
        "target_group_count": state["out"]["target_group_count"],
        "good_pack_count": state["out"]["good_pack_count"],
        "reject_pack_count": state["out"]["reject_pack_count"],
        "cycle_count": state["out"]["cycle_count"],
        "total_product_in": state["out"]["total_product_in"],
        "total_product_used": state["out"]["total_product_used"],
        "ready_to_start": state["sts"]["ready_to_start"],
        "fault_active": state["sts"]["fault_active"],
        "warning_active": state["sts"]["warning_active"],
    }

def build_fault_context(tags: TagStore, events: list[EventRecord]) -> dict[str, Any]:
    """Extract active fault details and recent event timeline."""
    state = tags.snapshot()
    fault = state["fault"]
    
    # Get last 10 events for timeline
    timeline = []
    for e in events[-10:]:
        timeline.append({
            "ts": e.ts,
            "code": e.event_code,
            "message": e.message,
            "severity": e.severity
        })
        
    return {
        "active_fault_code": fault["active_code"],
        "active_fault_text": fault["active_text"],
        "active_severity": fault["active_severity"],
        "is_latched": fault["latched"],
        "fault_timestamp": fault["timestamp"],
        "machine_state": state["sts"]["machine_state"],
        "recent_events": timeline,
        "inputs": state["inputs"],
    }

def build_session_context(tags: TagStore, events: list[EventRecord]) -> dict[str, Any]:
    """Aggregate session performance and fault frequency."""
    state = tags.snapshot()
    out = state["out"]
    
    # Calculate fault frequency and downtime
    fault_counts: dict[str, int] = {}
    reject_reasons: dict[str, int] = {}
    for e in events:
        if e.category == "FAULT":
            code = e.metadata.get("fault_code") or e.event_code
            fault_counts[code] = fault_counts.get(code, 0) + 1
        elif e.category == "REJECT":
            reason = e.metadata.get("reason") or "UNKNOWN"
            reject_reasons[reason] = reject_reasons.get(reason, 0) + 1
            
    return {
        "recipe_id": state["cfg"]["active_recipe_id"],
        "recipe_name": state["cfg"]["active_recipe_name"],
        "total_cycles": out["cycle_count"],
        "good_packs": out["good_pack_count"],
        "reject_packs": out["reject_pack_count"],
        "reject_reasons": reject_reasons,
        "runtime_sec": out["runtime_sec"],
        "downtime_sec": out["downtime_sec"],
        "avg_cycle_time": out["avg_cycle_time_sec"],
        "fault_summary": fault_counts,
        "session_id": state["cfg"]["session_id"],
        "scenario_id": state["cfg"]["active_scenario_id"],
    }
