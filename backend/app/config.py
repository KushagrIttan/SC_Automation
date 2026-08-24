"""Centralised configuration — reads env vars / .env at import time."""

import os
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # --- LLM provider ---
    llm_provider: Literal["ollama", "gemini"] = "ollama"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5-coder:3b"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # --- Embeddings ---
    embedding_model: str = "all-MiniLM-L6-v2"

    # --- Auth ---
    auth_secret: str = "dev-secret-change-me-in-production"

    # --- Data ---
    data_dir: str = os.path.join(os.path.dirname(__file__), "..", "data")

    # --- Server ---
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = {
        "env_file": os.path.join(os.path.dirname(__file__), "..", ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Singleton – importable anywhere as `from app.config import settings`
settings = Settings()


def persist_settings() -> None:
    """Write the current provider configuration to backend/.env so it
    survives restarts. Values are read back by pydantic-settings on boot."""
    path = os.path.join(os.path.dirname(__file__), "..", ".env")
    lines: dict[str, str] = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for raw in fh:
                key, _, value = raw.strip().partition("=")
                if key:
                    lines[key] = value

    def upsert(key: str, value: str) -> None:
        if value:
            lines[key] = value

    lines["LLM_PROVIDER"] = settings.llm_provider
    upsert("OLLAMA_BASE_URL", settings.ollama_base_url)
    upsert("OLLAMA_MODEL", settings.ollama_model)
    upsert("GEMINI_MODEL", settings.gemini_model)
    if settings.gemini_api_key:
        upsert("GEMINI_API_KEY", settings.gemini_api_key)

    with open(path, "w", encoding="utf-8") as fh:
        for key, value in lines.items():
            fh.write(f"{key}={value}\n")
