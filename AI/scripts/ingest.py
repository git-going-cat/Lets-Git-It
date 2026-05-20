"""Phase 2~3: progit2-ko 데이터 수집 + 청킹 + Pinecone 인덱싱.

실행:
    python scripts/ingest.py --clone     # progit2-ko clone (gitignore됨)
    python scripts/ingest.py --chunk     # AsciiDoc 파싱 + 청킹 → data/chunks.json
    python scripts/ingest.py --index     # Pinecone 인덱싱 (Phase 3)
    python scripts/ingest.py --all       # 전체 실행
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import tiktoken
from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone
from tenacity import retry, stop_after_attempt, wait_exponential

REPO_URL = "https://github.com/progit/progit2-ko.git"
REPO_DIR = Path("progit2-ko")
DATA_DIR = Path("data")
CHUNKS_FILE = DATA_DIR / "chunks.json"

CHUNK_TARGET = 650  # 목표 토큰 수
CHUNK_MAX = 800     # 청크 최대 토큰 수
OVERLAP = 80        # 청크 간 오버랩 토큰 수

EMBED_BATCH = 100   # OpenRouter 임베딩 배치 크기
UPSERT_BATCH = 100  # Pinecone upsert 배치 크기


# ---------------------------------------------------------------------------
# Phase 2-1: Clone
# ---------------------------------------------------------------------------

def clone_repo() -> None:
    if REPO_DIR.exists():
        print(f"[SKIP] {REPO_DIR} already exists")
        return
    print(f"Cloning {REPO_URL} ...")
    subprocess.run(["git", "clone", "--depth=1", REPO_URL, str(REPO_DIR)], check=True)
    print("[OK] Clone complete")


# ---------------------------------------------------------------------------
# Phase 2-2: AsciiDoc 파서
# ---------------------------------------------------------------------------

MIN_CHUNK_TOKENS = 50  # 이 미만은 청크에서 제외


def _strip_markup(text: str) -> str:
    """인라인 AsciiDoc 마크업 제거, 가독성 있는 텍스트 유지."""
    # bold/italic/mono 제거: *text*, _text_, `text`
    text = re.sub(r"[*_`]", "", text)
    # 상호참조: <<anchor,label>> → label, <<anchor>> 삭제
    text = re.sub(r"<<[^,>]+,([^>]+)>>", r"\1", text)
    text = re.sub(r"<<[^>]+>>", "", text)
    # URL with label: https://...[label] → label
    text = re.sub(r"https?://\S+\[([^\]]+)\]", r"\1", text)
    # 나머지 URL 삭제
    text = re.sub(r"https?://\S+", "", text)
    # 이미지 매크로 삭제
    text = re.sub(r"image::[^\[]+\[[^\]]*\]", "", text)
    return text


def _parse_file(
    path: Path,
    repo_root: Path,
    visited: set | None = None,
) -> list[dict]:
    """단일 .asc 파일 파싱, include:: 디렉티브를 재귀적으로 처리.

    반환: [{title, level, body, source}, ...]
    """
    if visited is None:
        visited = set()

    abs_str = str(path.resolve())
    if abs_str in visited:
        return []
    visited.add(abs_str)

    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return []

    sections: list[dict] = []
    current_title = ""
    current_level = 0
    current_lines: list[str] = []
    in_code_block = False
    in_comment_block = False  # //////////...////////// 블록 (영어 원문)

    def _flush() -> None:
        body = "\n".join(current_lines).strip()
        if body or current_title:
            sections.append(
                {
                    "title": current_title,
                    "level": current_level,
                    "body": body,
                    "source": str(path.relative_to(repo_root)),
                }
            )

    for line in raw.splitlines():
        # 슬래시만으로 이루어진 줄: 주석 블록 토글 (////, //////////  등)
        if re.match(r"^/{4,}\s*$", line):
            in_comment_block = not in_comment_block
            continue

        # 주석 블록 내부 → 전부 건너뜀 (영어 원문)
        if in_comment_block:
            continue

        # 코드 블록 토글
        if line.strip() == "----":
            in_code_block = not in_code_block
            current_lines.append(line)
            continue

        if in_code_block:
            current_lines.append(line)
            continue

        # include:: 디렉티브
        m = re.match(r"^include::([^\[]+)\[\]", line)
        if m:
            _flush()
            current_title = ""
            current_level = 0
            current_lines = []
            include_path = path.parent / m.group(1)
            sections.extend(_parse_file(include_path, repo_root, visited))
            continue

        # 헤더: = 제목, == 제목, === 제목 ...
        m = re.match(r"^(={1,6})\s+(.+)", line)
        if m:
            _flush()
            current_level = len(m.group(1))
            current_title = _strip_markup(m.group(2).strip())
            current_lines = []
            continue

        # AsciiDoc 속성 라인 건너뜀 (:attr: value)
        if re.match(r"^:[a-zA-Z]", line):
            continue

        # 인라인 주석 건너뜀 (// comment)
        if re.match(r"^//", line):
            continue

        # 역할/마커 블록 건너뜀: [preface], [dedication] 등 메타 마커
        if re.match(r"^\[(preface|dedication|colophon|appendix|abstract|partintro)\]", line):
            continue

        # NOTE/TIP/WARNING 등 사이드바 → 본문 포함
        m = re.match(r"^(NOTE|TIP|WARNING|IMPORTANT|CAUTION):\s*(.*)", line)
        if m:
            current_lines.append(f"[{m.group(1)}] {m.group(2)}")
            continue

        # [source,...] / [listing] 블록 헤더 — 줄 자체는 건너뜀
        if re.match(r"^\[(?:source|listing)", line):
            continue

        current_lines.append(_strip_markup(line))

    _flush()
    return sections


def parse_progit(repo_root: Path) -> list[dict]:
    """progit.asc 엔트리포인트를 기준으로 전체 챕터 파싱."""
    entry = repo_root / "progit.asc"
    if entry.exists():
        return _parse_file(entry, repo_root)

    # 폴백: book/ 하위 .asc 파일 전체
    asc_files = sorted(repo_root.glob("book/**/*.asc"))
    sections: list[dict] = []
    for f in asc_files:
        sections.extend(_parse_file(f, repo_root))
    return sections


# ---------------------------------------------------------------------------
# Phase 2-3: 청킹
# ---------------------------------------------------------------------------

def _make_chunks(sections: list[dict], enc: tiktoken.Encoding) -> list[dict]:
    """섹션 목록을 토큰 한도 내 청크로 분할.

    전략:
    - 작은 섹션들은 CHUNK_MAX에 도달할 때까지 누적 → 챕터 경계에서 강제 flush
    - CHUNK_MAX를 초과하는 단일 섹션은 오버랩 슬라이딩 윈도우로 분할
    """
    chunks: list[dict] = []
    chunk_id = 0
    chapter_title = ""

    # 누적 버퍼
    buf_texts: list[str] = []
    buf_tokens: int = 0
    buf_chapter: str = ""
    buf_section: str = ""
    buf_source: str = ""

    def emit_buffer() -> None:
        nonlocal chunk_id, buf_texts, buf_tokens
        if not buf_texts:
            return
        text = "\n\n".join(buf_texts).strip()
        tok_count = len(enc.encode(text))
        if tok_count >= MIN_CHUNK_TOKENS:
            chunks.append(
                {
                    "id": f"chunk_{chunk_id:04d}",
                    "text": text,
                    "metadata": {
                        "chapter": buf_chapter,
                        "section": buf_section,
                        "source": buf_source,
                        "token_count": tok_count,
                    },
                }
            )
            chunk_id += 1
        buf_texts.clear()
        buf_tokens = 0

    for sec in sections:
        is_chapter = sec["level"] <= 2 and sec["title"]
        if is_chapter:
            emit_buffer()  # 챕터 경계에서 항상 flush
            chapter_title = sec["title"]

        header_text = (
            f"{'#' * sec['level']} {sec['title']}\n\n" if sec["title"] else ""
        )
        full_text = (header_text + sec["body"]).strip()

        if not full_text:
            continue

        sec_tokens = len(enc.encode(full_text))

        if sec_tokens > CHUNK_MAX:
            # 큰 섹션: 먼저 버퍼 flush 후 슬라이딩 윈도우 분할
            emit_buffer()
            tokens = enc.encode(full_text)
            start = 0
            while start < len(tokens):
                end = min(start + CHUNK_TARGET, len(tokens))
                chunk_tok = tokens[start:end]
                chunk_text = enc.decode(chunk_tok).strip()
                if chunk_text and len(chunk_tok) >= MIN_CHUNK_TOKENS:
                    chunks.append(
                        {
                            "id": f"chunk_{chunk_id:04d}",
                            "text": chunk_text,
                            "metadata": {
                                "chapter": chapter_title,
                                "section": sec["title"],
                                "source": sec["source"],
                                "token_count": len(chunk_tok),
                            },
                        }
                    )
                    chunk_id += 1
                if end == len(tokens):
                    break
                start = end - OVERLAP
        else:
            # 작은 섹션: 버퍼에 누적, CHUNK_MAX 초과 시 먼저 flush
            if buf_tokens + sec_tokens > CHUNK_MAX and buf_texts:
                emit_buffer()

            if not buf_texts:
                buf_chapter = chapter_title
                buf_section = sec["title"]
                buf_source = sec["source"]

            buf_texts.append(full_text)
            buf_tokens += sec_tokens

    emit_buffer()
    return chunks


def build_chunks() -> None:
    if not REPO_DIR.exists():
        print("[ERROR] progit2-ko not found. Run --clone first.")
        sys.exit(1)

    DATA_DIR.mkdir(exist_ok=True)
    enc = tiktoken.get_encoding("cl100k_base")

    print("Parsing AsciiDoc ...")
    sections = parse_progit(REPO_DIR)
    print(f"  → {len(sections)} sections parsed")

    print("Chunking ...")
    chunks = _make_chunks(sections, enc)

    if not chunks:
        print("[ERROR] No chunks generated. Check parser output.")
        sys.exit(1)

    token_counts = [c["metadata"]["token_count"] for c in chunks]
    avg = sum(token_counts) / len(token_counts)
    print(
        f"  → {len(chunks)} chunks | avg {avg:.0f} tok | "
        f"min {min(token_counts)} | max {max(token_counts)}"
    )

    CHUNKS_FILE.write_text(
        json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[OK] Saved → {CHUNKS_FILE}")


# ---------------------------------------------------------------------------
# Phase 3: Pinecone 인덱싱
# ---------------------------------------------------------------------------

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=15))
def _embed_batch(client: OpenAI, texts: list[str]) -> list[list[float]]:
    response = client.embeddings.create(
        model="openai/text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]


def index_pinecone() -> None:
    if not CHUNKS_FILE.exists():
        print("[ERROR] chunks.json not found. Run --chunk first.")
        sys.exit(1)

    load_dotenv()

    chunks = json.loads(CHUNKS_FILE.read_text(encoding="utf-8"))
    print(f"Loaded {len(chunks)} chunks from {CHUNKS_FILE}")

    embed_client = OpenAI(
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
    )
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    index = pc.Index(
        name=os.environ["PINECONE_INDEX_NAME"],
        host=os.environ["PINECONE_HOST"],
    )

    stats = index.describe_index_stats()
    if stats.total_vector_count >= len(chunks):
        print(f"[SKIP] Already indexed: {stats.total_vector_count} vectors")
        return

    print("Embedding + upserting to Pinecone ...")
    total = len(chunks)
    for i in range(0, total, EMBED_BATCH):
        batch = chunks[i : i + EMBED_BATCH]
        texts = [c["text"] for c in batch]

        embeddings = _embed_batch(embed_client, texts)

        vectors = [
            {
                "id": c["id"],
                "values": emb,
                "metadata": {**c["metadata"], "text": c["text"]},
            }
            for c, emb in zip(batch, embeddings)
        ]
        for j in range(0, len(vectors), UPSERT_BATCH):
            index.upsert(vectors=vectors[j : j + UPSERT_BATCH])

        done = min(i + EMBED_BATCH, total)
        print(f"  → {done}/{total} chunks indexed")

    stats = index.describe_index_stats()
    print(f"[OK] Pinecone: {stats.total_vector_count} vectors indexed")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Pro Git RAG ingest pipeline")
    parser.add_argument("--clone", action="store_true", help="Clone progit2-ko")
    parser.add_argument("--chunk", action="store_true", help="Parse + chunk → data/chunks.json")
    parser.add_argument("--index", action="store_true", help="Embed + upsert to Pinecone")
    parser.add_argument("--all", action="store_true", help="Run all steps")
    args = parser.parse_args()

    if args.all or args.clone:
        clone_repo()
    if args.all or args.chunk:
        build_chunks()
    if args.all or args.index:
        index_pinecone()

    if not any([args.clone, args.chunk, args.index, args.all]):
        parser.print_help()


if __name__ == "__main__":
    main()
