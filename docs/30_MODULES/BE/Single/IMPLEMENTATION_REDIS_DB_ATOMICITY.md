# IMPLEMENTATION_REDIS_DB_ATOMICITY

## Background / Context

`SingleServiceImpl.saveResult()`는 게임 결과 저장 시 다음 순서로 동작한다.

1. DB — `SingleResult` 저장
2. DB — `Member.totalPlayTime` 누적
3. Redis — 주간 랭킹 갱신 (`updateSingleScore`)
4. DB — `MemberBestRecord` 갱신 (`updateSingleBestRecord`)
5. Redis — 세션 삭제 (`deleteBySessionId`)
6. DB 커밋

`@Transactional` 범위 안에서 5번(Redis 세션 삭제)이 실행된 이후 DB 커밋이 실패하면, Redis 세션은 이미 삭제됐지만 DB는 롤백되는 부분 실패 상태가 발생한다.

이 경우 유저는 게임 결과를 영구적으로 저장할 수 없고, 세션도 사라지기 때문에 재시도 자체가 불가능해진다.

---

## Decision

`deleteBySessionId`를 `TransactionSynchronizationManager.registerSynchronization()`의 `afterCommit` 훅으로 이동해, DB 커밋이 확정된 이후에만 Redis 세션이 삭제되도록 했다.

```java
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override
    public void afterCommit() {
        singleSessionRedisRepository.deleteBySessionId(sessionId);
    }
});
```

주간 랭킹 갱신(`updateSingleScore`)은 반환값인 `rank`를 곧바로 `updateSingleBestRecord`(DB)에서 사용하기 때문에 `afterCommit`으로 분리하기 어렵다. 랭킹 유령 점수 문제는 다음 플레이 시 덮어써지므로 허용 가능한 수준의 불일치로 판단하고, 현실적 타협안으로 `deleteBySessionId`만 이동했다.

---

## Why

Redis는 JPA 트랜잭션에 참여하지 않기 때문에 DB 롤백이 발생해도 Redis 연산은 되돌릴 수 없다. 복구 불가능한 상태를 만드는 연산일수록 DB 커밋 이후로 미루는 것이 안전하다.

세션 삭제는 "이 세션의 결과 저장이 확정됐다"는 의미이므로, DB 커밋이 확정된 시점 이후에 실행되는 것이 의미상으로도 정확하다.

---

## Caution

- `afterCommit` 훅은 트랜잭션 컨텍스트 밖에서 실행되므로, 이 안에서 발생하는 예외는 원래 트랜잭션에 영향을 주지 않는다. 삭제 실패 시 세션이 TTL 만료까지 남아 있을 수 있다.
- 단위 테스트에서는 실제 트랜잭션이 없으므로 `TransactionSynchronizationManager.initSynchronization()`으로 수동 초기화 후, `afterCommit()`을 직접 호출해 검증해야 한다.
- 랭킹(`updateSingleScore`) DB 롤백 시 Redis에 유령 점수가 남는 문제는 이번 변경으로 해결되지 않는다. 완전한 분리가 필요하다면 랭킹 갱신을 커밋 후 비동기 이벤트로 분리하는 구조 변경이 필요하다.

---

## Test Plan

- DB 커밋 성공 시 `deleteBySessionId`가 호출되는지 확인
- `afterCommit` 훅이 트리거되기 전까지 세션이 삭제되지 않는지 확인
- 단위 테스트에서 `TransactionSynchronizationManager` 수동 초기화 및 `afterCommit` 호출로 검증
