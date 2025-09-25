# TRUEFIBACKEND/config.py
# Environment configuration for TrueFi agent framework

import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class Config:
    """Configuration for the TrueFi agent framework"""

    # Check if running on Cloud Run
    IS_CLOUD_RUN = os.getenv("K_SERVICE") is not None

    # Database configuration
    if IS_CLOUD_RUN:
        # Cloud Run with Cloud SQL - use Unix socket
        DB_HOST = os.getenv("DB_HOST", "/cloudsql/truefi:us-central1:true-fi-db")
        DB_PORT = None  # Unix socket doesn't use port
        DB_NAME = os.getenv("DB_NAME", "truefi_app_data")
        DB_USER = os.getenv("DB_USER", "truefi_user")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")
        DB_SSLMODE = os.getenv("DB_SSLMODE", "disable")  # Unix socket is already secure
    else:
        # Local development
        DB_HOST = os.getenv("DB_HOST", "localhost")
        DB_PORT = int(os.getenv("DB_PORT", "5432"))
        DB_NAME = os.getenv("DB_NAME", "truefi_app_data")
        DB_USER = os.getenv("DB_USER", "truefi_user")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")
        DB_SSLMODE = os.getenv("DB_SSLMODE", "disable")  # Changed from 'require' to 'disable' for Cloud SQL proxy

    # OpenAI configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "4000"))
    OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))

    # GPT-5 Configuration (Primary AI Brain)
    USE_GPT5_UNIFIED = os.getenv("USE_GPT5_UNIFIED", "true").lower() == "true"  # Use GPT-5 as primary agent
    ADVANCED_MODEL = os.getenv("ADVANCED_MODEL", "gpt-5")  # GPT-5 for everything

    # GPT-5 Responses API tuning
    # Use low reasoning for faster responses (< 5 minutes)
    GPT5_REASONING_EFFORT = os.getenv("GPT5_REASONING_EFFORT", "low")  # low|medium|high - low for faster responses
    GPT5_VERBOSITY = os.getenv("GPT5_VERBOSITY", "low")  # low|medium|high - low for more concise responses
    GPT5_TIMEOUT_SECONDS = int(os.getenv("GPT5_TIMEOUT_SECONDS", "280"))  # 4.6 minutes to stay under Vercel's 5-minute limit

    # Modeling prompt truncation
    MODELING_MAX_ROWS = int(os.getenv("MODELING_MAX_ROWS", "150"))
    MODELING_MAX_CHARS = int(os.getenv("MODELING_MAX_CHARS", "15000"))
    MODELING_INCLUDE_FULL_PROFILE_JSON = os.getenv("MODELING_INCLUDE_FULL_PROFILE_JSON", "true").lower() == "true"
    PROFILE_JSON_MAX_CHARS = int(os.getenv("PROFILE_JSON_MAX_CHARS", "120000"))

    # Agent configuration
    MAX_SQL_REVISIONS = int(os.getenv("MAX_SQL_REVISIONS", "1"))
    MAX_MODEL_REVISIONS = int(os.getenv("MAX_MODEL_REVISIONS", "1"))
    MAX_SQL_ROWS = int(os.getenv("MAX_SQL_ROWS", "1000"))
    PROFILE_PACK_CACHE_MINUTES = int(os.getenv("PROFILE_PACK_CACHE_MINUTES", "60"))  # Increased from 15 to 60 for better performance
    MEMORY_ENABLED = os.getenv("MEMORY_ENABLED", "false").lower() == "true"  # Default off for simplicity

    # Logging configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "agent_execution.log")
    LOG_TO_DB = os.getenv("LOG_TO_DB", "true").lower() == "true"

    # Security configuration
    JWT_SECRET = os.getenv("JWT_SECRET", "")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://truefi.ai").split(",")

    # New Planner and Resolver configuration
    PLANNER_ENABLED = os.getenv("PLANNER_ENABLED", "true").lower() == "true"
    RESOLVER_ENABLED = os.getenv("RESOLVER_ENABLED", "true").lower() == "true"
    CLOSER_ENABLED = os.getenv("CLOSER_ENABLED", "false").lower() == "true"  # Start with false for safety

    PLANNER_MODEL = os.getenv("PLANNER_MODEL", "gpt-4o")  # Lightweight
    CLOSER_MODEL = os.getenv("CLOSER_MODEL", "gpt-5")  # Using GPT-5

    DEFAULT_MERCHANT_WINDOW_DAYS = int(os.getenv("DEFAULT_MERCHANT_WINDOW_DAYS", "90"))
    MERCHANT_RESOLVER_CACHE_MINUTES = int(os.getenv("MERCHANT_RESOLVER_CACHE_MINUTES", "60"))

    # Critique configuration
    CRITIQUE_ENABLED = os.getenv("CRITIQUE_ENABLED", "true").lower() == "true"
    CRITIQUE_ENFORCEMENT = os.getenv("CRITIQUE_ENFORCEMENT", "off")  # soft|hard|off
    CRITIQUE_TIMEOUT_SECONDS = int(os.getenv("CRITIQUE_TIMEOUT_SECONDS", "30"))
    CRITIQUE_AUTOFIX_ENABLED = os.getenv("CRITIQUE_AUTOFIX_ENABLED", "false").lower() == "true"

    # Modeling narrative mode
    MODELING_INCLUDE_FULL_PROFILE_JSON = os.getenv("MODELING_INCLUDE_FULL_PROFILE_JSON", "true").lower() == "true"
    PROFILE_JSON_MAX_CHARS = int(os.getenv("PROFILE_JSON_MAX_CHARS", "120000"))
    MODELING_NARRATIVE_ONLY = os.getenv("MODELING_NARRATIVE_ONLY", "true").lower() == "true"
    MODELING_INCLUDE_COMPUTATIONS = os.getenv("MODELING_INCLUDE_COMPUTATIONS", "false").lower() == "true"

    @classmethod
    def get_database_url(cls) -> str:
        """Get the PostgreSQL connection URL"""
        return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?sslmode={cls.DB_SSLMODE}"

    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required")
        if not cls.DB_PASSWORD:
            raise ValueError("DB_PASSWORD is required")
        if not cls.JWT_SECRET:
            raise ValueError("JWT_SECRET is required")

config = Config()
