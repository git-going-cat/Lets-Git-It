# IMPLEMENTATION_CONTRIBUTION_RANKING_HISTORY

## Background / Context

기여도 뺏기 게임의 과거 주 랭킹 조회 기능이다. 이번 주 실시간 랭킹과 달리 과거 주 랭킹은 정산된 RDB 데이터를 직접 조회한다.

`competitive_ranking` 테이블은 기여도 뺏기(CONTRIBUTION)와 타임어택(TIME_ATTACK) 두 모드를 함께 관리하며, `mode` 컬럼으로 구분한다. 과거 주 조회는 싱글 랭킹 히스토리 구조와 동일한 패턴(top3 + myRank + around ±2, 양방향 스크롤)을 따른다.

---

## Decision

### competitive_ranking 테이블 저장 항목

| 컬럼 | 값 | 비고 |
|------|-----|------|
| `member_id` | 플레이한 사용자 UUID | myRank 조회·닉네임 동적 조회용 |
| `mode` | `CONTRIBUTION` / `TIME_ATTACK` | 모드 구분 enum |
| `score` | 기여도 점수 | 응답 필드명은 `contribution` |
| `play_count` | 해당 주 플레이 횟수 | |
| `rank` | 해당 주·모드 기준 순위 (1-indexed) | 1등 = rank 1 |
| `week` | `YYYY-MM-W` 형식 | 예: `2025-04-3` (월 2자리 zero-pad) |

### 닉네임 동적 조회 방식

닉네임은 `competitive_ranking` 테이블에 저장하지 않는다. 조회 시점에 `member_id` 목록으로 `MemberService.getNicknamesByIds()`를 호출해 현재 닉네임을 동적으로 채운다.

- 닉네임이 변경되면 과거 랭킹에서도 바뀐 닉네임으로 표시된다 (의도된 동작)
- `@SQLRestriction("deleted_at IS NULL")`로 탈퇴 회원은 자동 제외 → `getOrDefault(id, "[Unknown]")`으로 fallback

### myRank DTO 설계

`myRank`는 자기 자신의 기록이므로 `playerId`/`nickname`을 포함하지 않는다. `ContributionMyRankEntry(rank, contribution, playCount)`를 별도 DTO로 분리해 around 항목(`ContributionRankingEntry`)과 타입을 구분한다.

### 과거 주 조회 API

```
GET /api/v1/rankings/contribution/history
  ?year={year}&month={month}&week={week}
  &afterRank={afterRank}&beforeRank={beforeRank}&size={size}
```

- `afterRank` / `beforeRank` 모두 없음: 초기 응답 (top3 + myRank + around ±2)
- `afterRank` 있음: afterRank 이후 size개 반환 (아래 방향)
- `beforeRank` 있음: beforeRank 이전 size개 반환 (위 방향, DESC 조회 후 역순 정렬)
- week 키 변환: `WeekUtil.getWeek(year, month, week)` → 예: `"2025-04-3"`

### `afterRank` / `beforeRank` 기반 페이지네이션

**아래 방향 (`afterRank`)**
- 쿼리: `WHERE mode=CONTRIBUTION AND week=? AND rank > afterRank ORDER BY rank ASC LIMIT size+1`
- hasNext: `raw.size() > size` (size+1 trick)
- nextCursor: 반환된 마지막 항목의 rank
- prevCursor: 반환된 첫 번째 항목의 rank

**위 방향 (`beforeRank`)**
- 쿼리: `WHERE mode=CONTRIBUTION AND week=? AND rank < beforeRank ORDER BY rank DESC LIMIT size+1`
- hasPrev: `raw.size() > size` (size+1 trick)
- Service에서 `Collections.reverse()` 후 ASC 순서로 응답
- prevCursor: 역순 정렬 후 첫 번째 항목의 rank (null이면 위쪽 끝)
- nextCursor: 역순 정렬 후 마지막 항목의 rank
- hasNext: `nextCursor < total` (total은 `countByModeAndWeek`로 조회)

### N+1 방지

초기 응답에서 top3 memberId와 around memberId를 합산한 뒤 `getNicknamesByIds()` 1회 호출로 닉네임을 배치 조회한다. 스크롤 응답에서는 페이지 memberId만 모아 1회 조회한다.

### 파일 구성

| 파일 | 역할 |
|------|------|
| `CompetitiveRankingJpaRepository` | Spring Data JPA 쿼리 메서드 (top3, myRank, around, count) |
| `CompetitiveRankingDslRepository` | QueryDSL 양방향 스크롤 쿼리 (afterRank / beforeRank) |
| `CompetitiveRankingRepository` | Service가 의존하는 인터페이스 |
| `CompetitiveRankingRepositoryImpl` | JPA·DSL 위임 구현체 |
| `ContributionRankingService` | 히스토리 조회 메서드 인터페이스 |
| `ContributionRankingServiceImpl` | 히스토리 조회 로직 구현 |
| `ContributionRankingEntry` | 랭킹 항목 DTO (rank, playerId, nickname, contribution, playCount) |
| `ContributionMyRankEntry` | 내 순위 전용 DTO (rank, contribution, playCount) |
| `ContributionRankingInitialResponse` | 초기 응답 DTO |
| `ContributionRankingScrollResponse` | 스크롤 응답 DTO |
| `RankingController` | `/contribution/history` 엔드포인트 연동 |

---

## Why

### competitive_ranking 테이블을 기여도·타임어택이 공유하는 이유

두 모드 모두 개인 기준 순위 구조(memberId, score, rank, week)가 동일하다. 테이블을 분리하면 스키마 중복이 발생하고, 공통 Repository 메서드(scroll, count 등)를 이중으로 관리해야 한다. `mode` 컬럼 하나로 구분하면 인덱스(`idx_competitive_ranking_mode_week_rank`)도 공유할 수 있다.

### myRank에 playerId/nickname을 포함하지 않는 이유

myRank는 "나 자신"의 기록이다. 클라이언트는 이미 로그인한 사용자의 정보를 보유하고 있으므로, 서버에서 중복으로 내려줄 필요가 없다. 별도 DTO(`ContributionMyRankEntry`)로 타입을 분리해 around 항목과 구조를 명확히 구분한다.

### score → contribution 필드명 변환

DB 컬럼명은 `score`(CONTRIBUTION/TIME_ATTACK 공용)이지만, 기여도 뺏기 맥락에서는 `contribution`이 의미 전달에 적합하다. 엔티티에서 `getScore()`로 읽어 DTO에서 `contribution`으로 매핑한다. DB 스키마를 변경하지 않고 의미 있는 필드명을 제공할 수 있다.

---

## Caution

- `WeekUtil.getWeek()`는 `String.format("%02d", month)`로 월을 zero-pad한다. DB에 `'2025-4-3'`으로 저장하면 `'2025-04-3'`으로 조회해도 결과가 없다.
- `beforeRank` 스크롤에서 `hasNext` 판단은 `countByModeAndWeek`를 별도로 조회한다. `afterRank` 스크롤과 달리 size+1 trick만으로는 아래 방향 존재 여부를 알 수 없기 때문이다.
- `myRankEntity == null` 분기에서 `total > 3`이면 `nextCursor=3`을 반환한다. 이는 클라이언트가 4위부터 아래 방향 스크롤을 시작할 수 있도록 한다.
- `competitive_ranking` 테이블에 `(member_id, mode, week)` unique 제약이 있다. 한 주차에 동일 모드로 재정산하면 unique 충돌이 발생하므로 정산 스케줄러에서 guard 조건이 필요하다.
- 탈퇴 회원(`deleted_at IS NOT NULL`)은 `getNicknamesByIds` 결과에서 자동 제외된다. `getOrDefault(id, "[Unknown]")`으로 처리되므로 별도 예외 처리가 불필요하다.

---

## Test Plan

- `GET /api/v1/rankings/contribution/history?year=2026&month=5&week=1` 호출하여 top3 / myRank / around / prevCursor / nextCursor 응답 확인
- `afterRank` 포함 요청으로 아래 방향 무한 스크롤 동작 확인
- `beforeRank` 포함 요청으로 위 방향 무한 스크롤 동작 확인 (역순 정렬 확인)
- `hasPrev = false`일 때 `prevCursor: null` 반환 확인
- `hasNext = false`일 때 `nextCursor: null` 반환 확인
- 해당 주 기록이 없는 유저의 경우 `myRank: null`, `around: []`, `hasPrev: false` 반환 확인
- `total > 3`이고 내 기록 없는 경우 `nextCursor: 3`, `hasNext: true` 반환 확인
- 탈퇴한 유저가 포함된 랭킹에서 해당 유저 닉네임이 `[Unknown]`으로 표시되는지 확인
- 닉네임 변경 후 과거 랭킹 조회 시 변경된 닉네임이 표시되는지 확인
- `week` 포맷이 `'YYYY-MM-W'`(월 2자리)로 저장된 데이터를 정확히 조회하는지 확인