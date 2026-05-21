from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str
    app_host: str
    app_port: int

    database_url: str

    jwt_secret: str | None = None
    jwt_public_key_path: str
    jwt_algorithm: str = "RS256"

    redis_url: str
    kafka_bootstrap_servers: str

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
    )


settings = Settings()