# IMPLEMENTATION_SINGLE_RANKING_REDIS

## Background / Context

싱글 모드 난이도별 랭킹 조회 API 구현이 필요했다.

초기 설계에서는 RDB(`single_ranking` 테이블)에서 직접 조회하는 방식을 고려했으나, 이번 주 실시간 랭킹은 게임이 끝날 때마다 순위가 바뀌는 구조다. RDB 조회는 매 요청마다 집계 쿼리가 발생해 부하가 크고, 실시간성도 떨어진다.

Redis ZSet(Sorted Set)은 score 기준 정렬을 O(log N)에 처리하고, ZREVRANK/ZREVRANGE 명령으로 특정 유저의 순위와 범위 조회를 원자적으로 수행할 수 있다. 이번 주 랭킹에 적합한 구조다.

---

## Decision

이번 주 싱글 랭킹은 Redis ZSet 기반으로 조회한다. 과거 주 랭킹은 RDB에서 조회한다(별도 구현).

### Redis 키 구조

```
ranking:SINGLE:{difficulty}:{week}       # ZSet — memberId(UUID): score
```

- `difficulty`: `EASY` / `NORMAL` / `HARD`
- `week`: `YYYY-MM-W` 형식 (예: `2025-04-3`), `WeekUtil.getCurrentWeek()` 반환값

### 닉네임 저장 방식

ZSet member에 `memberId`만 저장한다. 닉네임은 Redis에 저장하지 않는다.

### 닉네임 조회 방식

`top3`, `myRank`, `around`, scroll 모두 DB에서 조회한다.

- `myRank`: `MemberService.getNicknameById()`로 단건 조회
- `top3` / `around` / scroll: `MemberService.getNicknamesByIds()`로 memberId 목록을 `WHERE id IN (...)` 쿼리 1번으로 일괄 조회

닉네임을 Redis에 캐싱하면 유저가 닉네임을 변경했을 때 정합성이 깨진다. DB 직접 조회로 항상 최신 닉네임을 보장한다.

### 페이지네이션

`afterRank` / `beforeRank` 기반 양방향 무한 스크롤을 사용한다.

- `afterRank` / `beforeRank` 모두 없음: 초기 응답 (top3 + myRank + around ±2)
- `afterRank` 있음: afterRank 이후 size개 반환 (아래 방향)
- `beforeRank` 있음: beforeRank 이전 size개 반환 (위 방향)

**커서 변환 (Redis ZSet 0-indexed 기준)**

| 방향 | 파라미터 | ZSet start | ZSet end |
|------|---------|-----------|---------|
| 아래 | `afterRank` (1-based) | `afterRank` | `afterRank + size - 1` |
| 위 | `beforeRank` (1-based) | `max(0, beforeRank - 2 - size)` | `beforeRank - 2` |

**응답 커서**

- `prevCursor`: 현재 페이지 첫 번째 항목의 1-based 순위. `hasPrev=false`이면 `null`
- `nextCursor`: 현재 페이지 마지막 항목의 1-based 순위. `hasNext=false`이면 `null`
- 위 방향 스크롤에서 `hasPrev`는 ZSet `startIdx > 0` 여부로 판단 (size+1 항목 중 첫 항목은 초과 감지용으로 제거)

---

## Why

### RDB 대신 Redis를 선택한 이유

| 항목 | RDB | Redis ZSet |
|------|-----|------------|
| 순위 조회 | 매번 집계 쿼리 | O(log N) |
| 실시간성 | 낮음 | 높음 |
| 범위 조회 | 페이지 오프셋 필요 | ZREVRANGE로 즉시 |
| 이번 주 한정 | 주간 키로 자동 격리 | 동일 |

### afterRank / beforeRank 기반 양방향 페이지네이션을 선택한 이유

offset 기반은 랭킹 데이터가 실시간으로 바뀔 때 중복/누락이 발생한다. `afterRank` / `beforeRank` 기반은 마지막으로 확인한 순위를 기준으로 조회하므로 이 문제가 없고, 위·아래 양방향 스크롤이 가능하다.

### StringRedisTemplate을 선택한 이유

랭킹 데이터는 ZSet의 member가 `memberId`(UUID 문자열), score가 숫자로 구성된다. 모두 단순 문자열이므로 Java 객체를 JSON으로 직렬화/역직렬화하는 `RedisTemplate<String, Object>` 수준이 필요하지 않다.

`StringRedisTemplate`은 key/value를 모두 `String`으로 처리하는 특화 버전으로, 직렬화 오버헤드 없이 Redis에 문자열을 그대로 저장하고 읽는다. 랭킹처럼 단순 문자열 구조에 가장 적합한 선택이다.

---

## Caution

- `saveScore()`를 호출하는 게임 결과 저장 로직이 구현되어야 랭킹 데이터가 실제로 쌓인다. 현재 이 API는 읽기 전용이다.
- `memberId = null` (비로그인) 처리 코드가 Service에 남아있으나, Spring Security 연동 후 Controller 레벨에서 인증이 강제되면 해당 분기는 실행되지 않는다.
- Redis 키에 TTL이 설정되어 있지 않다. 주간 정산 스케줄러 구현 시 만료 또는 삭제 정책을 함께 결정해야 한다.
- 닉네임은 DB에서 직접 조회한다. `getNicknamesByIds()`는 `WHERE id IN (...)` 쿼리 1번으로 처리되며, 랭킹 조회 빈도를 고려할 때 현재 규모에서 큰 부하는 없다. 트래픽이 증가하면 별도 캐싱 전략을 검토한다.

---

## Troubleshooting

### `@Qualifier` + `@RequiredArgsConstructor` 충돌

**상황**

`SingleRankingRedisRepositoryImpl`에서 `rankingStringRedisTemplate` 빈을 주입받을 때 `@RequiredArgsConstructor`를 사용했으나, 동일한 타입(`StringRedisTemplate`)의 빈이 여러 개 등록되어 있어 Spring이 어느 빈을 주입해야 할지 알 수 없는 문제가 발생했다.

**원인**

Lombok `@RequiredArgsConstructor`는 생성자를 자동 생성할 때 파라미터에 `@Qualifier`를 붙이는 기능을 지원하지 않는다. 따라서 `@Qualifier("rankingStringRedisTemplate")`를 지정할 수 없어 빈 주입이 실패한다.

**해결**

`@RequiredArgsConstructor`를 제거하고 수동 생성자를 직접 작성해 `@Qualifier`를 명시했다.

```java
public SingleRankingRedisRepositoryImpl(
    @Qualifier("rankingStringRedisTemplate") StringRedisTemplate rankingStringRedisTemplate) {
    this.rankingStringRedisTemplate = rankingStringRedisTemplate;
}
```

**적용 범위**

동일한 타입의 빈이 여러 개 등록된 환경에서 `@Qualifier`가 필요한 경우 항상 수동 생성자를 사용해야 한다.

### 자정 주차 경계에서 Redis 키와 응답 날짜 불일치

**상황**

코드 리뷰에서 `getSingleRanking` 메서드 내 `WeekUtil` 호출이 각각 `LocalDate.now()`를 독립적으로 호출하는 문제가 발견됐다. 자정 경계 직전에 요청이 들어오면 Redis 키는 이번 주 기준으로 조회되지만 응답 DTO의 year/month/week는 다음 주 값이 반환될 수 있다.

**원인**

```java
String key = RankingKeyUtil.singleKey(diff.name(), WeekUtil.getCurrentWeek()); // LocalDate.now() #1
return new SingleRankingInitialResponse(
    WeekUtil.getCurrentYear(),        // LocalDate.now() #2
    WeekUtil.getCurrentMonth(),       // LocalDate.now() #3
    WeekUtil.getCurrentWeekOfMonth()  // LocalDate.now() #4
    ...
```

호출 #1과 #2~4 사이에 자정이 지나면 Redis 키(이번 주)와 응답 날짜(다음 주)가 불일치한다.

**해결**

`LocalDate.now()`를 메서드 진입 시점에 한 번만 호출해 모든 WeekUtil 메서드에 동일한 날짜를 전달한다. WeekUtil 각 메서드에 `LocalDate`를 파라미터로 받는 오버로드를 추가하거나, 날짜 정보를 담는 객체를 반환하도록 개선한다.

### saveScore 최고 점수 갱신 누락

**상황**

코드 리뷰에서 `saveScore` 메서드가 기존 점수와 비교 없이 `ZADD`로 무조건 덮어쓰는 문제가 발견됐다. 싱글 랭킹은 이번 주 최고 점수 기준이어야 하는데, 낮은 점수로 재도전한 경우 기존 최고 점수가 내려가 순위가 의도치 않게 하락할 수 있다.

**원인**

`StringRedisTemplate.opsForZSet().add()`는 기본 `ZADD` 명령으로, 기존 값 유무와 관계없이 항상 덮어쓴다.

**해결 방법 검토**

| 방법 | 설명 | 채택 여부 |
|------|------|-----------|
| `ZADD GT` 옵션 | Redis 6.2 이상에서 기존 점수보다 클 때만 갱신 | 미채택 |
| 애플리케이션 비교 후 갱신 | `ZSCORE`로 현재 점수 조회 후 비교 | 채택 |

`ZADD GT`는 Redis 7(현재 사용 버전)에서 지원하지만, `StringRedisTemplate.opsForZSet().add()`가 해당 옵션을 직접 지원하지 않아 `execute`로 raw 커맨드를 작성해야 한다. 코드 가독성과 유지보수를 고려해 애플리케이션 레벨 비교 방식을 선택했다.

**해결**

```java
@Override
public void saveScore(String key, UUID memberId, double score) {
    Double currentScore = rankingStringRedisTemplate.opsForZSet()
        .score(key, memberId.toString());

    if (currentScore == null || score > currentScore) {
        rankingStringRedisTemplate.opsForZSet().add(key, memberId.toString(), score);
    }
}
```

- `currentScore == null`: 이번 주 첫 기록이면 무조건 저장
- `score > currentScore`: 새 점수가 기존 최고 점수보다 높을 때만 갱신
- Redis 요청이 최대 2번(`ZSCORE` + `ZADD`)으로 증가하지만, 최고 점수 정합성 보장이 우선

---

### 닉네임 정합성 불일치

**상황**

코드 리뷰에서 `myRank`는 DB에서 닉네임을 조회하는데, `top3` / `around` / scroll은 Redis Hash에서 닉네임을 조회하는 불일치가 발견됐다. 유저가 닉네임을 변경해도 Hash는 `saveScore` 호출 시점의 닉네임을 그대로 유지하므로, `myRank`에는 최신 닉네임이 표시되지만 `top3` / `around`에는 변경 전 닉네임이 표시되는 문제가 발생한다.

**원인**

초기 설계에서 `myRank`만 DB 조회로 구현하고, 나머지는 Redis Hash 캐싱에서 닉네임을 가져오도록 구현했다. Hash는 게임 결과 저장 시점에만 업데이트되므로 닉네임 변경이 반영되지 않는다.

**해결**

Redis Hash 닉네임 저장 및 조회를 전면 제거하고, 모든 닉네임을 DB에서 직접 조회하도록 통일했다.

- `MemberService.getNicknamesByIds(List<UUID>)`를 추가해 memberId 목록을 `WHERE id IN (...)` 쿼리 1번으로 일괄 조회
- `top3` / `around` / scroll 조회 시 ZSet에서 memberId + score를 가져온 뒤, `getNicknamesByIds()`로 닉네임 매핑
- Hash 저장/조회 코드 및 관련 `infoKey`, `@Slf4j`, `log.warn`, fallback 로직 전체 제거

이로 인해 기존 Hash N+1 문제와 Hash 정합성 불일치 문제도 함께 해소됐다.

---

### afterRank / beforeRank / size 입력값 검증 누락

**상황**

코드 리뷰에서 `afterRank`, `beforeRank`, `size` 파라미터에 범위 검증이 없다는 지적이 있었다. `afterRank = 0`, `size = 0` 같은 값이 그대로 Service로 전달되면 Redis 조회 범위가 비정상적으로 계산될 수 있다.

**원인**

입력값 검증 로직이 Controller와 Service 모두에 없었다.

**해결**

Controller 레벨에서 Bean Validation으로 처리한다.

- `@Validated`를 Controller 클래스에 선언하면 제약 어노테이션이 동작한다.
- 파라미터 제약 어노테이션은 구현체(`RankingController`)가 아닌 인터페이스(`RankingControllerDocs`)에만 선언한다. 구현체에서 재정의하면 `ConstraintDeclarationException`이 발생한다(상세 내용은 `IMPLEMENTATION_SINGLE_RANKING_HISTORY.md` Troubleshooting 참고).
- `afterRank` / `beforeRank`: `@Min(1)` — 값이 전달된 경우에만 검증, `null`(초기 요청)은 통과
- `size`: `@Min(1) @Max(100)` — `defaultValue = "20"`이 있어 항상 검증 대상

```java
// RankingControllerDocs (인터페이스): 파라미터 제약 어노테이션 선언
ResponseEntity<?> getSingleRanking(
    Difficulty difficulty,
    @Min(1) Integer afterRank,
    @Min(1) Integer beforeRank,
    @Min(1) @Max(100) Integer size);

// RankingController (구현체): @Validated 선언, 파라미터 제약 없음
@Validated
@RestController
public class RankingController implements RankingControllerDocs {

    @GetMapping("/single")
    public ResponseEntity<?> getSingleRanking(
        @RequestParam Difficulty difficulty,
        @RequestParam(required = false) Integer afterRank,
        @RequestParam(required = false) Integer beforeRank,
        @RequestParam(required = false, defaultValue = "20") Integer size) { ... }
}
```

검증 실패 시 `ConstraintViolationException`이 발생하고, `GlobalExceptionHandler`의 기존 핸들러가 400으로 처리한다.

---

## Test Plan

- Redis에 테스트 데이터를 직접 삽입 후 `GET /api/v1/rankings/single?difficulty=NORMAL` 호출하여 top3 / myRank / around / prevCursor / nextCursor 응답 확인
- `afterRank` 포함 요청으로 아래 방향 무한 스크롤 동작 확인
- `beforeRank` 포함 요청으로 위 방향 무한 스크롤 동작 확인
- `hasPrev = false`일 때 `prevCursor: null` 반환 확인
- `hasNext = false`일 때 `nextCursor: null` 반환 확인
- `beforeRank=1` 요청 시 빈 응답 반환 확인
- 존재하지 않는 difficulty 값 입력 시 400 응답 확인
- 이번 주 기록이 없는 유저의 경우 `myRank: null`, `around: []` 반환 확인
