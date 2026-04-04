import pytest
from app.shared.tag_store import TagStore
from app.simulator.engine import SimulatorEngine
from app.reports import generator

@pytest.fixture
def engine():
    tags = TagStore()
    return SimulatorEngine(tags)

def test_report_generation(engine):
    session_id = "test-session"
    engine.tags.state.cfg["session_id"] = session_id
    
    # Simulate some events
    engine._log_event("PACK_GOOD_DISCHARGED", "PRODUCTION", "INFO", "Good pack")
    engine._log_event("PACK_GOOD_DISCHARGED", "PRODUCTION", "INFO", "Good pack")
    engine._log_event("PACK_REJECT_DISCHARGED", "REJECT", "WARNING", "Reject pack")
    engine._log_event("FAULT_BLANK_MISSING", "FAULT", "FAULT", "Blank missing", metadata={"fault_code": "BLANK_MISSING"})
    
    report = generator.generate_session_report(session_id, engine.event_logger.events)
    
    assert report["session_id"] == session_id
    assert report["total_cycles"] == 3
    assert report["good_packs"] == 2
    assert report["rejected_packs"] == 1
    assert report["fault_summary"]["BLANK_MISSING"] == 1
    assert "24-pack" in report["recipes_used"]

def test_markdown_report_format():
    report = {
        "session_id": "test-123",
        "start_ts": "2026-04-01T12:00:00Z",
        "end_ts": "2026-04-01T12:05:00Z",
        "recipes_used": ["24-pack"],
        "total_cycles": 10,
        "good_packs": 9,
        "rejected_packs": 1,
        "fault_summary": {"JAM": 1}
    }
    
    md = generator.format_markdown_report(report)
    assert "# Session Report: test-123" in md
    assert "Good Packs:** 9" in md
    assert "JAM: 1 occurrences" in md
