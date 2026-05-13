# IMPLEMENTATION_WEBSOCKET_FE_HANDOFF

## Background / Context

프론트엔드에서 대기실 및 멀티플레이어 게임 WebSocket 연동을 진행하려면, 단순히 이벤트 명세만 보는 것으로는 부족하다.  
현재 백엔드 구현 상태상 "이미 확정된 부분"과 "아직 임시 명세 단계이거나 추후 합의가 필요한 부분"이 함께 존재하기 때문이다.

이 문서는 프론트엔드 개발자가 WebSocket 연동을 시작하기 전에 반드시 알아야 하는 현재 기준사항을 정리한다.

참고 기준은 아래 두 가지다.

- 임시 이벤트 명세: [`docs/10_ARCHITECTURE/임시_WEBSOCKET_API.md`](/Users/mosun/개발/gitit/S14P31A304/docs/10_ARCHITECTURE/임시_WEBSOCKET_API.md:1)
- 현재 백엔드 공통 WebSocket 구현

## Decision

### 1. STOMP endpoint와 prefix

현재 백엔드 기준 STOMP 연결 정보는 아래와 같다.

- endpoint: `/ws`
- publish prefix: `/app`
- broker prefix: `/topic`, `/queue`
- user destination prefix: `/user`

즉 클라이언트는 `/ws`로 연결한 뒤, 이벤트 성격에 따라 `/topic/...` 또는 `/user/queue/...`를 구독해야 한다.

### 2. CONNECT 시 JWT 인증 필요

WebSocket은 CONNECT 시점에 `Authorization` 헤더의 Bearer access token으로 인증한다.

즉 프론트는 STOMP CONNECT 시 아래 형식의 헤더를 포함해야 한다.

```text
Authorization: Bearer {accessToken}
```

CONNECT 인증이 성공하면 이후 `SEND`, `SUBSCRIBE` 요청에서는 세션에 저장된 사용자 정보가 재사용된다.

### 3. 개인 메시지 구독 경로는 `/user/queue/private`

백엔드 내부 구현은 `convertAndSendToUser(memberId, "/queue/private", payload)`를 사용한다.  
그리고 `setUserDestinationPrefix("/user")`가 설정되어 있다.

따라서 프론트가 실제로 구독해야 하는 개인 메시지 경로는 아래다.

```text
/user/queue/private
```

현재 임시 명세 문서에는 일부 개인 메시지 구독 경로가 `/queue/private`로 적혀 있지만, 프론트 구독 기준으로는 `/user/queue/private`를 사용해야 한다.

### 4. 이벤트 응답은 공통 envelope 없이 각 DTO가 `type`을 최상위 필드로 가짐

현재 공통 wrapper DTO를 따로 두지 않고, 각 이벤트 응답 DTO가 `type`을 최상위 필드로 가지는 방식을 유지한다.

예:

```json
{
  "type": "READY_CHANGED",
  "playerId": "...",
  "nickname": "dobby",
  "isReady": true,
  "allReady": false
}
```

에러도 마찬가지로 WebSocket 전용 포맷을 사용한다.

```json
{
  "type": "ERROR",
  "code": "ROOM_NOT_FOUND",
  "message": "존재하지 않는 방입니다."
}
```

즉 프론트는 `type` 기반 분기 처리를 전제로 이벤트를 설계하면 된다.

### 5. disconnect 처리는 아직 서버 공통 진입점만 있음

현재 백엔드는 disconnect 이벤트를 감지하는 리스너만 두었고, 실제 방 퇴장 처리/방장 위임/게임 중 이탈 처리까지는 아직 연결하지 않았다.

따라서 FE 입장에서는 아래를 알아야 한다.

- 비정상 종료 시 서버 후속 이벤트(`PLAYER_LEFT`, `HOST_DELEGATED`, `COOP_GAME_END`)는 아직 완전 구현 상태가 아님
- 임시 명세에 존재하더라도 실제 동작 여부는 서버 도메인 구현 단계에서 다시 확인해야 함

## FE가 지금 바로 믿어도 되는 것

### 1. 연결/인증 방식

- `/ws` endpoint 연결
- CONNECT 시 `Authorization: Bearer {accessToken}` 전달

### 2. 공통 구독 규칙

- 공개 브로드캐스트: `/topic/...`
- 개인 메시지: `/user/queue/private`

### 3. 에러 포맷

개인 에러 응답은 다음 포맷으로 내려온다.

```json
{
  "type": "ERROR",
  "code": "...",
  "message": "..."
}
```

### 4. `type` 기반 이벤트 분기

현재 설계는 모든 응답이 최상위 `type` 필드를 갖는 구조를 유지한다.  
따라서 FE store나 socket event router는 `type` 기준으로 분기하면 된다.

## FE가 아직 확정으로 보면 안 되는 것

### 1. request body의 `playerId` 사용 방식

임시 명세에는 request body에 `playerId`가 포함된 항목이 많다.  
다만 서버 구현이 진행되면서 행동 주체를 request의 `playerId`로 볼지, 세션 `Principal` 기반으로 고정할지는 아직 완전히 합의되지 않았다.

즉 FE는 당분간 임시 명세대로 request를 만들되, 이 규칙은 후속 협의에 따라 바뀔 수 있다는 전제로 작업해야 한다.

### 2. disconnect 후 자동 처리 이벤트

명세상으로는 아래 같은 이벤트가 존재한다.

- `PLAYER_LEFT`
- `HOST_DELEGATED`
- `COOP_GAME_END` (실패)

하지만 현재 공통 인프라 단계에서는 이 이벤트들이 실제 서버 로직까지 완성된 상태가 아니다.  
프론트는 UI 흐름을 미리 준비할 수는 있지만, 실제 수신 시점/보장 여부는 서버 구현 완료 후 재검증이 필요하다.

### 3. 일부 에러 코드

임시 명세에는 아래처럼 아직 백엔드 `ErrorCode` enum과 완전히 정합되지 않은 코드가 있다.

- `GAME_ALREADY_STARTED`
- `NOT_ALL_READY`
- `NOT_ENOUGH_PLAYERS`
- `SELF_KICK`
- `SELF_TRANSFER`
- `NOT_RESET_PLAYER`
- `RESET_NOT_REQUIRED`

즉 프론트는 우선 명세를 참고하되, 실제 구현 단계에서는 서버와 최종 코드값을 다시 맞춰야 한다.

## FE 구현 시 권장 사항

### 1. socket manager에서 개인 구독 경로를 상수화

예:

```text
/user/queue/private
```

이 경로는 임시 명세 문구가 아니라 실제 서버 구현 기준으로 맞춰야 한다.

### 2. `type` 기반 중앙 분기 처리

이벤트가 많아질 예정이므로, 수신 패킷을 `type` 기준으로 한 번 라우팅하는 구조가 좋다.

예:

- room 공통 이벤트
- contribution 이벤트
- time-attack 이벤트
- coop 이벤트
- 공통 `ERROR`

### 3. 개인 에러와 공개 이벤트를 분리해서 구독

- 공개 상태 변화: `/topic/...`
- 본인만 받는 에러/결과: `/user/queue/private`

UI에서도 전역 토스트, 모달, 특정 플레이어 상태 반영을 분리하는 것이 좋다.

### 4. disconnect 관련 UX는 낙관적으로 확정하지 말 것

서버 공통 진입점은 준비되어 있지만 실제 방/게임 도메인 로직이 아직 완성되지 않았으므로, "상대 이탈 시 어떤 이벤트가 언제 온다"를 프론트에서 강하게 가정하면 위험하다.

## Caution

### 1. 임시 명세의 `/queue/private` 표기는 그대로 믿으면 안 됨

프론트 구독 경로는 `/queue/private`가 아니라 `/user/queue/private`다.

### 2. CONNECT 실패 시 개인 에러 수신을 기대하면 안 됨

CONNECT 단계에서 인증이 실패하면 아직 세션 `Principal`이 없어서 `/user/queue/private`로 에러를 유니캐스트할 수 없다.  
즉 CONNECT 실패는 별도 연결 실패 흐름으로 처리해야 한다.

## Test Plan

- `/ws` 연결 + `Authorization` 헤더 포함 CONNECT 성공 확인
- `/user/queue/private` 구독 시 개인 에러/개인 결과 수신 확인
- `/topic/...` 구독 시 공개 브로드캐스트 수신 확인
- `type: ERROR` 응답 분기 처리 확인
- access token 없이 CONNECT 시 연결 실패 처리 확인
- disconnect/강퇴/방장 위임/게임 종료 이벤트는 서버 구현 완료 후 재검증
