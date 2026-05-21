# IMPLEMENTATION_COOP_RANKING_HISTORY

## Background / Context

협력 게임의 과거 주 랭킹 조회 기능이다. 싱글·기여도 뺏기와 달리 협력 랭킹은 개인이 아닌 팀 단위로 기록된다. 한 팀의 결과가 `coop_result`에 저장되고, 팀원 각각이 `coop_result_member`에 저장된다. 랭킹 정산 시 `coop_ranking` 테이블에 팀 단위 순위가 기록된다.

myRank 조회는 "로그인 사용자가 참여한 팀 중 해당 주차 최고 순위 팀"을 반환한다. 이를 위해 `coop_ranking`과 `coop_result_member`를 QueryDSL로 조인해야 한다.

---

## Decision

### 테이블 구조 및 관계

```
coop_ranking (팀 순위 기록)
  └─ coop_result_id ──→ coop_result (게임 결과)
                              └─ coop_result_id ──→ coop_result_member (팀원 목록)
                                                          └─ member_id ──→ member (닉네임)
```

### coop_ranking 테이블 저장 항목

| 컬럼 | 값 | 비고 |
|------|-----|------|
| `coop_result_id` | 게임 결과 UUID | coop_result_member 조인 키 |
| `map_name` | 맵 이름 스냅샷 | 게임 시점 기록 (FK 없음) |
| `difficulty` | 난이도 (int) | 게임 시점 기록 |
| `team_name` | 팀 이름 스냅샷 | 게임 시점 기록 |
| `rank` | 해당 주 순위 (1-indexed) | 1등 = rank 1 |
| `elapsed_time` | 클리어 소요 시간 (ms) | |
| `total_wrong_type_count` | 팀 전체 오타 수 | |
| `total_wrong_order_count` | 팀 전체 순서 오류 수 | |
| `week` | `YYYY-MM-W` 형식 | 예: `2026-05-1` (월 2자리 zero-pad) |

### myRank 조회 — QueryDSL 크로스 테이블 조인

개인 기반 랭킹과 달리 `coop_ranking`에는 `member_id`가 없다. 로그인 사용자의 팀 순위를 찾으려면 `coop_result_member`를 경유해야 한다.

```sql
SELECT cr.*
FROM coop_ranking cr
JOIN coop_result_member crm ON crm.coop_result_id = cr.coop_result_id
WHERE cr.week = ?
  AND crm.member_id = ?
ORDER BY cr.rank ASC
LIMIT 1
```

한 주에 여러 팀으로 플레이한 경우 `ORDER BY rank ASC LIMIT 1`로 최고 순위 팀 1개를 반환한다.

### 팀원 조회 N+1 방지

팀원 목록은 `coop_result_member` 테이블에서 `coop_result_id`로 조회한다. 항목마다 개별 조회하면 N+1이 발생하므로, 표시 대상 항목들의 `coop_result_id`를 모아 `findAllByCoopResultIdIn()`으로 1회 배치 조회한 뒤 `coopResultId`를 키로 그룹핑한다.

```
coop_result_id 목록 수집 (top3 + around + myRank)
    ↓
findAllByCoopResultIdIn() — IN 쿼리 1회
    ↓
Collectors.groupingBy(coopResultId) — 메모리 그룹핑
    ↓
각 항목에서 memberMap.get(coopResultId)로 팀원 목록 조회
```

### 닉네임 배치 조회

팀원 `member_id` 전체를 flatten한 뒤 `MemberService.getNicknamesByIds()` 1회로 닉네임을 가져온다. 탈퇴 회원은 `[Unknown]`으로 fallback 처리된다.

### 팀원 정렬

각 팀의 멤버 목록은 닉네임 가나다순(`Comparator.comparing(CoopRankingMemberEntry::nickname)`)으로 정렬해 일관된 순서로 응답한다.

### myRank DTO

협력 랭킹의 `myRank`는 별도 DTO 없이 `CoopRankingEntry`를 그대로 사용한다. 팀 정보와 멤버 목록을 포함해야 하기 때문이다 (싱글/기여도의 myRank와 다름).

### 과거 주 조회 API

```
GET /api/v1/rankings/coop/history
  ?year={year}&month={month}&week={week}
  &afterRank={afterRank}&beforeRank={beforeRank}&size={size}
```

- `afterRank` / `beforeRank` 모두 없음: 초기 응답 (top3 + myRank + around ±2)
- `afterRank` 있음: afterRank 이후 size개 반환 (아래 방향)
- `beforeRank` 있음: beforeRank 이전 size개 반환 (위 방향, DESC 조회 후 역순 정렬)
- week 키 변환: `WeekUtil.getWeek(year, month, week)` → 예: `"2026-05-1"`

### `afterRank` / `beforeRank` 기반 페이지네이션

**아래 방향 (`afterRank`)**
- 쿼리: `WHERE week=? AND rank > afterRank ORDER BY rank ASC LIMIT size+1`
- hasNext: `raw.size() > size` (size+1 trick)
- nextCursor: 반환된 마지막 항목의 rank
- prevCursor: 반환된 첫 번째 항목의 rank

**위 방향 (`beforeRank`)**
- 쿼리: `WHERE week=? AND rank < beforeRank ORDER BY rank DESC LIMIT size+1`
- hasPrev: `raw.size() > size` (size+1 trick)
- Service에서 `Collections.reverse()` 후 ASC 순서로 응답
- prevCursor: 역순 정렬 후 첫 번째 항목의 rank (null이면 위쪽 끝)
- nextCursor: 역순 정렬 후 마지막 항목의 rank
- hasNext: `nextCursor < total` (total은 `countByWeek`로 조회)

### 파일 구성

| 파일 | 역할 |
|------|------|
| `CoopRankingJpaRepository` | Spring Data JPA 쿼리 메서드 (top3, around, count) |
| `CoopRankingDslRepository` | QueryDSL (myRank 조인 쿼리, 양방향 스크롤 쿼리) |
| `CoopRankingRepository` | Service가 의존하는 인터페이스 |
| `CoopRankingRepositoryImpl` | JPA·DSL 위임 구현체 |
| `CoopResultMemberJpaRepository` | `findAllByCoopResultIdIn` IN 쿼리 |
| `CoopResultMemberRepository` | 배치 조회 인터페이스 |
| `CoopResultMemberRepositoryImpl` | 위임 구현체 |
| `CoopRankingService` | 히스토리 조회 메서드 인터페이스 |
| `CoopRankingServiceImpl` | 히스토리 조회 로직 구현 |
| `CoopRankingEntry` | 팀 랭킹 항목 DTO (rank, teamName, mapName, difficulty, elapsedTime, wrongCounts, members) |
| `CoopRankingMemberEntry` | 팀원 DTO (playerId, nickname) |
| `CoopRankingInitialResponse` | 초기 응답 DTO |
| `CoopRankingScrollResponse` | 스크롤 응답 DTO |
| `RankingController` | `/coop/history` 엔드포인트 연동 |

---

## Why

### myRank 조회에 QueryDSL 크로스 조인이 필요한 이유

`coop_ranking` 테이블에는 `member_id` 컬럼이 없다. 멤버 정보는 `coop_result_member`에만 있다. Spring Data JPA의 메서드 이름 기반 쿼리는 단일 엔티티 범위 내에서만 동작하므로, 다른 엔티티와의 조인이 필요한 이 쿼리는 QueryDSL로 구현했다.

### myRank에 CoopRankingEntry를 그대로 사용하는 이유

팀 정보(teamName, mapName 등)와 팀원 목록을 포함해야 하기 때문이다. 싱글/기여도 뺏기의 myRank는 자기 자신을 가리키므로 최소 정보(rank만)로 충분하지만, 협력에서는 "내가 속한 팀의 전체 정보"를 함께 표시한다.

### 팀원 목록을 IN 쿼리로 일괄 조회하는 이유

각 랭킹 항목마다 팀원을 개별 조회하면 페이지 크기만큼 추가 쿼리가 발생한다(N+1). `coopResultId` 목록을 한 번에 모아 `findAllByCoopResultIdIn()`으로 1회 조회하면 쿼리 수를 1로 고정할 수 있다.

### mapName/teamName을 coop_ranking에 스냅샷으로 저장하는 이유

맵 이름이나 팀 이름은 변경될 수 있다. 랭킹 기록 시점의 정보를 보존하기 위해 `coop_result`와의 FK를 두지 않고 문자열로 직접 저장한다. 닉네임은 동적 조회하지만, 맵/팀 이름은 게임 시점 기록이므로 스냅샷이 적합하다.

---

## Caution

- `WeekUtil.getWeek()`는 `String.format("%02d", month)`로 월을 zero-pad한다. DB에 `'2026-5-1'`로 저장하면 `'2026-05-1'`로 조회해도 결과가 없다.
- `myRankEntity == null` 분기에서 `total > 3`이면 `nextCursor=3`을 반환한다. 클라이언트가 4위 팀부터 아래 방향 스크롤을 시작할 수 있도록 한다.
- myRankEntity가 around 범위 밖에 있는 경우(경계 근처)에도 팀원 조회에 포함되어야 한다. 이를 위해 `aroundRaw`에 myRankEntity의 `coopResultId`가 없으면 `allRankings`에 별도 추가한 뒤 배치 조회한다.
- `coop_ranking`에 `(coop_result_id)` unique 제약이 있다. 동일 게임 결과가 중복 정산되면 unique 충돌이 발생한다.
- `CoopRankingDslRepository.findMyCoopRankingByMemberIdAndWeek`에서 `ORDER BY rank ASC LIMIT 1`을 사용한다. 한 주에 여러 팀으로 플레이한 경우 가장 좋은 순위 팀 1개만 myRank로 반환된다.
- `beforeRank` 스크롤에서 `hasNext` 판단은 `countByWeek`를 별도로 조회한다. `afterRank` 스크롤과 달리 size+1 trick만으로는 아래 방향 존재 여부를 알 수 없기 때문이다.

---

## Test Plan

- `GET /api/v1/rankings/coop/history?year=2026&month=5&week=1` 호출하여 top3 / myRank / around / prevCursor / nextCursor 응답 확인
- top3 각 팀의 `members` 배열이 닉네임 가나다순으로 정렬되는지 확인
- 한 주에 여러 팀으로 플레이한 유저의 myRank가 최고 순위 팀으로 반환되는지 확인
- `afterRank` 포함 요청으로 아래 방향 무한 스크롤 동작 확인
- `beforeRank` 포함 요청으로 위 방향 무한 스크롤 동작 확인 (역순 정렬 확인)
- `hasPrev = false`일 때 `prevCursor: null` 반환 확인
- `hasNext = false`일 때 `nextCursor: null` 반환 확인
- 해당 주 기록이 없는 유저의 경우 `myRank: null`, `around: []` 반환 확인
- `total > 3`이고 내 기록 없는 경우 `nextCursor: 3`, `hasNext: true` 반환 확인
- 탈퇴한 팀원이 포함된 랭킹에서 해당 팀원 닉네임이 `[Unknown]`으로 표시되는지 확인
- `week` 포맷이 `'YYYY-MM-W'`(월 2자리)로 저장된 데이터를 정확히 조회하는지 확인