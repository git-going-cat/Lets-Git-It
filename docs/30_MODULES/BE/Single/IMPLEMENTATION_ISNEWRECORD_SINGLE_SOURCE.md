# IMPLEMENTATION_ISNEWRECORD_SINGLE_SOURCE

## Background / Context

`SingleServiceImpl.saveResult()`는 게임 결과 저장 후 신기록 여부(`isNewRecord`)를 프론트에 반환한다.

기존 구현에서 `isNewRecord`는 `SingleResult` 테이블(전체 게임 이력)의 최고점을 기준으로 결정됐다.

```java
// 기존
int bestScore = singleResultRepository
    .findTopByMemberIdAndDifficultyOrderByScoreDesc(memberId, difficulty)
    .map(SingleResult::getScore)
    .orElse(0);
boolean isNewRecord = request.score() > bestScore;

if (isNewRecord) {
    int rank = singleRankingService.updateSingleScore(...);
    recordService.updateSingleBestRecord(...); // MemberBestRecord 갱신 — 내부에서도 bestScore를 다시 비교
}
```

그런데 실제 역대 최고 기록은 `MemberBestRecord` 테이블이 관리한다. `RecordServiceImpl.updateSingleBestRecord()`도 내부에서 `MemberBestRecord.bestScore`와 비교해 갱신 여부를 독자적으로 판단했다.

두 테이블이 동기화가 깨진 상황에서는 `SingleResult` 기준으로는 신기록이어서 랭킹까지 갱신됐지만, `MemberBestRecord` 기준으로는 신기록이 아니어서 역대 기록은 그대로인 불일치가 발생할 수 있었다. 결과적으로 프론트에는 "신기록!"이 표시되지만 역대 기록은 갱신되지 않는 상태가 만들어진다.

추가로, 첫 플레이에서 0점을 기록한 경우 `0 > 0 = false`가 되어 첫 기록 자체가 등록되지 않는 엣지 케이스도 존재했다.

---

## Decision

`isNewRecord`의 최종 판단 권한을 `RecordServiceImpl`에 위임했다.

`updateSingleBestRecord()`의 반환 타입을 `void`에서 `boolean`으로 변경해 실제 갱신 여부를 반환하도록 하고, `SingleServiceImpl`은 그 값을 그대로 `isNewRecord`로 사용한다.

`SingleResult` 기반 비교는 불필요한 Redis 호출(랭킹 갱신)을 막는 사전 필터 역할로만 남겼다. 첫 플레이(`previousBest.isEmpty()`)는 점수와 무관하게 필터를 통과시켜 엣지 케이스도 함께 해결했다.

```java
// 수정 후
Optional<SingleResult> previousBest = singleResultRepository
    .findTopByMemberIdAndDifficultyOrderByScoreDesc(memberId, difficulty);

boolean isNewRecord = false;
if (previousBest.isEmpty() || request.score() > previousBest.get().getScore()) {
    int rank = singleRankingService.updateSingleScore(...);
    isNewRecord = recordService.updateSingleBestRecord(...); // 실제 갱신 여부가 곧 isNewRecord
}
```

---

## Why

`SingleResult`는 전체 게임 이력 로그 테이블이고, `MemberBestRecord`는 역대 최고 기록을 관리하는 테이블이다. "신기록"의 정의는 역대 최고 기록 갱신 여부이므로, `MemberBestRecord`가 단일 소스가 되어야 한다.

판단 기준이 두 군데 분산되면 테이블 간 데이터 불일치 시 잘못된 신기록 판정이 발생하고, 로직 변경 시 두 곳을 모두 수정해야 하는 유지보수 부담도 생긴다.

---

## Caution

- `SingleResult` 기반 사전 필터와 `MemberBestRecord` 기반 최종 판단이 여전히 두 테이블을 참조하므로, 두 테이블이 극단적으로 불일치한 경우 사전 필터가 잘못 걸릴 수 있다. 정상 운영 상태에서는 두 테이블이 항상 동기화되므로 허용 가능한 수준이다.
- 사전 필터(`SingleResult`)를 제거하고 `MemberBestRecord`만으로 판단하도록 단순화하는 것도 가능하다. 단, 그 경우 신기록이 아닐 때도 매번 `MemberBestRecord` 조회가 발생하므로 트레이드오프가 있다.

---

## Test Plan

- 기존 최고점보다 높은 점수 → `isNewRecord = true`, 랭킹·역대 기록 갱신 확인
- 기존 최고점보다 낮은 점수 → `isNewRecord = false`, 랭킹·역대 기록 갱신 없음 확인
- 첫 플레이(이전 기록 없음), 점수 0점 → `isNewRecord = true` 확인
- `MemberBestRecord.updateSingleBestRecord()` 반환값 — 갱신 시 `true`, 미갱신 시 `false` 확인
