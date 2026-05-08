# Single_IMPLEMENTATION_세션만료및재시작처리

## Background / Context

싱글 게임 백엔드는 Redis에 게임 세션을 저장하며 TTL은 30분이다. 기존 프론트 구현은
싱글 페이지 진입 후 30분이 지나면 `/home`으로 이동시키는 방식이었지만, 실제 Redis 세션
생성 시각과 정확히 맞지 않았고 세션 만료를 게임 종료 상태로 처리하지 않았다.

또한 결과 화면의 다시하기는 기존 Phaser 씬만 재시작하고 같은 `sessionId`를 재사용했다.
Redis 세션이 이미 종료되었거나 만료 임박한 상태에서는 결과 저장 시 세션 만료 오류가 발생할
수 있으므로, 다시하기 시 새 백엔드 세션을 생성해야 한다.

## Decision

`singleStore.setSession()`이 호출되는 시점에 `sessionStartedAt`과 `sessionExpiresAt`을 저장한다.
프론트가 백엔드의 Redis 생성 시각을 직접 받을 수 없으므로, 현재 API 응답 기준에서는
`startSession()` 성공 후 store 반영 시각을 세션 시작 기준으로 사용한다.

`useSinglePageGuards`는 `sessionExpiresAt`을 구독해 남은 시간만큼 타이머를 등록한다. 탭이
백그라운드에 있어 `setTimeout`이 지연될 수 있으므로 `visibilitychange`와 `focus` 시점에도
현재 시간이 만료 시각을 넘었는지 검사한다.

만료 시에는 단순 라우팅 이동 대신 `game:session-expired` 이벤트를 발행한다. `useSingleGame`은
이를 받아 `SESSION_EXPIRED` 결과를 만들고, `SingleScene`은 같은 이벤트로 타이머와 낙하 노드를
정리한다. 결과 모달은 세션 만료 안내 문구를 보여주며, 만료된 세션에 대해서는 결과 저장 API를
호출하지 않는다.

결과 모달의 다시하기는 `singleApi.startSession(difficulty)`를 다시 호출해 새 Redis 세션을 만든다.
새 세션을 store에 반영한 뒤 게임 상태를 `playing`으로 전환하고, 새 Phaser 씬이 준비되면
`game:start`를 발행해 시작 모달 없이 바로 재시작한다.

## Caution

- 현재 REST 응답에 서버 기준 `expiresAt`이 없기 때문에 FE 기준 시간으로 30분을 계산한다.
  서버 시간이 반드시 필요하면 싱글 세션 시작 응답에 만료 시각 필드를 추가해야 한다.
- 세션 만료 결과는 Redis TTL이 이미 끝난 상태이므로 결과 저장 API를 호출하지 않는다.
- 이미 성공/실패 결과가 확정된 뒤 만료 타이머가 도달해도 결과를 덮어쓰지 않도록
  `useSingleGame`에서 완료 상태를 가드한다.
- 기존 브라우저 히스토리 방어 로직은 유지되어 뒤로가기/앞으로가기 재진입은 `/home`으로 보낸다.
- **다시하기 중복 클릭 방지**: `onRestart`는 `await singleApi.startSession()`을 포함한 async 함수다. 응답 대기 중 버튼을 여러 번 클릭하면 세션이 중복 생성된다. `isRestarting` 상태를 두어 요청 진행 중 버튼을 비활성화하고, 함수 진입 시 `if (isRestarting) return`으로 중복 호출을 차단한다. 세션 시작 성공 후 게임이 재시작되면 컴포넌트가 리셋되므로 `isRestarting`을 `false`로 되돌릴 필요가 없다.

## Test Plan

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run lint`
- 세션 생성 후 30분 경과 시 결과 모달에 세션 만료 안내가 표시되는지 확인
- 탭을 백그라운드에 둔 뒤 만료 시간이 지난 상태로 복귀할 때 즉시 세션 만료 처리되는지 확인
- 결과 화면에서 다시하기 클릭 시 새 `POST /api/v1/single/sessions`가 호출되고 새 게임이 시작되는지 확인
- 다시하기 버튼을 빠르게 두 번 클릭 시 버튼이 즉시 비활성화되고 `POST /api/v1/single/sessions`가 1회만 호출되는지 확인
- 세션 만료 결과에서는 `POST /api/v1/single/sessions/{sessionId}/result`가 호출되지 않는지 확인
