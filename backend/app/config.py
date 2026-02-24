from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://kinstretch:kinstretch@localhost:5432/kinstretch"
    DATABASE_URL_SYNC: str = "postgresql://kinstretch:kinstretch@localhost:5432/kinstretch"
    UPLOAD_DIR: Path = Path("uploads")
    MODEL_DIR: Path = Path("models")
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DEFAULT_USER_EMAIL: str = "demo@kinstretch.app"
    DEFAULT_USER_NAME: str = "Demo User"

    model_config = {"env_prefix": "KINSTRETCH_"}


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
