/** 커맨드 텍스트의 마지막 토큰(브랜치명)을 반환합니다. */
export function parseSwitchTarget(text: string): string | null {
  return text.trim().split(/\s+/).at(-1) ?? null;
}

/** `git switch <branch>` 형태(브랜치 변경)인지 확인합니다. `-c` 플래그(브랜치 생성)는 제외됩니다. */
export function isSwitchCommand(text: string): boolean {
  return /^git\s+switch\s+(?!-)\S+$/.test(text.trim());
}

/** `git switch -c <branch>` 형태(브랜치 생성)인지 확인합니다. */
export function isCreateCommand(text: string): boolean {
  return /^git\s+switch\s+-c\s+\S+$/.test(text.trim());
}

/**
 * `git add <path>` 형태에서 path를 추출합니다. 매칭 실패 시 null.
 *
 * 제약: path는 공백 없는 단일 토큰만 인식합니다.
 * - 지원: `git add src/index.js`
 * - 미지원(모두 null 반환 → 호출자 fallback): quoted path(`git add "a b.js"`),
 *   `--` 구분자(`git add -- file`), 플래그(`git add -A`), 여러 파일 인자
 *
 * 현재 BE가 CONFLICT 다음 명령어로 단순 형태만 보내준다는 계약에 의존합니다.
 * BE 형식이 확장되면 이 함수도 같이 확장해야 합니다.
 */
export function parseAddTarget(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.trim().match(/^git\s+add\s+(\S+)$/);
  return match ? match[1] : null;
}
