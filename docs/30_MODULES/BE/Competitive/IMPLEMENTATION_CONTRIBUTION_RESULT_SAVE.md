# IMPLEMENTATION_CONTRIBUTION_RESULT_SAVE

## Background / Context

기여도 뺏기 게임은 `CONTRIBUTION_GAME_END` 정상 종료 시점에 최종 rankings를 계산한다.
이번 구현은 이 종료 스냅샷을 기반으로 플레이어별 기여도 결과를 DB에 저장한다.

이전 브랜치에서 Redis final rankings를 남기도록 했고, 이번 브랜치는 그 값을 다음 랭킹 갱신 브랜치와 별개로 `contribution_result`, `contribution_result_member`에 저장한다.

랭킹 갱신은 이번 범위에서 제외한다. `competitive_ranking`과 주간 랭킹 Redis 키는 건드리지 않는다.

## Decision

### 저장 대상

정상 종료(`GAME_COMPLETED`)만 저장한다.

- `PLAYER_DISCONNECTED` 조기 종료는 저장하지 않는다.
- 조기 종료 payload에는 rankings가 없고, 완주 결과로 보기 어렵기 때문이다.
- CAT은 `member_id`가 없고 플레이어 기록/랭킹 대상이 아니므로 저장하지 않는다.

### 저장 구조

`ContributionResultSaveService`를 별도 서비스로 두어 게임 진행 로직과 DB 저장 책임을 분리했다.

```text
ContributionGameServiceImpl.completeGame()
  -> Redis final rankings 저장
  -> Redis session status ENDED
  -> ContributionResultSaveService.saveCompletedResult()
  -> CONTRIBUTION_GAME_END 반환
```

결과 DB 저장은 게임 종료 브로드캐스트를 막지 않는다. 저장 중 예상치 못한 예외가 발생해도 `completeGame()`은 ERROR 로그를 남기고 `CONTRIBUTION_GAME_END` 반환을 계속 진행한다.

정상 종료 확정은 Redis 세션 status를 `IN_PROGRESS`에서 `ENDED`로 원자적으로 전이하는 `markSessionEndedIfInProgress()` 성공 여부로 판단한다. 이미 종료된 세션이면 final rankings 저장, DB 저장, `CONTRIBUTION_GAME_END` 생성을 추가로 수행하지 않는다.

Repository는 프로젝트 표준에 맞춰 Service가 직접 JPA에 의존하지 않도록 분리했다.

```text
ContributionResultRepository
ContributionResultRepositoryImpl
ContributionResultJpaRepository

ContributionResultMemberRepository
ContributionResultMemberRepositoryImpl
ContributionResultMemberJpaRepository
```

### rank 저장 정책

현재 `contribution_result_member`에는 rank를 저장하지 않는다.

이유:
- rank는 게임 종료 응답과 결과 화면 표시용 값이다.
- DB 영속 데이터의 목적은 플레이어별 최종 contribution 기록이다.
- 필요 시 플레이어 결과 조회에서 contribution 내림차순 기준으로 rank를 재계산할 수 있다.

주의: CAT은 DB에 저장하지 않으므로 DB에서 재계산한 순위는 "플레이어끼리의 순위"다. CAT을 포함한 게임 종료 당시 전체 순위 복원이 필요하면 Redis final rankings 또는 별도 snapshot 저장 정책이 필요하다.

### 중복 저장 방지

`session_id` unique 제약을 기준으로 같은 게임 세션은 한 번만 저장한다.

- 저장 전 `existsBySessionId(sessionId)`로 1차 방지
- 동시 저장 경쟁으로 unique 충돌이 발생하면 `DataIntegrityViolationException`을 잡고 idempotent하게 무시
- 이미 저장된 세션은 WARN 로그를 남기고 return

## Caution

- 결과 저장 서비스는 명령어 만료 방식에 의존하지 않는다.
- 서버 자동 만료, 프론트 바닥 도달 만료, 인원수별 commandSet 개편이 발생해도 정상 종료 rankings snapshot만 유지되면 저장 로직은 재사용 가능하다.
- CAT은 저장하지 않는다.
- rank는 저장하지 않는다.
- 랭킹 Redis와 `competitive_ranking` 갱신은 후속 브랜치에서 구현한다.
- 저장 서비스 내부에서는 예상치 못한 오류를 ERROR 로그 후 예외로 다시 던진다. 게임 종료 흐름에서는 해당 예외를 잡아 종료 메시지 전송을 계속한다.
- 같은 `session_id` 중복 저장은 idempotent 처리한다.
- `DataIntegrityViolationException` 발생 시 `session_id` 존재 여부를 재확인하고, 실제 중복 저장 충돌일 때만 무시한다.

## Test Plan

- 정상 종료 rankings로 `contribution_result`와 플레이어별 `contribution_result_member`가 저장되는지 확인
- CAT 항목(`playerId == null`)은 member row에 저장하지 않는지 확인
- 같은 `sessionId`가 이미 저장되어 있으면 중복 저장하지 않는지 확인
- 플레이어별 contribution 값이 정확히 매핑되는지 확인
- `session_id` unique 충돌이 발생해도 idempotent하게 처리되는지 확인
- `ContributionGameServiceImpl` 정상 종료 경로에서 `ContributionResultSaveService`가 호출되는지 확인
- 결과 DB 저장 실패가 발생해도 `CONTRIBUTION_GAME_END`가 반환되는지 확인
- 이미 종료 확정된 세션에서는 `CONTRIBUTION_GAME_END`를 추가로 반환하지 않는지 확인
- `session_id` 중복이 아닌 무결성 예외는 다시 던지는지 확인

검증 명령:

```bash
./gradlew test --tests 'com.gitcat.letsgitit.domain.competitive.service.ContributionResultSaveServiceImplTest' --tests 'com.gitcat.letsgitit.domain.competitive.service.ContributionGameServiceImplTest'
```
