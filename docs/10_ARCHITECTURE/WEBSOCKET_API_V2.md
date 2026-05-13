# Let's Git it WebSocket API V2

이 문서는 현재 팀이 합의한 WebSocket/STOMP 이벤트 명세를 사람이 읽기 쉽고, AI 에이전트(Claude, Codex)도 오해 없이 해석할 수 있도록 다시 정리한 버전이다.

이 문서의 목적은 다음과 같다.

- 프론트엔드와 백엔드가 같은 publish/subscribe 경로를 기준으로 구현한다.
- 각 이벤트의 요청/응답 구조를 명확히 분리한다.
- 개인 메시지 경로를 실제 서버 구현 기준으로 명확히 안내한다.
- 아직 확정되지 않은 항목은 "미확정" 또는 "논의 필요"로 분리해서 적는다.

## 1. 공통 연결 규칙

### 1-1. STOMP endpoint

- WebSocket endpoint: `/ws`

### 1-2. publish prefix

- 클라이언트 발행 prefix: `/app`

예:

- `/app/room/{roomId}/ready`
- `/app/room/{roomId}/chat`

### 1-3. broker prefix

- 공개 브로드캐스트: `/topic/...`
- 개인 메시지: `/user/queue/private`

### 1-4. 개인 메시지 경로 규칙

현재 서버 구현은 내부적으로 다음 방식을 사용한다.

```java
convertAndSendToUser(memberId, "/queue/private", payload)
```

그리고 Spring의 user destination prefix는 `/user`다.

따라서 클라이언트가 실제로 구독해야 하는 개인 메시지 경로는 아래다.

```text
/user/queue/private
```

중요:

- 서버 내부 destination: `/queue/private`
- 클라이언트 실제 구독 경로: `/user/queue/private`

이 문서에서는 프론트엔드 관점의 실제 구독 경로를 기준으로 표기한다.

### 1-5. CONNECT 인증 규칙

STOMP CONNECT 시 `Authorization` 헤더에 Bearer access token을 포함해야 한다.

```text
Authorization: Bearer {accessToken}
```

CONNECT 인증이 실패하면 세션 `Principal`이 아직 만들어지지 않았으므로 `/user/queue/private` 유니캐스트를 사용할 수 없다.  
이 경우 서버는 STOMP `ERROR` 프레임으로 아래 JSON payload를 내려준다.

```json
{
  "type": "ERROR",
  "code": "INVALID_TOKEN",
  "message": "유효하지 않은 토큰입니다."
}
```

### 1-6. 응답 포맷 규칙

현재 WebSocket 응답은 공통 envelope DTO를 별도로 두지 않는다.  
각 응답 DTO가 최상위 `type` 필드를 가진다.

정상 응답 예:

```json
{
  "type": "READY_CHANGED",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "dobby",
  "isReady": true,
  "allReady": false
}
```

에러 응답 예:

```json
{
  "type": "ERROR",
  "code": "ROOM_NOT_FOUND",
  "message": "존재하지 않는 방입니다."
}
```

### 1-7. 공통 개인 이벤트

`/user/queue/private`는 단순 에러 전용 채널이 아니다.  
현재 기준으로는 아래와 같은 개인 이벤트가 올 수 있다.

- `ERROR`
- `FORCE_DISCONNECT`
- 각 게임 모드의 개인 결과 이벤트

주의:

- `CONNECT` 이전 인증 실패는 `/user/queue/private`가 아니라 STOMP `ERROR` 프레임으로 수신한다.
- `CONNECT` 성공 이후 `@MessageMapping` 처리 중 발생한 개인 에러만 `/user/queue/private` 유니캐스트 대상이 된다.

#### FORCE_DISCONNECT

이 이벤트는 인증 상태가 바뀌어 기존 WebSocket 세션을 유지하면 안 되는 경우 서버가 전송한다.

현재 구현은 서버가 `FORCE_DISCONNECT` 메시지를 보내고, 클라이언트가 이를 수신해 연결을 종료하는 방식이다.  
즉 이 이벤트만으로 서버가 WebSocket 세션을 직접 `close()`하는 것은 아니다.

예:

- 로그아웃
- 토큰 재발급
- 새 로그인으로 기존 연결 교체

응답 예:

```json
{
  "type": "FORCE_DISCONNECT",
  "code": "REPLACED_BY_NEW_LOGIN",
  "message": "새 로그인으로 인해 기존 연결이 종료되었습니다."
}
```

현재 사용 가능한 `code` 예시는 아래와 같다.

- `LOGGED_OUT`
- `TOKEN_REISSUED`
- `REPLACED_BY_NEW_LOGIN`

프론트엔드 동작 규칙:

- `FORCE_DISCONNECT` 수신 시 현재 STOMP/WebSocket 연결을 즉시 종료해야 한다.
- 필요하면 로그인 화면 이동 또는 재연결 유도 처리를 추가한다.

## 2. AI 에이전트를 위한 해석 규칙

이 문서를 참조하는 Claude/Codex는 아래 규칙을 전제로 해석한다.

### 규칙 A. 요청의 `playerId`는 현재 명세상 유지

현재 request body에는 `playerId`가 포함된 항목이 많다.  
하지만 장기적으로 행동 주체를 request body 기준으로 볼지, 세션 `Principal` 기준으로 볼지는 별도 합의 대상이다.

따라서 현재는 다음 원칙으로 해석한다.

- 문서에 적힌 request body는 그대로 따른다.
- 서버 구현 시 인증된 세션 사용자와 request의 `playerId`를 어떻게 검증할지는 도메인 구현 단계에서 결정한다.

### 규칙 B. 개인 메시지는 모두 `/user/queue/private` 구독으로 본다

문서 내 개인 응답/에러는 모두 `/user/queue/private`로 수신한다고 해석한다.

### 규칙 C. 아직 enum에 없는 에러 코드는 임시 코드일 수 있다

예:

- `GAME_ALREADY_STARTED`
- `NOT_ALL_READY`
- `NOT_ENOUGH_PLAYERS`
- `SELF_KICK`
- `SELF_TRANSFER`
- `NOT_RESET_PLAYER`
- `RESET_NOT_REQUIRED`

이 코드들은 현재 임시 WebSocket 명세 기준이며, 최종 `ErrorCode` enum 반영 여부는 별도 확인이 필요하다.

## 3. 공통 Player 객체

대기실/방 관련 응답에서 플레이어 목록은 아래 구조를 기본으로 한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `playerId` | UUID | 플레이어 ID |
| `nickname` | String | 닉네임 |
| `characterHair` | String | 머리 에셋 ID |
| `characterHairColor` | String | 머리색 에셋 ID |
| `characterBody` | String | 바디 에셋 ID |
| `characterEye` | String | 눈 에셋 ID |
| `characterOutfit` | String | 옷 에셋 ID |
| `characterOutfitColor` | String | 옷색 에셋 ID |
| `isReady` | Boolean | 준비 여부 |
| `isHost` | Boolean | 방장 여부 |

## 4. 대기실 공통 이벤트

### 4-1. READY_UPDATE

- 발행: `/app/room/{roomId}/ready`
- 구독: `/topic/room/{roomId}`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"READY_UPDATE"` 고정 |
| `playerId` | UUID | Y | 플레이어 ID |
| `nickname` | String | Y | 플레이어 닉네임 |
| `isReady` | Boolean | Y | 준비 여부 |

```json
{
  "type": "READY_UPDATE",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "dobby",
  "isReady": true
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"READY_CHANGED"` 고정 |
| `playerId` | UUID | 준비 상태 변경한 플레이어 ID |
| `nickname` | String | 준비 상태 변경한 플레이어 닉네임 |
| `isReady` | Boolean | 준비 여부 |
| `allReady` | Boolean | 전원 준비 완료 여부 |

```json
{
  "type": "READY_CHANGED",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "dobby",
  "isReady": true,
  "allReady": false
}
```

#### 에러

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 방이 존재하지 않음 |
| `GAME_ALREADY_STARTED` | 이미 게임 시작됨 |

### 4-2. GAME_START

- 발행: `/app/room/{roomId}/start`
- 설명: 방장만 전송 가능. 서버가 `gameMode`를 확인하고 모드별 브로드캐스트를 전송한다.

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"GAME_START"` 고정 |
| `playerId` | UUID | Y | 방장 ID |

```json
{
  "type": "GAME_START",
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response: 기여도 뺏기

- 브로드캐스트: `/topic/room/{roomId}/contribution`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_STARTED"` 고정 |
| `startAt` | Long | 게임 시작 타임스탬프 |
| `commandSetId` | Integer | 데이터셋 번호 |
| `commandSet` | Array | 명령어 세트 목록 |
| `commandSet[].commandSequence` | Integer | 명령어 식별자 |
| `commandSet[].text` | String | 명령어 전체 텍스트 |
| `commandSet[].branchName` | String | 브랜치 이름 |

```json
{
  "type": "CONTRIBUTION_STARTED",
  "startAt": 1714567890000,
  "commandSetId": 2,
  "commandSet": [
    {
      "commandSequence": 0,
      "text": "git commit -m 'fix'",
      "branchName": "main"
    },
    {
      "commandSequence": 1,
      "text": "git push origin main",
      "branchName": "main"
    }
  ]
}
```

#### Response: 타임어택

- 브로드캐스트: `/topic/room/{roomId}/time-attack`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"TIMEATTACK_STARTED"` 고정 |
| `startAt` | Long | 게임 시작 타임스탬프 |
| `timeLimit` | Integer | 제한 시간(초) |
| `commandSetId` | Integer | 데이터셋 번호 |
| `myCommands` | Array | 본인에게 배정된 명령어 목록 |

```json
{
  "type": "TIMEATTACK_STARTED",
  "startAt": 1714567890000,
  "timeLimit": 180,
  "commandSetId": 1,
  "myCommands": [
    {
      "commandSequence": 0,
      "text": "git commit -m 'fix'"
    }
  ]
}
```

#### Response: 협력

- 브로드캐스트: `/topic/room/{roomId}/coop`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_STARTED"` 고정 |
| `startAt` | Long | 게임 시작 타임스탬프 |
| `totalRounds` | Integer | 총 라운드 수 |

```json
{
  "type": "COOP_STARTED",
  "startAt": 1714567890000,
  "totalRounds": 5
}
```

주의:

- `COOP_STARTED` 이후 즉시 `COOP_ROUND_REVEAL`이 이어질 수 있다.

#### 개인 에러 응답

- 구독: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `NOT_HOST` | 방장이 아님 |
| `NOT_ALL_READY` | 전원 준비 미완료 |
| `NOT_ENOUGH_PLAYERS` | 협력 모드 필수 인원 미충족 |
| `GAME_ALREADY_STARTED` | 이미 게임 진행 중 |

### 4-3. KICK_REQUEST

- 발행: `/app/room/{roomId}/kick`
- 강퇴 대상 개인 구독: `/user/queue/private`
- 나머지 전체 구독: `/topic/room/{roomId}`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"KICK_REQUEST"` 고정 |
| `hostId` | UUID | Y | 강퇴 요청한 방장 ID |
| `targetId` | UUID | Y | 강퇴 대상 플레이어 ID |

```json
{
  "type": "KICK_REQUEST",
  "hostId": "550e8400-e29b-41d4-a716-446655440000",
  "targetId": "661f9511-f30c-52e5-b827-557766551111"
}
```

#### 대상자 개인 응답

- 구독: `/user/queue/private`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"KICKED"` 고정 |
| `playerId` | UUID | 강퇴된 본인 ID |
| `roomId` | UUID | 강퇴된 방 ID |

```json
{
  "type": "KICKED",
  "playerId": "661f9511-f30c-52e5-b827-557766551111",
  "roomId": "772g0622-g41d-63f6-c938-668877662222"
}
```

#### 전체 응답

- 구독: `/topic/room/{roomId}`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"PLAYER_KICKED"` 고정 |
| `playerId` | UUID | 강퇴된 플레이어 ID |
| `nickname` | String | 강퇴된 플레이어 닉네임 |
| `remainMembers` | Array | 강퇴 후 남은 멤버 목록 |

#### 개인 에러

- 구독: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `NOT_HOST` | 방장이 아님 |
| `PLAYER_NOT_FOUND` | 대상 플레이어가 방에 없음 |
| `SELF_KICK` | 자기 자신을 강퇴 시도 |

### 4-4. LEAVE

- 발행: `/app/room/{roomId}/leave`
- 구독: `/topic/room/{roomId}`
- 설명: 정상 퇴장 시 클라이언트 전송. 비정상 종료는 서버가 disconnect 이벤트로 감지한다.

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"LEAVE"` 고정 |
| `playerId` | UUID | Y | 나가는 플레이어 ID |

```json
{
  "type": "LEAVE",
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response

- 구독: `/topic/room/{roomId}`

방장 퇴장 시 `PLAYER_LEFT` 이후 `HOST_DELEGATED` 또는 방 해체가 이어질 수 있다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"PLAYER_LEFT"` 고정 |
| `playerId` | UUID | 나간 플레이어 ID |
| `nickname` | String | 나간 플레이어 닉네임 |
| `remainMembers` | Array | 퇴장 후 남은 멤버 목록 |

### 4-5. PLAYER_JOINED

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}`

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"PLAYER_JOINED"` 고정 |
| `joinedPlayer` | Object | 입장한 플레이어 정보 |
| `allMembers` | Array | 현재 전체 멤버 목록 |

### 4-6. HOST_TRANSFER_REQUEST

- 발행: `/app/room/{roomId}/transfer-host`
- 전체 구독: `/topic/room/{roomId}`
- 개인 에러 구독: `/user/queue/private`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"HOST_TRANSFER_REQUEST"` 고정 |
| `currentHostId` | UUID | Y | 현재 방장 ID |
| `nextHostId` | UUID | Y | 위임 대상 ID |

```json
{
  "type": "HOST_TRANSFER_REQUEST",
  "currentHostId": "550e8400-e29b-41d4-a716-446655440000",
  "nextHostId": "661f9511-f30c-52e5-b827-557766551111"
}
```

#### 전체 응답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"HOST_TRANSFERRED"` 고정 |
| `newHostId` | UUID | 새 방장 ID |
| `newHostNickname` | String | 새 방장 닉네임 |
| `allMembers` | Array | 변경 후 전체 멤버 목록 |

#### 개인 에러

- 구독: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `NOT_HOST` | 요청자가 방장이 아님 |
| `PLAYER_NOT_FOUND` | 대상 플레이어가 방에 없음 |
| `SELF_TRANSFER` | 자기 자신에게 위임 시도 |
| `GAME_ALREADY_STARTED` | 게임이 이미 시작되어 위임 불가 |

### 4-7. HOST_DELEGATED

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}`
- 설명: 방장이 위임 없이 나갔을 때 서버가 새 방장을 자동 선정해 전송

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"HOST_DELEGATED"` 고정 |
| `newHostId` | UUID | 새 방장 ID |
| `newHostNickname` | String | 새 방장 닉네임 |
| `remainMembers` | Array | 현재 방 멤버 목록 |

### 4-8. CHAT

- 발행: `/app/room/{roomId}/chat`
- 구독: `/topic/room/{roomId}`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"CHAT_REQUEST"` 고정 |
| `playerId` | UUID | Y | 플레이어 ID |
| `nickname` | String | Y | 플레이어 닉네임 |
| `message` | String | Y | 채팅 내용 |

```json
{
  "type": "CHAT_REQUEST",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "dobby",
  "message": "ㄱㄱ"
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CHAT_RESPONSE"` 고정 |
| `playerId` | UUID | 채팅 보낸 플레이어 ID |
| `nickname` | String | 채팅 보낸 플레이어 닉네임 |
| `message` | String | 채팅 내용 |
| `sentAt` | Long | 전송 시각 타임스탬프 |

```json
{
  "type": "CHAT_RESPONSE",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "dobby",
  "message": "ㄱㄱ",
  "sentAt": 1714567890000
}
```

## 5. 기여도 뺏기 모드

### 5-1. CONTRIBUTION_INPUT

- 발행: `/app/room/{roomId}/contribution/input`
- 공개 구독: `/topic/room/{roomId}/contribution`
- 개인 결과 구독: `/user/queue/private`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"CONTRIBUTION_INPUT"` 고정 |
| `playerId` | UUID | Y | 플레이어 ID |
| `inputText` | String | Y | 입력 텍스트 |

```json
{
  "type": "CONTRIBUTION_INPUT",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "inputText": "git commit -m \"feat: 로그인\""
}
```

#### Response: switch 성공

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"BRANCH_MOVE"` 고정 |
| `playerId` | UUID | 이동한 플레이어 ID |
| `branch` | String | 이동한 브랜치명 |

#### Response: 일반 명령어 정답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"SCORE_UPDATE"` 고정 |
| `commandSequence` | Integer | 완료된 명령어 seq |
| `winnerId` | UUID | 정답 플레이어 ID |
| `scores` | Array | 전체 플레이어 현황 |
| `progress` | Integer | 전체 진행도 |

#### 개인 오답 응답

- 구독: `/user/queue/private`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_INPUT_RESULT"` 고정 |
| `playerId` | UUID | 플레이어 ID |
| `isCorrect` | Boolean | `false` 고정 |
| `errorCode` | String | Optional |

```json
{
  "type": "CONTRIBUTION_INPUT_RESULT",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "isCorrect": false,
  "errorCode": "INVALID_BRANCH"
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `GAME_NOT_STARTED` | 게임이 시작되지 않음 |
| `INVALID_BRANCH` | 존재하지 않는 브랜치 |
| `INVALID_COMMAND` | 존재하지 않는 명령어 seq |

### 5-2. COMMAND_EXPIRED

- 발행: `/app/room/{roomId}/contribution/expired`
- 구독: `/topic/room/{roomId}/contribution`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"COMMAND_EXPIRED"` 고정 |
| `playerId` | UUID | Y | 플레이어 ID |
| `commandSequence` | Integer | Y | 바닥에 닿은 명령어 seq |

#### Response

마지막 명령어가 아니라면 `COMMAND_EXPIRED` 브로드캐스트를 보낸다.  
마지막 명령어라면 `CONTRIBUTION_GAME_END`로 대체할 수 있다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COMMAND_EXPIRED"` 고정 |
| `commandSequence` | Integer | 만료된 명령어 seq |
| `scores` | Array | 전체 기여도 목록 |
| `progress` | Integer | 진행도 |

### 5-3. CONTRIBUTION_GAME_END

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}/contribution`

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_GAME_END"` 고정 |
| `rankings` | Array | 최종 순위 목록 |
| `winnerVideoTarget` | UUID | 탈출 영상 대상(1등) |

## 6. 타임어택 모드

### 6-1. TIME_ATTACK_INPUT

- 발행: `/app/room/{roomId}/time-attack/input`
- 공개 구독: `/topic/room/{roomId}/time-attack`
- 개인 결과 구독: `/user/queue/private`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"TIME_ATTACK_INPUT"` 고정 |
| `playerId` | UUID | Y | 플레이어 ID |
| `inputText` | String | Y | 입력 텍스트 |

#### 공개 정답 응답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"TIME_ATTACK_INPUT_RESULT"` 고정 |
| `playerId` | UUID | 입력 플레이어 ID |
| `isCorrect` | Boolean | `true` 고정 |
| `totalCount` | Integer | 해당 플레이어 총 명령어 수 |
| `clearedSlotIndex` | Integer | 비운 슬롯 index |
| `nextCommandText` | String | 새로 채울 명령어 |

#### 개인 오답 응답

- 구독: `/user/queue/private`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"TIME_ATTACK_INPUT_RESULT"` 고정 |
| `playerId` | UUID | 플레이어 ID |
| `isCorrect` | Boolean | `false` 고정 |

### 6-2. TIME_ATTACK_MINIGAME_RESULT

- 발행: `/app/room/{roomId}/time-attack/minigame`
- 개인 구독: `/user/queue/private`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"TIME_ATTACK_MINIGAME_RESULT"` 고정 |
| `playerId` | UUID | Y | 방어자 ID |

#### Response: 대기 공격 없음

- 구독: `/user/queue/private`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"TIME_ATTACK_MINIGAME_CLEAR"` 고정 |

#### Response: 대기 공격 있음

- 구독: `/user/queue/private`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"TIME_ATTACK_MINIGAME_START"` 고정 |
| `attackerNickname` | String | 공격자 닉네임 |
| `keySequence` | Array | 방향키 배열 |
| `keyCount` | Integer | 방향키 개수 |
| `queueCount` | Integer | 남은 대기 공격 수 |

### 6-3. TIME_ATTACK_GAME_END

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}/time-attack`

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"TIME_ATTACK_GAME_END"` 고정 |
| `result` | Array | 플레이어별 최종 결과 |

## 7. 협력 모드

### 7-1. COOP_ROUND_REVEAL

- 공개 구독: `/topic/room/{roomId}/coop`
- 설명: 라운드 시작 또는 reset 후 재공개 시 서버 자동 전송

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_ROUND_REVEAL"` 고정 |
| `round` | Integer | 현재 라운드 |
| `revealEndsAt` | Long | 공개 종료 절대 시간 |
| `commands` | Array | 순서 포함 명령어 목록 |

### 7-2. COOP_ROUND_ASSIGN

- 개인 구독: `/user/queue/private`
- 설명: 공개 종료 후 서버가 자동 유니캐스트

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_ROUND_ASSIGN"` 고정 |
| `round` | Integer | 현재 라운드 |
| `isReset` | Boolean | 리셋 후 재배정 여부 |
| `myCommandText` | String | 배정된 명령어 텍스트 |

### 7-3. COOP_INPUT

- 발행: `/app/room/{roomId}/coop/input`
- 공개 구독: `/topic/room/{roomId}/coop`
- 개인 오타 구독: `/user/queue/private`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"COOP_INPUT"` 고정 |
| `playerId` | UUID | Y | 플레이어 ID |
| `inputText` | String | Y | 입력한 명령어 |

#### 개인 오타 응답

- 구독: `/user/queue/private`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_TYPO"` 고정 |
| `playerId` | UUID | 플레이어 ID |

#### 공개 순서 오입력 응답

- 구독: `/topic/room/{roomId}/coop`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_WRONG_ORDER"` 고정 |
| `resetTargetPlayerId` | UUID | 잘못 입력한 플레이어 ID |
| `nickname` | String | 닉네임 |

#### 공개 정답 응답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_INPUT_RESULT"` 고정 |
| `sequence` | Integer | 전체 게임 기준 완료 순서 |
| `isRoundComplete` | Boolean | 라운드 완료 여부 |

### 7-4. COOP_RESET

- 발행: `/app/room/{roomId}/coop/reset`
- 공개 구독: `/topic/room/{roomId}/coop`
- 개인 재배정 구독: `/user/queue/private`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"COOP_RESET"` 고정 |
| `playerId` | UUID | Y | reset 입력 플레이어 ID |
| `inputText` | String | Y | 입력한 명령어 텍스트 |

#### 에러

| 코드 | 설명 |
| --- | --- |
| `NOT_RESET_PLAYER` | reset 입력 대상 플레이어가 아님 |
| `RESET_NOT_REQUIRED` | 현재 reset 대기 상태가 아님 |

### 7-5. COOP_GAME_END

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}/coop`

#### 성공 응답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_GAME_END"` 고정 |
| `isSuccess` | Boolean | `true` |
| `elapsedTime` | Integer | 소요 시간 |
| `finalGraph` | Object | 완성된 브랜치 형상 |
| `results` | Array | 팀원별 결과 |

#### 실패 응답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_GAME_END"` 고정 |
| `isSuccess` | Boolean | `false` |
| `reason` | String | `"PLAYER_DISCONNECTED"` 고정 |
| `playerId` | UUID | 이탈한 플레이어 ID |
| `nickname` | String | 이탈한 플레이어 닉네임 |

## 8. 현재 구현 상태와 해석 주의점

### 8-1. 이미 구현된 공통 기반

현재 백엔드 공통 구조상 아래는 준비되어 있다.

- CONNECT JWT 인증
- WebSocket 세션 `Principal` 등록
- 개인 메시지 전송 유틸
- WebSocket 에러 유니캐스트 포맷
- disconnect 이벤트 진입점

### 8-2. 아직 도메인별 실제 핸들러는 진행 중일 수 있음

이 문서는 목표 명세이자 구현 기준 문서다.  
도메인별 서버 핸들러가 아직 완전히 구현되지 않은 이벤트도 있을 수 있으므로, 실제 구현 진행 시 서버 코드와 함께 검증해야 한다.

### 8-3. 클라이언트는 `type` 기준으로 분기

프론트엔드나 AI 에이전트는 모든 이벤트를 최상위 `type` 기준으로 분기하는 구조로 이해하면 된다.
