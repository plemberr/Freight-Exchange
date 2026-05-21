import asyncio

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import settings
from app.infrastructure.db.session import engine
from app.infrastructure.messaging.kafka_consumer import consume_user_registered
from app.presentation.api.v1.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    kafka_task = asyncio.create_task(consume_user_registered())
    yield
    kafka_task.cancel()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

app.include_router(users_router)


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}


@app.get("/db-check")
async def db_check():
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    return {"database": "connected"}
