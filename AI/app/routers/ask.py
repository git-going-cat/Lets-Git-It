import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

from app.middleware.auth import verify_api_key
from app.middleware.rate_limit import check_rate_limit
from app.rag.answer import stream_answer
from app.rag.cache import get_cached, make_cache_key
from app.rag.search import search

router = APIRouter()

NOT_FOUND_MSG = "제공된 자료에서 해당 내용을 찾을 수 없습니다."


class AskRequest(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query는 비어있을 수 없습니다")
        if len(v) > 500:
            raise ValueError("query는 500자를 초과할 수 없습니다")
        return v


@router.post("/ask", dependencies=[Depends(verify_api_key)])
async def ask(body: AskRequest, request: Request):
    await check_rate_limit(request)

    query = body.query
    cache_key = make_cache_key(query)

    cached = await get_cached(cache_key)
    if cached:
        async def cached_stream():
            yield f"event: sources\ndata: {json.dumps(cached['sources'], ensure_ascii=False)}\n\n"
            yield f"event: cached\ndata: {json.dumps({'text': cached['answer']}, ensure_ascii=False)}\n\n"
            yield f"event: done\ndata: {json.dumps({'cached': True})}\n\n"
        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    chunks = await search(query)
    if not chunks:
        async def not_found_stream():
            yield f"event: sources\ndata: []\n\n"
            yield f"event: token\ndata: {json.dumps({'text': NOT_FOUND_MSG}, ensure_ascii=False)}\n\n"
            yield f"event: done\ndata: {json.dumps({'cached': False})}\n\n"
        return StreamingResponse(not_found_stream(), media_type="text/event-stream")

    return StreamingResponse(
        stream_answer(query, chunks, cache_key=cache_key),
        media_type="text/event-stream",
    )
