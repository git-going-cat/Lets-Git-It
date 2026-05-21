"""Git 공식 docs를 LLM으로 한국어 번역.

실행 (AI/ 디렉토리에서):
    python scripts/translate_git_docs.py            # 전체 번역
    python scripts/translate_git_docs.py --limit 5  # 처음 5개만 (테스트)
"""

import argparse
import asyncio
import os
import re
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

GIT_REPO_URL = "https://github.com/git/git.git"
GIT_REPO_DIR = Path("git-source")
SRC_DIR = GIT_REPO_DIR / "Documentation"
DST_DIR = Path("data/git-docs-ko")

TRANSLATE_PROMPT = """너는 기술 문서 전문 번역가다. 아래 AsciiDoc으로 작성된 Git 공식 매뉴얼을 한국어로 번역해라.

엄격한 규칙:
1. AsciiDoc 구조 그대로 유지 — 헤더 underline(====, ----), 코드블록(---- 로 감싼 구역), 옵션 리스트(::) 모두 보존
2. 아래 항목은 절대 번역하지 마라 (영문 그대로):
   - 명령어 플래그: --staged, --soft, --force, --hard, --all, --no-ff, -p, -i, -u, -b, -m, -n, -v 등 -- 또는 - 로 시작하는 옵션
   - 서브커맨드 이름: restore, reset, rebase, stash, cherry-pick, switch, checkout, commit, push, pull, fetch, merge, add, diff, log, status, branch, tag 등
   - 코드블록(---- 로 감싼 구역) 전체 내용
   - 백틱으로 감싼 텍스트: `--staged`, `git restore` 등
   - linkgit:git-xxx[1] 형태의 매크로
   - include:: 디렉티브
   - SHA, 해시값, 식별자
   - 파일 경로, 변수명, 환경변수명
3. 번역할 항목:
   - 일반 영어 설명문과 헤더 텍스트 (NAME, SYNOPSIS, DESCRIPTION, OPTIONS, EXAMPLES 등)
   - 옵션 설명 텍스트 (플래그 이름 자체는 유지, 그 설명만 번역)
   - 기술 용어: working tree → 워킹 트리, staging area → 스테이징 영역, branch → 브랜치, commit → 커밋, merge → 머지, rebase → 리베이스, stash → 스태시, repository → 저장소, index → 인덱스
4. 번역 결과만 출력. 추가 설명, 인사말, 마크다운 코드 펜스 없이 원문과 같은 AsciiDoc 형식으로만 출력.

---
원문:
{content}"""

MAX_INPUT_CHARS = 24000  # 약 6000 토큰 — Gemini flash lite 출력 한도 대비 안전 마진


def _clone_repo() -> None:
    if SRC_DIR.exists() and list(SRC_DIR.glob("git-*.adoc")):
        print(f"[SKIP] {SRC_DIR} already has git-*.adoc files")
        return

    if not GIT_REPO_DIR.exists():
        print(f"Cloning {GIT_REPO_URL} (sparse, depth=1) ...")
        subprocess.run(
            [
                "git", "clone", "--depth=1", "--filter=blob:none",
                "--sparse", GIT_REPO_URL, str(GIT_REPO_DIR),
            ],
            check=True,
        )

    print("Setting sparse-checkout to Documentation/ ...")
    subprocess.run(
        ["git", "-C", str(GIT_REPO_DIR), "sparse-checkout", "set", "Documentation"],
        check=True,
    )
    print("[OK] Clone complete")


def _validate_translation(original: str, translated: str, filename: str) -> None:
    orig_flags = len(re.findall(r"--[a-z]", original))
    trans_flags = len(re.findall(r"--[a-z]", translated))
    if orig_flags > 0 and trans_flags == 0:
        print(f"  [WARN] {filename}: --flags 패턴이 번역본에서 사라짐 ({orig_flags} → 0)")
    elif orig_flags > 0 and trans_flags < orig_flags * 0.5:
        print(f"  [WARN] {filename}: --flags 비율 이상 ({orig_flags} → {trans_flags})")


async def translate_file(client: AsyncOpenAI, src: Path, dst: Path) -> str:
    """단일 파일 번역. 이미 존재하면 skip. 반환: 'translated' | 'skipped' | 'error'"""
    if dst.exists() and dst.stat().st_size > 100:
        return "skipped"

    content = src.read_text(encoding="utf-8")
    if len(content) > MAX_INPUT_CHARS:
        print(f"  [TRUNC] {src.name}: {len(content)}자 → {MAX_INPUT_CHARS}자로 잘림")
        content = content[:MAX_INPUT_CHARS]

    try:
        response = await client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            messages=[{"role": "user", "content": TRANSLATE_PROMPT.format(content=content)}],
            max_tokens=8192,
            extra_body={
                "models": [
                    "google/gemini-2.5-flash-lite",
                    "google/gemini-2.0-flash-001",
                    "openai/gpt-4o-mini",
                ]
            },
        )
        translated = response.choices[0].message.content or ""
        if not translated.strip():
            print(f"  [WARN] {src.name}: 번역 결과 비어있음")
            return "error"

        _validate_translation(content, translated, src.name)
        dst.write_text(translated, encoding="utf-8")
        return "translated"
    except Exception as e:
        print(f"  [ERROR] {src.name}: {e}")
        return "error"


async def main(limit: int | None = None) -> None:
    load_dotenv()
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("[ERROR] OPENROUTER_API_KEY not set in environment or .env")
        sys.exit(1)

    _clone_repo()

    DST_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC_DIR.glob("git-*.adoc"))
    if limit:
        files = files[:limit]

    print(f"\nTranslating {len(files)} files → {DST_DIR}")

    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )

    sem = asyncio.Semaphore(5)
    results: dict[str, int] = {"translated": 0, "skipped": 0, "error": 0}

    async def bounded(f: Path) -> None:
        async with sem:
            status = await translate_file(client, f, DST_DIR / f.name)
            results[status] += 1
            if status == "translated":
                print(f"  ✓ {f.name}")
            elif status == "error":
                print(f"  ✗ {f.name}")

    await asyncio.gather(*[bounded(f) for f in files])

    print(
        f"\n[DONE] translated={results['translated']}, "
        f"skipped={results['skipped']}, error={results['error']}"
    )
    if results["error"] > 0:
        print("  → 실패 파일 재실행: python scripts/translate_git_docs.py")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Git 공식 docs 한국어 번역")
    parser.add_argument("--limit", type=int, help="처음 N개 파일만 번역 (테스트용)")
    args = parser.parse_args()
    asyncio.run(main(limit=args.limit))
