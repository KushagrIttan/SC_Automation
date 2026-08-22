"""Centralised configuration — reads env vars / .env at import time."""

import os
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # --- LLM provider ---
    llm_provider: Literal["ollama", "gemini"] = "ollama"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "hf.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF:Q4_K_M"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # --- Embeddings ---
    embedding_model: str = "all-MiniLM-L6-v2"

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
