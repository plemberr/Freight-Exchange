from fastapi import FastAPI

from app.api.router import api_router


app = FastAPI(
    title="Route Service"
)

app.include_router(
    api_router,
    prefix="/api/v1/routes"
)