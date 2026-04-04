from __future__ import annotations

from typing import Any
from app.shared.events import EventRecord


def generate_session_report(session_id: str, events: list[EventRecord]) -> dict[str, Any]:
    """Generate a structured session report from event history."""
    session_events = [e for e in events if e.session_id == session_id]
    if not session_events:
        return {}

    start_ts = session_events[0].ts
    end_ts = session_events[-1].ts
    
    # Aggregate metrics
    recipes_used = sorted(list(set(e.recipe_id for e in session_events)))
    
    total_cycles = 0
    good_packs = 0
    reject_packs = 0
    
    fault_summary: dict[str, int] = {}
    reject_reasons: dict[str, int] = {}
    
    for e in session_events:
        if e.event_code == "PACK_GOOD_DISCHARGED":
            good_packs += 1
            total_cycles += 1
        elif e.event_code == "PACK_REJECT_DISCHARGED":
            reject_packs += 1
            total_cycles += 1
            reason = e.metadata.get("reason") or "UNKNOWN"
            reject_reasons[reason] = reject_reasons.get(reason, 0) + 1
        elif e.category == "FAULT":
            code = e.metadata.get("fault_code") or e.event_code
            fault_summary[code] = fault_summary.get(code, 0) + 1

    return {
        "session_id": session_id,
        "start_ts": start_ts,
        "end_ts": end_ts,
        "recipes_used": recipes_used,
        "total_cycles": total_cycles,
        "good_packs": good_packs,
        "rejected_packs": reject_packs,
        "reject_reasons": reject_reasons,
        "fault_summary": fault_summary,
    }


def format_markdown_report(report: dict[str, Any]) -> str:
    """Format a structured report into Markdown."""
    if not report:
        return "No data available for this session."

    md = f"# Session Report: {report['session_id']}\n\n"
    md += f"- **Start:** {report['start_ts']}\n"
    md += f"- **End:** {report['end_ts']}\n"
    md += f"- **Recipes:** {', '.join(report['recipes_used'])}\n\n"
    
    md += "## Production Summary\n\n"
    md += f"- **Total Cycles:** {report['total_cycles']}\n"
    md += f"- **Good Packs:** {report['good_packs']}\n"
    md += f"- **Rejected Packs:** {report['rejected_packs']}\n"
    
    reject_reasons = report.get('reject_reasons', {})
    if reject_reasons:
        md += "\n### Reject Reasons\n"
        for reason, count in reject_reasons.items():
            md += f"- {reason}: {count}\n"
    
    md += "\n## Fault Summary\n\n"
    fault_summary = report.get('fault_summary', {})
    if not fault_summary:
        md += "No faults recorded.\n"
    else:
        for code, count in fault_summary.items():
            md += f"- {code}: {count} occurrences\n"
            
    return md
