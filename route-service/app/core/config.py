from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    APP_NAME: str

    ORS_API_KEY: str

    ORS_BASE_URL: str

    class Config:
        env_file = ".env"


settings = Settings()