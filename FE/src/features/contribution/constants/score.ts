/**
 * scores 배열에서 miss(아무도 못 친 명령어) 누적분을 표시하기 위한 sentinel playerId.
 * BE가 SCORE_UPDATE / COMMAND_EXPIRED / CONTRIBUTION_GAME_END의 scores/rankings에
 * 이 ID로 entry를 추가해서 보내준다. FE는 이 ID를 보면 고양이 아이콘으로 렌더한다.
 *
 * Note: Zod의 z.string().uuid()는 v1-5 버전 비트(`[1-5]`)와 variant 비트(`[89abAB]`)를
 * 강제하므로 단순 all-zeros UUID는 거부된다. v4 형식("4xxx", "8xxx")으로 sentinel을 구성.
 */
export const MISS_SENTINEL_ID = '00000000-0000-4000-8000-000000000000';
export const MISS_SENTINEL_NICKNAME = '고양이';
