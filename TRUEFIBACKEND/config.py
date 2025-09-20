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
        DB_NAME = os.getenv("DB_NAME", "truefi")
        DB_USER = os.getenv("DB_USER", "postgres")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")
        DB_SSLMODE = os.getenv("DB_SSLMODE", "disable")  # Unix socket is already secure
    else:
        # Local development
        DB_HOST = os.getenv("DB_HOST", "localhost")
        DB_PORT = int(os.getenv("DB_PORT", "5432"))
        DB_NAME = os.getenv("DB_NAME", "truefi")
        DB_USER = os.getenv("DB_USER", "postgres")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")
        DB_SSLMODE = os.getenv("DB_SSLMODE", "require")

    # OpenAI configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "4000"))
    OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))

    # Agent configuration
    MAX_SQL_REVISIONS = int(os.getenv("MAX_SQL_REVISIONS", "1"))
    MAX_MODEL_REVISIONS = int(os.getenv("MAX_MODEL_REVISIONS", "1"))
    MAX_SQL_ROWS = int(os.getenv("MAX_SQL_ROWS", "1000"))
    PROFILE_PACK_CACHE_MINUTES = int(os.getenv("PROFILE_PACK_CACHE_MINUTES", "60"))  # Increased from 15 to 60 for better performance

    # Logging configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "agent_execution.log")
    LOG_TO_DB = os.getenv("LOG_TO_DB", "true").lower() == "true"

    # Security configuration
    JWT_SECRET = os.getenv("JWT_SECRET", "")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://truefi.ai").split(",")

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