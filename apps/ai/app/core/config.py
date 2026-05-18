from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    NODE_ENV: str = "development"
    DATABASE_URL: str
    AI_INTERNAL_KEY: str
    API_SERVICE_URL: str = "http://api:4000"
    ANTHROPIC_API_KEY: str = ""
    REDIS_URL: str = "redis://redis:6379"

    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")


settings = Settings()
