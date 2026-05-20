"""RAG 컨텍스트 포매터 — answer.py, coaching.py 공용."""
from typing import Any


def build_context(chunks: list[dict[str, Any]]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(f"[{i}] {c['chapter']} > {c['section']}\n{c['text']}")
    return "\n\n---\n\n".join(parts)
