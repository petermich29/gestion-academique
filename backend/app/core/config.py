# backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DB_USER: str = "postgres"
    DB_PASS: str = "5864"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "db_academique"
    FRONTEND_URL: str = "http://localhost:5173"

    # 🔹 Liste des origines autorisées pour CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
