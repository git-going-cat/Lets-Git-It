import json
from pathlib import Path
from typing import Any

import numpy as np

_chunks: list[dict[str, Any]] = []
_embeddings: np.ndarray | None = None  # shape (N, 1536), L2-normalized float32

_DATA_DIR = Path(__file__).parent.parent.parent / "data"


def load_index() -> None:
    global _chunks, _embeddings
    chunks_path = _DATA_DIR / "chunks.json"
    embeddings_path = _DATA_DIR / "embeddings.npy"

    if not embeddings_path.exists():
        raise RuntimeError(
            f"embeddings.npy not found: {embeddings_path}\n"
            "Run: python scripts/ingest.py --index"
        )
    if not chunks_path.exists():
        raise RuntimeError(
            f"chunks.json not found: {chunks_path}\n"
            "Run: python scripts/ingest.py --chunk"
        )

    _chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
    _embeddings = np.load(str(embeddings_path))


def cosine_search(query_vec: list[float], top_k: int = 5) -> list[dict[str, Any]]:
    if _embeddings is None:
        raise RuntimeError("Vector store not loaded. Call load_index() first.")

    q = np.array(query_vec, dtype=np.float32)
    norm = np.linalg.norm(q)
    if norm > 0:
        q = q / norm

    scores = _embeddings @ q
    top_indices = np.argsort(scores)[::-1][:top_k]

    return [
        {
            "chapter": _chunks[i]["metadata"]["chapter"],
            "section": _chunks[i]["metadata"]["section"],
            "text": _chunks[i]["text"],
            "source": _chunks[i]["metadata"]["source"],
            "source_type": _chunks[i]["metadata"].get("source_type", ""),
            "score": float(scores[i]),
        }
        for i in top_indices
    ]
