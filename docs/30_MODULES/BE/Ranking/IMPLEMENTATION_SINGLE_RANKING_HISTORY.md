# IMPLEMENTATION_SINGLE_RANKING_HISTORY

## Background / Context

이번 주 싱글 랭킹은 Redis ZSet 기반으로 실시간 조회한다. 그러나 과거 주 랭킹은 Redis에 남겨두기 어렵다. 주간 키가 계속 누적되면 메모리를 소모하고, 실시간성이 필요 없는 과거 데이터에 Redis를 유지할 이유가 없다.

이에 따라 매주 월요일 00:00에 직전 주 랭킹을 Redis에서 읽어 RDB에 정산·저장하고, 이후 과거 주 조회 API는 RDB에서 직접 조회하는 구조를 채택했다.

---

## Decision

### 데이터 흐름

```
[이번 주 게임 중] Redis ZSet에 실시간 점수 저장
       ↓
[매주 월요일 00:00] SingleRankingScheduler 실행
       ↓
Redis ZSet → RDB single_ranking 테이블로 정산 저장
       ↓
[과거 주 조회 API] RDB에서 직접 조회
```

### 정산 스케줄러

- 실행 주기: `cron = "0 0 0 * * MON"`, `zone = "Asia/Seoul"`
- 대상: EASY / NORMAL / HARD 3개 난이도 각각 독립 처리
- 이전 주 키: `WeekUtil.getWeek(LocalDate.now().minusDays(1))` — 월요일 00:00 기준 전날(일요일)이 이전 주 마지막 날
- 정산 순서: Redis 전체 조회 → rank 부여 → RDB 저장 → Redis 키 삭제

### single_ranking 테이블 저장 항목

| 컬럼 | 값 | 비고 |
|------|-----|------|
| `member_id` | Redis ZSet member (UUID) | 내 순위 조회·닉네임 동적 조회용 |
| `difficulty` | EASY / NORMAL / HARD | |
| `score` | Redis ZSet score | 반올림 후 int 저장 |
| `rank` | ZSet 내림차순 순서 기반 1-indexed | 1등 = rank 1 |
| `week` | `YYYY-MM-W` 형식 | 예: `2025-04-3` |
| `grade` | Redis Hash(`ranking:SINGLE:{difficulty}:{week}:grade`)에서 조회한 등급 | `saveResult` 연동 전까지 null, nullable |

### 닉네임 동적 조회 방식

닉네임은 `single_ranking` 테이블에 저장하지 않는다. 과거 주 조회 API 호출 시점에 `member_id` 목록으로 `MemberService.getNicknamesByIds()`를 호출해 현재 닉네임을 동적으로 조회한다.

- 닉네임이 변경되면 과거 랭킹에서도 바뀐 닉네임으로 표시된다 (의도된 동작)
- `@SQLRestriction("deleted_at IS NULL")`로 탈퇴 회원은 `getNicknamesByIds` 결과에서 자동 제외 → `getOrDefault(id, "[Unknown]")`으로 `[Unknown]` 처리
- `myRank` 조회는 `member_id`로 검색 — 닉네임 변경과 무관하게 본인 기록 조회 가능

### 과거 주 조회 API

```
GET /api/v1/rankings/single/history
  ?difficulty={difficulty}&year={year}&month={month}&week={week}
  &cursor={cursor}&size={size}
```

- cursor 없음: 초기 응답 (top3 + myRank + around ±2)
- cursor 있음: cursor 이후 size개 반환
- week 키 복원: `year + "-" + %02d(month) + "-" + week` → 예: `"2025-04-3"`

### cursor 기반 페이지네이션 (RDB)

Redis ZSet의 0-indexed 방식과 달리 RDB의 `rank` 컬럼은 1-indexed 정수로 저장된다.

- 스크롤 쿼리: `WHERE rank > cursor ORDER BY rank ASC LIMIT size`
- nextCursor: 반환된 마지막 항목의 rank
- hasNext: `lastRank < total`

### 파일 구성

| 파일 | 역할 |
|------|------|
| `SingleRankingJpaRepository` | Spring Data JPA 쿼리 메서드 |
| `SingleRankingDslRepository` | QueryDSL cursor 기반 스크롤 쿼리 |
| `SingleRankingRepository` | Service가 의존하는 인터페이스 |
| `SingleRankingRepositoryImpl` | JPA·DSL 위임 구현체 |
| `SingleRankingScheduler` | 주간 정산 스케줄러 |
| `SingleRankingService` | 히스토리 조회 메서드 인터페이스 추가 |
| `SingleRankingServiceImpl` | 히스토리 조회 로직 구현 |
| `RankingController` | `/single/history` 엔드포인트 연동 |

---

## Why

### 과거 랭킹을 RDB에 저장하는 이유

과거 랭킹은 이미 확정된 데이터다. 실시간 갱신이 필요 없으므로 Redis를 유지할 이유가 없다. RDB는 주간 키 단위로 데이터를 영구 보존하고, 인덱스(`idx_single_ranking_difficulty_week`)로 조회 성능을 확보한다.

### 닉네임을 동적으로 조회하는 이유

닉네임이 변경되면 과거 랭킹에서도 현재 닉네임을 표시하도록 팀 합의가 이뤄졌다. 스냅샷 저장 방식은 변경 전 닉네임이 그대로 남아 이 요건을 충족하지 못한다.

동적 조회 방식의 특성:
- 닉네임 변경 시 과거 랭킹에도 즉시 반영
- 탈퇴 회원은 `Member`에 `@SQLRestriction("deleted_at IS NULL")`이 적용되어 `getNicknamesByIds` 결과에서 자동 제외 → `[Unknown]`으로 표시
- `single_ranking` 테이블에 `nickname` 컬럼이 없어 정산 시 `MemberService` 의존성 불필요

### grade를 Redis Hash에 별도 저장하는 이유

grade는 ZSet score와 별개의 정보다. ZSet은 점수 기반 정렬에 특화되어 있어 부가 데이터를 저장하기 어렵다. Hash 자료구조(`ranking:SINGLE:{difficulty}:{week}:grade`)를 별도로 두고 `memberId → grade` 매핑을 저장함으로써 ZSet과 Hash를 같은 키 네임스페이스 아래 분리 관리한다.

grade가 score와 항상 일치해야 하므로(한 게임에서 산출된 값이므로), 점수 갱신 시에만 grade도 함께 갱신한다. `saveScoreAndGrade()`가 이 원자성을 보장한다.

grade 컬럼은 현재 `nullable = true`이다. `saveResult` API가 구현되지 않은 동안에는 grade가 Redis Hash에 저장되지 않아 정산 시 null이 저장된다. `saveResult` 연동 이후에는 항상 grade가 저장되므로, 해당 시점에 `nullable = false`로 변경할 수 있다.

---

## Caution

- `WeekUtil.getWeek()`는 `String.format("%02d", month)`로 월을 zero-pad한다. 과거 주 조회 API의 `buildWeekKey()`도 동일한 포맷을 사용하므로 키가 일치한다.
- `deleteKey()`는 `TransactionSynchronizationManager.registerSynchronization()`의 `afterCommit()` 콜백 안에서 실행된다. DB 트랜잭션이 커밋된 이후에만 Redis 키가 삭제되므로, 중간에 예외가 발생해 트랜잭션이 롤백되어도 Redis 원본은 보존된다. 단, 커밋 성공 후 `afterCommit()` 내부에서 예외가 발생하면 Redis 키가 남을 수 있으나, 이 경우 다음 주 정산 시 중복 삽입이 시도된다(unique 제약 등으로 방어 필요).
- `/single/history` 엔드포인트는 Spring Security가 적용되어 있어 미인증 요청은 401로 차단된다. `myRank` null 분기는 해당 주에 플레이 기록이 없는 인증 유저에만 해당한다.
- `week` 파라미터의 최댓값을 `@Max(6)`으로 검증하나, 특정 월에 실제로 5주까지만 존재할 수 있다. 잘못된 week 값으로 조회해도 RDB에 해당 데이터가 없으면 빈 응답이 반환된다.
- `MemberService.getNicknamesByIds()`는 과거 랭킹 조회 API 호출마다 실행된다. 초기 응답은 top3 + around 목록을 합산한 ID 1회 조회, 스크롤은 페이지 단위 ID 1회 조회다. 한 페이지 참가자 수는 제한적이나, `WHERE id IN (...)` 바인딩 파라미터 수가 많아지는 경우 배치 분할 처리를 검토한다.

---

## Test Plan

- Redis에 테스트 데이터를 직접 삽입 후 스케줄러를 수동 호출하여 `single_ranking` 테이블에 데이터가 정상 저장되는지 확인
- 정산 후 Redis 키가 삭제되었는지 확인
- `GET /api/v1/rankings/single/history?difficulty=NORMAL&year=...&month=...&week=...` 호출하여 top3 / myRank / around 응답 확인
- cursor 포함 요청으로 무한 스크롤 동작 확인
- `hasNext = false`일 때 `nextCursor: null` 반환 확인
- 해당 주 기록이 없는 유저의 경우 `myRank: null`, `around: []` 반환 확인
- 존재하지 않는 difficulty / week 값 입력 시 400 또는 빈 응답 확인
- 탈퇴한 유저가 포함된 과거 랭킹에서 `[Unknown]`으로 표시되는지 확인
- 닉네임 변경 후 과거 랭킹 조회 시 변경된 닉네임이 표시되는지 확인

---

## Troubleshooting

### `@Validated` 빈 내 파라미터 제약 재정의로 인한 `ConstraintDeclarationException`

**상황**

`/api/v1/rankings/single/history` 엔드포인트를 포함한 `RankingController`의 어느 API를 호출해도 500 에러가 발생했다. 로그에는 아래 예외가 출력됐다.

```
jakarta.validation.ConstraintDeclarationException: HV000151:
A method overriding another method must not redefine the parameter constraint configuration,
but method RankingController#getSingleRankingHistory(...) redefines the configuration of
RankingControllerDocs#getSingleRankingHistory(...)
```

**원인**

`RankingController`는 `RankingControllerDocs` 인터페이스를 구현한다. `RankingControllerDocs.getSingleRankingHistory()`에는 파라미터 제약이 없는데, `RankingController.getSingleRankingHistory()`에서 `@Min(1)`, `@Max(12)` 등을 새로 추가했다.

Bean Validation 스펙은 다음 규칙을 강제한다.

> 구현체가 인터페이스(또는 부모 클래스)의 메서드를 오버라이드할 때, 파라미터 제약을 추가하거나 재정의할 수 없다.

`@Validated`가 붙은 빈은 메서드 호출 시 해당 클래스 전체의 메서드 제약 메타데이터를 한 번에 빌드한다. `getSingleRankingHistory()`에서 충돌이 발견되면 다른 메서드 호출도 포함해 빈 전체가 `ConstraintDeclarationException`을 던진다. 이 때문에 직접 관련 없는 엔드포인트 호출에서도 500이 발생했다.

**해결**

파라미터 제약 어노테이션(`@Min`, `@Max`)을 구현체(`RankingController`)에서 제거하고 인터페이스(`RankingControllerDocs`)로 이동했다.

```
RankingControllerDocs (인터페이스)
  └─ getSingleRankingHistory(@Min(1) year, @Min(1) @Max(12) month, ...)
           ↓ 상속
RankingController (구현체)
  └─ getSingleRankingHistory(year, month, ...)  ← 별도 선언 없이 인터페이스 제약 적용됨
```

구현체에 제약을 별도로 선언하지 않아도 `@Validated`는 인터페이스에 선언된 제약을 포함해 검증하므로 동작은 동일하다.

**적용 범위**

`@Validated` + 인터페이스 구현 패턴을 사용하는 모든 Controller에서 동일하게 적용된다. 파라미터 제약은 항상 인터페이스(Docs)에만 선언한다.

---

### 정산 중 Redis 키를 DB 커밋 전에 삭제하여 데이터 유실 가능

**상황**

`settleSingleRanking()`은 `@Transactional` 메서드 안에서 `saveAll()` 직후 `deleteKey()`를 호출했다. DB 트랜잭션은 메서드 종료 시 커밋되므로, EASY 난이도 Redis 키 삭제 후 NORMAL 저장 중 예외가 발생하면 DB는 전체 롤백되는데 EASY Redis 원본은 이미 삭제된 상태가 된다.

**원인**

`deleteKey()`가 트랜잭션 커밋 이전에 실행되기 때문이다. Redis 작업은 DB 트랜잭션의 롤백 대상이 아니므로 예외 발생 시 복구 수단이 없다.

**해결**

정산 대상 키를 `keysToDelete` 리스트에 모아두고, `TransactionSynchronizationManager.registerSynchronization()`의 `afterCommit()` 콜백에서 일괄 삭제하도록 변경했다.

```java
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override
    public void afterCommit() {
        keysToDelete.forEach(singleRankingRedisRepository::deleteKey);
    }
});
```

DB 트랜잭션 커밋이 성공한 이후에만 Redis 키가 삭제되므로, 중간에 예외가 발생해 롤백되어도 Redis 원본은 보존된다.

---

### 정산 스케줄러 재실행 시 unique 제약 충돌

**상황**

`single_ranking` 테이블에는 `(member_id, difficulty, week)` unique 제약이 있다. 스케줄러는 항상 insert만 수행하므로, DB 저장 성공 후 Redis 키 삭제 실패 또는 수동 재실행 등의 상황에서 같은 주차 데이터를 다시 저장하면 unique 충돌로 정산이 계속 실패한다.

**원인**

재실행 여부를 확인하는 guard 로직이 없어 idempotency가 보장되지 않았다.

**해결**

난이도별 루프에서 Redis 데이터 확인 직후, 해당 `difficulty + week` 조합이 이미 RDB에 존재하면 skip하도록 추가했다.

```java
if (singleRankingRepository.countByDifficultyAndWeek(diff, week) > 0) {
    continue;
}
```

이 guard로 재실행 시나리오에 관계없이 중복 삽입이 발생하지 않는다. EASY만 저장된 상태에서 재실행하면 EASY는 skip되고 NORMAL·HARD부터 정상 처리된다.

---

### 미랭크 유저의 과거 랭킹 초기 응답에서 hasNext 잘못 반환

**상황**

해당 주에 기록이 없는 유저(`myRankEntity == null`)의 초기 응답에서 `total`이 3보다 크더라도 `nextCursor: null`, `hasNext: false`로 고정 반환됐다. top3 이후 스크롤 진입 기준을 받을 수 없어 전체 랭킹 탐색이 불가능했다.

**원인**

`myRankEntity == null` 분기에서 `total` 값을 사용하지 않고 `hasNext`를 무조건 `false`로 하드코딩했다.

**해결**

`total > 3` 여부로 `hasNext`를 계산하고, `nextCursor`를 `3`으로 반환하도록 수정했다.

```java
if (myRankEntity == null) {
    boolean hasNext = total > 3;
    return new SingleRankingInitialResponse(
            diff.name(), year, month, week,
            top3, null, List.of(),
            hasNext ? 3 : null,
            hasNext
    );
}
```

cursor 기반 스크롤 쿼리가 `WHERE rank > cursor`이므로, `cursor=3`으로 호출하면 rank 4부터 조회된다. top3 다음부터 무한 스크롤이 가능해진다.

---

### 스크롤마다 불필요한 COUNT 쿼리 발생

**상황**

`getSingleRankingHistoryScroll`에서 스크롤 1회마다 쿼리가 2번 실행됐다.

1. `findScrollResult` — `SELECT ... WHERE rank > cursor LIMIT size`
2. `countByDifficultyAndWeek` — `SELECT COUNT(*) ...`

`hasNext` 판단을 위해 전체 건수를 매 스크롤마다 DB에 질의했기 때문이다.

**원인**

```java
long total = singleRankingRepository.countByDifficultyAndWeek(diff, weekKey);
int lastRank = raw.get(raw.size() - 1).getRank();
boolean hasNext = lastRank < total;
```

**해결**

`size + 1`개를 조회한 뒤, 실제 반환 건수가 `size`를 초과하는지로 `hasNext`를 판단하도록 변경했다. COUNT 쿼리를 완전히 제거하여 스크롤 1회당 쿼리 1번으로 줄었다.

```java
List<SingleRanking> raw = singleRankingRepository.findScrollResult(diff, weekKey, cursor, size + 1);

boolean hasNext = raw.size() > size;
List<SingleRanking> page = hasNext ? raw.subList(0, size) : raw;
Integer nextCursor = hasNext ? page.get(page.size() - 1).getRank() : null;
```

Repository의 `findScrollResult` 시그니처(`limit(size)`)는 그대로 유지하고, Service에서 `size + 1`을 전달하는 방식으로 처리했다. `countByDifficultyAndWeek`는 초기 응답(`getSingleRankingHistory`)에서 여전히 사용하므로 Repository에서 제거하지 않았다.

---

### 정산 스케줄러에서 Redis ZSet 전체를 한 번에 메모리에 로딩

**상황**

`settleSingleRanking`에서 `getAllEntries`를 호출해 Redis ZSet 전체를 단일 `ZREVRANGE key 0 -1` 명령으로 가져왔다. 유저 수가 수만 명 규모로 늘면 난이도당 수만 건이 한 번에 JVM 힙에 올라와 OOM 위험이 있다.

**원인**

```java
List<RankEntry> entries = singleRankingRedisRepository.getAllEntries(key);
```

`getAllEntries`는 내부적으로 `reverseRangeWithScores(key, 0, -1)`를 호출하므로 크기 제한이 없다.

**해결**

`getAllEntries`를 제거하고, 이미 존재하는 `getTotalCount` + `getRangeByRank`를 조합해 500개 단위 청크로 반복 처리하도록 변경했다.

```java
private static final int CHUNK_SIZE = 500;

long total = singleRankingRedisRepository.getTotalCount(key);
long offset = 0;
while (offset < total) {
    long end = Math.min(offset + CHUNK_SIZE - 1, total - 1);
    List<RankEntry> chunk = singleRankingRedisRepository.getRangeByRank(key, offset, end);

    if (chunk.isEmpty()) break;

    // chunk 처리 및 saveAll
    offset += chunk.size();
}
```

Rank는 `(int)offset + i + 1`로 계산해 청크 간 연속성을 보장했다. 새 메서드 없이 기존 인터페이스를 재활용했으므로 Repository 계층의 변경은 `getAllEntries` 제거뿐이다.

**변경 파일**

| 파일 | 변경 내용 |
|------|-----------|
| `SingleRankingScheduler` | `getAllEntries` → `getTotalCount` + `getRangeByRank` 청크 루프 |
| `SingleRankingRedisRepository` | `getAllEntries` 메서드 제거 |
| `SingleRankingRedisRepositoryImpl` | `getAllEntries` 구현 제거 |
| `SingleRankingSchedulerTest` | mock을 `getTotalCount` + `getRangeByRank` 기반으로 교체 |

---

### buildWeekKey가 WeekUtil.getWeek와 동일한 포맷을 중복 구현

**상황**

`SingleRankingServiceImpl`에 `buildWeekKey(int year, int month, int week)` 라는 private 메서드가 존재했다. `WeekUtil.getWeek(LocalDate)`의 내부 포맷과 완전히 동일한 문자열(`"yyyy-MM-w"`)을 생성했지만 별도로 구현되어 있었다. week key 형식을 변경할 때 `WeekUtil`만 수정하고 `buildWeekKey`를 빠뜨리면 과거 랭킹 조회 키가 깨지는 위험이 있었다.

**원인**

```java
// SingleRankingServiceImpl
private String buildWeekKey(int year, int month, int week) {
    return year + "-" + String.format("%02d", month) + "-" + week;
}

// WeekUtil.getWeek(LocalDate) 내부
return year + "-" + String.format("%02d", month) + "-" + weekOfMonth;
```

포맷 로직이 두 곳에 분산되어 변경 시 동기화 누락 위험이 있었다.

**해결**

`WeekUtil`에 `int` 파라미터를 받는 오버로드를 추가하고, `getWeek(LocalDate)` 내부에서도 이를 호출하도록 위임해 포맷 로직을 한 곳으로 통합했다.

```java
// WeekUtil
public static String getWeek(LocalDate date) {
    int year = date.getYear();
    int month = date.getMonthValue();
    int weekOfMonth = date.get(WEEK_FIELDS.weekOfMonth());
    return getWeek(year, month, weekOfMonth);  // 위임
}

public static String getWeek(int year, int month, int week) {
    return year + "-" + String.format("%02d", month) + "-" + week;
}
```

`SingleRankingServiceImpl`의 `buildWeekKey` 호출 2곳을 `WeekUtil.getWeek(year, month, week)`로 교체하고 `buildWeekKey` 메서드를 삭제했다.

---

### recordedAt에 타임존 없는 LocalDateTime 수동 세팅

**상황**

`SingleRanking.of()` 팩토리 메서드에서 `ranking.recordedAt = LocalDateTime.now()`로 삽입 시각을 직접 세팅했다. `LocalDateTime.now()`는 JVM 기본 타임존에 의존하므로 서버 타임존 설정이 변경되면 변경 전후 데이터의 시각 기준이 달라져 일관성이 깨진다.

**원인**

```java
// of() 팩토리 메서드
ranking.recordedAt = LocalDateTime.now();
```

애플리케이션 코드에서 직접 현재 시각을 주입하므로 JVM 타임존 변경에 취약하다.

**해결**

`@CreationTimestamp`를 적용해 INSERT 시점의 시각 세팅을 Hibernate에 위임했다. `updatable = false`를 함께 추가해 한 번 기록된 시각이 UPDATE로 변경되지 않도록 보장했다.

```java
@CreationTimestamp
@Column(name = "recorded_at", nullable = false, updatable = false)
private LocalDateTime recordedAt;
```

팩토리 메서드에서 `LocalDateTime.now()` 수동 호출을 제거했다. `BaseEntity`의 `createdAt`/`updatedAt`이 Spring Data JPA `@CreatedDate`/`@LastModifiedDate`로 관리되는 것과 동일한 방향이다.

---

### difficulty를 String으로 레이어 간 전달하여 유효성 검사가 Service 내부에 존재

**상황**

`difficulty` 파라미터가 Controller → Service 전 구간에서 `String` 타입으로 전달됐다. `SingleRankingServiceImpl` 내부의 `parseDifficulty()`가 `Difficulty.valueOf()`를 호출하고 `IllegalArgumentException`을 잡아 `BusinessException(INVALID_INPUT_VALUE)`로 변환했다. 유효성 검사가 Service 깊숙이 묻혀 있어 Controller 계층에서 조기에 거부할 수 없는 구조였다.

**원인**

```java
// Controller
@RequestParam String difficulty

// Service 인터페이스
SingleRankingInitialResponse getSingleRanking(String difficulty, ...);

// ServiceImpl
private Difficulty parseDifficulty(String difficulty) {
    try {
        return Difficulty.valueOf(difficulty.toUpperCase());
    } catch (IllegalArgumentException e) {
        throw new BusinessException(INVALID_INPUT_VALUE);
    }
}
```

**해결**

Controller, Service 인터페이스, ServiceImpl 전 구간의 타입을 `Difficulty` enum으로 변경했다. Spring MVC가 `@RequestParam Difficulty difficulty` 선언을 보고 문자열 → enum 자동 변환을 처리하며, 잘못된 값이 오면 `MethodArgumentTypeMismatchException`을 던져 컨트롤러 진입 전에 차단한다.

```java
// Controller
@RequestParam Difficulty difficulty

// Service 인터페이스
SingleRankingInitialResponse getSingleRanking(Difficulty difficulty, ...);

// ServiceImpl — parseDifficulty 호출 및 메서드 자체 삭제
```

`MethodArgumentTypeMismatchException`은 `GlobalExceptionHandler`에 이미 핸들러가 등록되어 있어 별도 추가 없이 `INVALID_TYPE_VALUE` 400으로 응답된다. 기존 `parseDifficulty()`가 던지던 `INVALID_INPUT_VALUE`와 에러 코드가 달라지지만, 둘 다 400이고 의미상으로는 타입 불일치를 나타내는 `INVALID_TYPE_VALUE`가 더 정확하다.

**변경 파일**

| 파일 | 변경 내용 |
|------|-----------|
| `RankingControllerDocs` | `getSingleRanking`, `getSingleRankingHistory` 파라미터 `String` → `Difficulty` |
| `RankingController` | 동일하게 타입 변경 |
| `SingleRankingService` | 4개 메서드 시그니처 `String` → `Difficulty` |
| `SingleRankingServiceImpl` | 4개 메서드 시그니처 변경, `parseDifficulty()` 호출 및 메서드 삭제 |

---

### 닉네임 스냅샷 방식에서 동적 조회 방식으로 변경

**상황**

`single_ranking` 테이블에 `nickname` 컬럼을 두고 정산 시점의 닉네임을 스냅샷으로 저장했다. 이후 유저가 닉네임을 변경해도 과거 랭킹에는 변경 전 닉네임이 그대로 표시됐다. 팀 합의 결과 "닉네임이 바뀌면 과거 기록에도 현재 닉네임이 표시되어야 한다"는 요건이 확정됐다.

**원인**

닉네임을 컬럼으로 저장하면 조회 시점의 최신 닉네임을 반영할 수 없다. Member 테이블에 `@SQLRestriction("deleted_at IS NULL")`이 적용되어 있어 탈퇴 회원을 JPA로 직접 조회할 수 없다는 점도 스냅샷 방식을 선택한 이유였으나, `getOrDefault`로 `[Unknown]` fallback 처리하면 이 문제도 함께 해결된다.

**해결**

`single_ranking.nickname` 컬럼을 제거하고, 과거 랭킹 조회 API에서 `member_id` 목록으로 `MemberService.getNicknamesByIds()`를 호출해 현재 닉네임을 동적으로 채우도록 변경했다.

```java
// SingleRankingServiceImpl — getSingleRankingHistory
List<UUID> allIds = ... // top3 + around + myRankEntity IDs (distinct)
Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(allIds);

// 탈퇴 회원: getNicknamesByIds 결과에 없음 → [Unknown] fallback
nicknameMap.getOrDefault(sr.getMemberId(), "[Unknown]")
```

정산 스케줄러(`SingleRankingScheduler`)는 닉네임을 저장하지 않으므로 `MemberService` 의존성이 완전히 제거됐다.

**변경 파일**

| 파일 | 변경 내용 |
|------|-----------|
| `SingleRanking` (entity) | `nickname` 필드 제거, `of()` 시그니처에서 `nickname` 파라미터 제거 |
| `SingleRankingScheduler` | `MemberService` 의존성 제거, 닉네임 조회 로직 제거 |
| `SingleRankingServiceImpl` | `toHistoryEntries`에 `nicknameMap` 추가, 각 히스토리 메서드에서 `getNicknamesByIds` 배치 호출 |
| `SingleRankingSchedulerTest` | `MemberService` mock 제거, 닉네임 스냅샷 검증 테스트 삭제 |
| `SingleRankingServiceImplTest` | `of()` 호출에서 nickname 파라미터 제거, 히스토리 테스트에 `getNicknamesByIds` mock 추가 |

**DDL**

```sql
ALTER TABLE single_ranking DROP COLUMN nickname;
```

---

### DB 커밋 성공 후 Redis 키 삭제 실패 시 재실행해도 Redis 키가 남는 문제

**상황**

`afterCommit()`에서 Redis 키 삭제가 실패하면 다음 재실행 시 `countByDifficultyAndWeek(...) > 0` 조건에 걸려 즉시 `continue`된다. DB 중복 저장은 막히지만, 이미 DB에 데이터가 있는 경우 해당 키가 `keysToDelete`에 추가되지 않아 Redis 키 정리가 영원히 재시도되지 않는다.

**원인**

```java
if (singleRankingRepository.countByDifficultyAndWeek(diff, week) > 0) {
    continue;  // keysToDelete에 추가 없이 그냥 건너뜀
}
```

**해결**

DB에 이미 정산된 경우에도 Redis 키가 존재하면 `keysToDelete`에 추가한 뒤 `continue`하도록 수정했다. 이로써 재실행 시 DB 저장은 skip하되 남아 있는 Redis 키는 `afterCommit()`에서 정리된다.

```java
if (singleRankingRepository.countByDifficultyAndWeek(diff, week) > 0) {
    keysToDelete.add(key);  // Redis 키 잔존 시 afterCommit()에서 정리
    keysToDelete.add(gradeKey);
    continue;
}
```

---

### grade를 ZSet과 동일 키에 저장하면 score와 불일치 발생

**상황**

동일 유저가 여러 번 플레이하는 경우, 두 번째 게임의 score가 첫 번째보다 낮으면 ZSet의 score는 갱신되지 않는다. 그러나 grade를 별도로 `saveGrade()`로 저장하면 낮은 점수 게임의 grade로 덮어써진다. 결과적으로 ZSet의 score(1번 게임)와 Hash의 grade(2번 게임)가 서로 다른 게임에서 산출된 값이 된다.

**원인**

score 갱신 여부와 무관하게 grade를 항상 저장하는 구조이기 때문이다.

**해결**

`saveScore()`를 `saveScoreAndGrade()`로 교체해, score가 실제로 갱신될 때만 grade도 함께 갱신하도록 묶었다.

```java
// SingleRankingRedisRepositoryImpl
public boolean saveScoreAndGrade(String scoreKey, String gradeKey, UUID memberId, double score, String grade) {
    Double currentScore = rankingStringRedisTemplate.opsForZSet().score(scoreKey, memberId.toString());
    if (currentScore == null || score > currentScore) {
        rankingStringRedisTemplate.opsForZSet().add(scoreKey, memberId.toString(), score);
        rankingStringRedisTemplate.opsForHash().put(gradeKey, memberId.toString(), grade);
        return true;  // 갱신됨 → isNewRecord 판단에 활용
    }
    return false;
}
```

반환값 `boolean`은 `saveResult` 서비스에서 `isNewRecord` 판단에도 활용할 수 있다.

**변경 파일**

| 파일 | 변경 내용 |
|------|-----------|
| `RankingKeyUtil` | `singleGradeKey()` 추가 |
| `SingleRankingRedisRepository` | `saveScore` → `saveScoreAndGrade(boolean 반환)`, `getGrade`, `getGrades` 추가 |
| `SingleRankingRedisRepositoryImpl` | 위 메서드 구현 (ZSet + Hash ops) |
| `RankingEntry` | `grade` 필드 (`Grade` 타입) 추가 |
| `SingleRanking.of()` | `grade` 파라미터 추가 |
| `SingleRankingScheduler` | 청크별 `getGrades()` 배치 조회, gradeKey도 삭제 목록에 추가 |
| `SingleRankingServiceImpl` | 이번 주·과거 주 조회 모두 grade 포함 응답 |
| `SingleRankingSchedulerTest` | `getGrades` mock 추가, `deleteKey` 2회(ZSet + grade 키) 검증 |
| `SingleRankingServiceImplTest` | `of()` grade 파라미터, `getGrades`/`getGrade` mock 추가 |
