# 싱글 랭킹 동점 처리 및 playTime 응답 추가

## Background / Context

이번 주 싱글 랭킹은 Redis Sorted Set으로 관리되며, 기존 구조는 `memberId -> score`만 저장했다.
Redis ZSet은 score가 같으면 member 문자열 사전순으로 정렬하므로, UUID 기반 memberId를 쓰는 현재 구조에서는 동점자 순위가 사실상 무작위가 된다.

랭킹 응답에 `playTime`도 포함해야 하지만, 이미 배포되어 쌓인 Redis 데이터에는 원본 playTime이 없다.
따라서 기존 데이터의 playTime은 임의로 복원하지 않고 `null`로 표현하고, 새로 저장되는 데이터부터 원본 ms 값을 별도 Hash에 저장한다.

## Decision

Redis ZSet score는 정렬 전용 composite score로 변경한다.

```text
composite = (score + 1) * SCORE_UNIT
          + (MAX_PLAY_TIME_MS - playTimeMs) * PLAY_TIME_UNIT
          + (DECISECONDS_IN_WEEK - decisecondsSinceWeekStart)
```

정렬 우선순위는 다음과 같다.

1. score 높은 순
2. score가 같으면 playTime(ms) 짧은 순
3. score와 playTime이 같으면 등록 시간이 빠른 순으로 정렬을 시도한다.

3차 기준은 Redis ZSet score에 포함되는 100ms 단위 등록 시간 component를 사용하므로 best-effort이다.
동일 score/playTime 기록이 같은 100ms 구간에 저장되면 Redis member 문자열 순서로 정렬될 수 있다.

Redis 키는 다음처럼 분리한다.

```text
ranking:SINGLE:{difficulty}:{week}          # ZSet: memberId -> composite score
ranking:SINGLE:{difficulty}:{week}:grade    # Hash: memberId -> grade
ranking:SINGLE:{difficulty}:{week}:playtime # Hash: memberId -> playTimeMs
```

`playTime`은 composite에서 역산하지 않는다.
실시간 랭킹 조회는 playTime Hash 값을 사용하고, Hash에 값이 없으면 `null`을 반환한다.
주간 정산도 playTime Hash 값을 `single_ranking.play_time`에 저장하고, Hash에 값이 없으면 `null`로 저장한다.
composite 도입 전 Redis에 남아 있는 plain score는 `SCORE_UNIT`보다 작은 값으로 식별해 그대로 점수로 저장한다.

과거 주 랭킹 저장을 위해 `single_ranking.play_time` 컬럼을 nullable로 추가한다.

```sql
ALTER TABLE single_ranking
ADD COLUMN play_time INT NULL COMMENT '플레이 시간 (ms), playTime 도입 전 데이터는 NULL' AFTER `rank`;
```

## Why

- Redis ZSet은 단일 score 기준으로만 정렬되므로 다중 정렬 조건을 적용하려면 composite score가 필요하다.
- playTime을 composite에서 역산하면 clamp 정책에 의해 원본 값이 왜곡될 수 있다.
- 기존 Redis 데이터에는 playTime이 없으므로 `0` 같은 임의 값을 넣지 않고 `null`로 표현하는 편이 데이터 의미를 보존한다.
- score, grade, playTime은 같은 게임 결과를 가리켜야 하므로 composite가 실제로 갱신될 때만 세 값을 함께 갱신한다.
- Redis 갱신은 Lua script로 `ZSCORE` 비교, `ZADD`, grade/playTime `HSET`을 한 번에 처리해 동일 memberId 동시 저장 시 낮은 composite가 높은 composite를 덮지 못하게 한다.
- score/playTime까지 동일한 기록의 등록 시간 순서를 엄격히 보장하려면 별도 monotonic sequence 또는 ZSet member 구조 변경이 필요하므로 후속 개선으로 분리한다.

## Caution

- 새 composite 정렬은 새 주차 Redis 키부터 적용하는 것을 전제로 한다. 기존 score-only ZSet과 composite ZSet을 같은 키에 섞으면 정렬이 깨진다.
- 운영 프로파일은 `ddl-auto: validate`이므로 배포 전 `single_ranking.play_time` 컬럼 추가가 필요하다.
- 기존 Redis/DB 데이터의 playTime은 `null`이다. 프론트엔드는 `playTime` nullable을 허용해야 한다.
- composite score는 정렬용이며 API 응답/DB 저장용 playTime의 단일 소스가 아니다.

## Test Plan

- 같은 score에서 playTime(ms)이 짧은 기록의 composite score가 더 큰지 확인
- 같은 score에서 결과 저장 시 playTime 개선 가능성을 위해 랭킹 갱신을 호출하는지 확인
- Redis 저장 시 Lua script 결과에 따라 composite가 갱신될 때만 grade/playTime Hash도 함께 갱신하는지 확인
- 이번 주 랭킹 응답에 playTime Hash 값이 포함되고, Hash 값이 없으면 null인지 확인
- 주간 정산 시 playTime Hash 값이 DB에 저장되고, Hash 값이 없으면 null로 저장되는지 확인
- 정산 후 ZSet, grade Hash, playTime Hash가 모두 삭제되는지 확인
- 과거 주 랭킹 조회 응답에 DB의 playTime이 포함되는지 확인
