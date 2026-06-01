from pathlib import Path
from functools import cached_property
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    DB_HOST: str
    DB_PORT: int = 5432

    JWT_PUBLIC_KEY_PATH: str
    JWT_ALGORITHM: str

    KAFKA_BOOTSTRAP_SERVERS: str

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://"
            f"{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.DB_HOST}:"
            f"{self.DB_PORT}/"
            f"{self.POSTGRES_DB}"
        )

    @cached_property
    def jwt_public_key(self) -> str:
        return Path(self.JWT_PUBLIC_KEY_PATH).read_text()

    class Config:
        env_file = ".env"


settings = Settings()