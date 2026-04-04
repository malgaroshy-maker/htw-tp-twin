import pytest
from app.shared.tag_store import TagStore
from app.shared.events import EventLogger
from app.ai.gemini_client import GeminiClient
from app.ai.assistant import AIAssistant
from app.ai import context_builder, prompts
from app.shared.enums import Severity, MachineState, MachineMode

@pytest.fixture
def assistant():
    tags = TagStore()
    event_logger = EventLogger()
    # Use mock mode for tests
    client = GeminiClient(mock_mode=True)
    return AIAssistant(tags, event_logger, client)

def test_context_building(assistant):
    tags = assistant.tags
    # Set some state
    tags.state.sts["machine_state"] = MachineState.RUNNING.value
    tags.state.out["good_pack_count"] = 10
    
    ctx = context_builder.build_state_context(tags)
    assert ctx["machine_state"] == MachineState.RUNNING.value
    assert ctx["good_pack_count"] == 10

def test_prompt_assembly(assistant):
    ctx = {"machine_state": "RUNNING", "machine_mode": "AUTO", "cycle_phase": "IDLE", "active_recipe": "24-pack", "grouped_count": 0, "target_group_count": 24, "good_pack_count": 10, "reject_pack_count": 0, "cycle_count": 1}
    prompt = prompts.build_explain_state_prompt(ctx)
    assert "RUNNING" in prompt
    assert "24-pack" in prompt

def test_assistant_explain_state(assistant):
    result = assistant.explain_state()
    assert "model_output" in result
    assert "[MOCK]" in result["model_output"]
    assert "context" in result
    assert "prompt" in result

def test_assistant_explain_fault(assistant):
    result = assistant.explain_fault()
    assert "model_output" in result
    assert "[MOCK]" in result["model_output"]

def test_assistant_summarize_session(assistant):
    result = assistant.summarize_session()
    assert "model_output" in result
    assert "[MOCK]" in result["model_output"]
