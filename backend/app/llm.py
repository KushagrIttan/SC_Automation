"""LLM provider abstraction — Ollama and Gemini implementations."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Optional

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class LLMProvider(ABC):
    """Protocol every LLM backend must satisfy."""

    @abstractmethod
    def generate(self, prompt: str) -> str:
        """Send *prompt* and return the model's text response."""

    @abstractmethod
    def provider_name(self) -> str:
        """Return a human-readable provider identifier."""

    @abstractmethod
    def model_name(self) -> str:
        """Return the model identifier currently in use."""


# ---------------------------------------------------------------------------
# Ollama
# ---------------------------------------------------------------------------

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str, model: str):
        self._base_url = base_url
        self._model = model

    def generate(self, prompt: str) -> str:
        import ollama
        response = ollama.chat(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response["message"]["content"]

    def provider_name(self) -> str:
        return "ollama"

    def model_name(self) -> str:
        return self._model


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required when using the Gemini provider.")
        self._model_name = model
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self._client = genai.GenerativeModel(model)

    def generate(self, prompt: str) -> str:
        response = self._client.generate_content(prompt)
        return response.text

    def provider_name(self) -> str:
        return "gemini"

    def model_name(self) -> str:
        return self._model_name


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_current_provider: Optional[LLMProvider] = None


def get_llm_provider() -> LLMProvider:
    """Return the current provider singleton (lazy-initialised)."""
    global _current_provider
    if _current_provider is None:
        from app.config import settings
        _current_provider = _build_provider(
            settings.llm_provider,
            settings,
        )
    return _current_provider


def switch_provider(
    provider: str,
    *,
    gemini_api_key: str = "",
    gemini_model: str = "",
    ollama_base_url: str = "",
    ollama_model: str = "",
) -> LLMProvider:
    """Switch the active LLM provider at runtime."""
    global _current_provider
    from app.config import settings

    # Update settings object in memory
    settings.llm_provider = provider  # type: ignore[assignment]
    if provider == "gemini":
        if gemini_api_key:
            settings.gemini_api_key = gemini_api_key
        if gemini_model:
            settings.gemini_model = gemini_model
    elif provider == "ollama":
        if ollama_base_url:
            settings.ollama_base_url = ollama_base_url
        if ollama_model:
            settings.ollama_model = ollama_model

    _current_provider = _build_provider(provider, settings)
    log.info("Switched LLM provider to %s (%s)", provider, _current_provider.model_name())
    return _current_provider


def _build_provider(provider: str, settings) -> LLMProvider:
    if provider == "gemini":
        return GeminiProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
    # Default to Ollama
    return OllamaProvider(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
    )
