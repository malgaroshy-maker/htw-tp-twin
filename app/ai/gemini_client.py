from __future__ import annotations

import os
from google import genai
from google.genai import errors

class GeminiClient:
    """Wrapper for the official Google GenAI SDK with mock support and graceful fallback."""

    def __init__(self, mock_mode: bool = False) -> None:
        self.mock_mode = mock_mode
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model_name = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")
        
        self.client = None
        if not self.mock_mode and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Gemini client: {e}")

    def generate_content(self, system_prompt: str, user_prompt: str) -> str:
        """Generate content using Gemini or return a mock/error response."""
        if self.mock_mode:
            return f"[MOCK] AI response for: {user_prompt[:50]}..."

        if not self.api_key:
            return "AI Assistant unavailable: GEMINI_API_KEY not configured in environment."

        if not self.client:
            return "AI Assistant unavailable: Client initialization failed."

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                config={
                    "system_instruction": system_prompt,
                },
                contents=user_prompt
            )
            return response.text
        except errors.ClientError as e:
            return f"AI Assistant error (Client): {e.message}"
        except Exception as e:
            return f"AI Assistant error (Unexpected): {str(e)}"
