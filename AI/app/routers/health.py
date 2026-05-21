from fastapi import APIRouter
from fastapi.responses import JSONResponse
from loguru import logger

from app.redis_client import get_redis

router = APIRouter()


@router.get("/healthz")
async def healthz():
    try:
        await get_redis().ping()
    except Exception as e:
        logger.warning(f"Healthcheck failed: redis ping error: {e}")
        return JSONResponse({"status": "error", "detail": "redis"}, status_code=503)
    return {"status": "ok"}
