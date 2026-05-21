import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.rag.vector_store import load_index
from app.redis_client import get_redis
from app.routers import ask, coaching, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading vector index...")
    load_index()
    logger.info("Vector index loaded")
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
    allow_headers=["Content-Type", "X-API-Key"],
)

app.include_router(health.router)
app.include_router(ask.router)
app.include_router(coaching.router)
