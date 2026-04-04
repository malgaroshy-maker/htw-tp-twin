from __future__ import annotations

from typing import Any
from app.shared.tag_store import TagStore
from app.shared.events import EventLogger
from app.ai.gemini_client import GeminiClient
from app.ai import context_builder, prompts

class AIAssistant:
    """Orchestrates context building, prompt formatting, and Gemini API calls."""

    def __init__(self, tags: TagStore, event_logger: EventLogger, gemini_client: GeminiClient) -> None:
        self.tags = tags
        self.event_logger = event_logger
        self.client = gemini_client

    def explain_state(self) -> dict[str, Any]:
        """Explain the current machine state."""
        ctx = context_builder.build_state_context(self.tags)
        prompt = prompts.build_explain_state_prompt(ctx)
        output = self.client.generate_content(prompts.SYSTEM_PROMPT, prompt)
        return {
            "model_output": output,
            "context": ctx,
            "prompt": prompt
        }

    def explain_fault(self) -> dict[str, Any]:
        """Explain the current or last fault."""
        events = self.event_logger.events
        ctx = context_builder.build_fault_context(self.tags, events)
        prompt = prompts.build_explain_fault_prompt(ctx)
        output = self.client.generate_content(prompts.SYSTEM_PROMPT, prompt)
        return {
            "model_output": output,
            "context": ctx,
            "prompt": prompt
        }

    def summarize_session(self) -> dict[str, Any]:
        """Generate a summary of the current session."""
        events = self.event_logger.events
        ctx = context_builder.build_session_context(self.tags, events)
        prompt = prompts.build_session_summary_prompt(ctx)
        output = self.client.generate_content(prompts.SYSTEM_PROMPT, prompt)
        return {
            "model_output": output,
            "context": ctx,
            "prompt": prompt
        }
