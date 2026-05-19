/** V4: scores 배열에서 고양이(아무도 못 친 명령어 누적) 엔트리는 playerId === null로 식별. */
export const MISS_SENTINEL_NICKNAME = '[CAT]';

/** playerId가 null이면 고양이 엔트리. */
export const isCatEntry = (playerId: string | null): boolean => playerId === null;
