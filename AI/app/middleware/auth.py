import hmac
import os

from fastapi import Depends, HTTPException, Request


def verify_api_key(request: Request) -> None:
    expected = os.environ.get("AI_API_KEY", "")
    provided = request.headers.get("X-API-Key", "")
    if not expected or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid API key")
