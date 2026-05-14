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

/** `git add <path>` 형태에서 path를 추출합니다. 매칭 실패 시 null. */
export function parseAddTarget(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.trim().match(/^git\s+add\s+(\S+)$/);
  return match ? match[1] : null;
}
