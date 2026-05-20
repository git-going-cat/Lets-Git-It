import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.redis_client import get_redis
from app.routers import ask, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RAG server starting up")
    yield
    logger.info("RAG server shutting down")
    await get_redis().aclose()


app = FastAPI(title="Pro Git RAG API", lifespan=lifespan)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ask.router)
