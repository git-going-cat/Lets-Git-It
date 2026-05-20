from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator

from app.middleware.auth import verify_api_key
from app.middleware.rate_limit import check_rate_limit
from app.rag.coaching import generate_coaching

router = APIRouter()


class CoachingRequest(BaseModel):
    userInput: str = Field(..., min_length=1, max_length=200)
    correctCommand: str = Field(..., min_length=1, max_length=200)
    cardId: str = Field(..., min_length=1, max_length=100)
    score: int = Field(..., ge=0, le=100)
    base: int = Field(..., ge=0, le=100)
    must: int = Field(..., ge=0, le=100)
    bonus: int = Field(..., ge=0, le=100)
    explanation: str | None = Field(default=None, max_length=2000)

    @field_validator("userInput", "correctCommand", "cardId")
    @classmethod
    def strip_and_check(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("빈 값은 허용되지 않습니다")
        return v


@router.post("/coaching", dependencies=[Depends(verify_api_key)])
async def coaching(body: CoachingRequest, request: Request):
    await check_rate_limit(request)
    return await generate_coaching(
        user_input=body.userInput,
        correct_command=body.correctCommand,
        card_id=body.cardId,
        score=body.score,
        base=body.base,
        must=body.must,
        bonus=body.bonus,
        explanation=body.explanation,
    )
