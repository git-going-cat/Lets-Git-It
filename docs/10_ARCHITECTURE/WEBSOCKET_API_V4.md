# Let's Git it WebSocket API V4

이 문서는 V3 명세를 기반으로 협력 게임 graphData 구조 변경 사항을 반영한 버전이다.

목적:
- 프론트엔드와 백엔드가 같은 publish/subscribe 경로를 기준으로 구현한다.
- 각 이벤트의 요청/응답 구조를 명확히 분리한다.
- 개인 메시지 경로를 실제 서버 구현 기준으로 명확히 안내한다.

---

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

서버 내부 destination: `/queue/private`
클라이언트 실제 구독 경로: `/user/queue/private`

```text
/user/queue/private
```

### 1-5. CONNECT 인증 규칙

STOMP CONNECT 시 `Authorization` 헤더에 Bearer access token을 포함해야 한다.

```text
Authorization: Bearer {accessToken}
```

CONNECT 인증 실패 시 STOMP `ERROR` 프레임으로 아래 JSON payload를 내려준다.

```json
{
  "type": "ERROR",
  "code": "INVALID_TOKEN",
  "message": "유효하지 않은 토큰입니다."
}
```

### 1-6. 응답 포맷 규칙

WebSocket 응답은 공통 envelope DTO를 별도로 두지 않는다.
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

### 1-7. 공통 에러코드

모든 WebSocket 요청에서 공통으로 발생할 수 있는 에러 코드다.

| code | message |
| --- | --- |
| `AUTHENTICATION_REQUIRED` | 로그인이 필요한 서비스입니다. |
| `UNAUTHORIZED` | 인증 실패 또는 JWT 만료 |
| `INVALID_REQUEST` | 필수 필드 누락 또는 잘못된 요청 형식 |

```json
{
  "type": "ERROR",
  "code": "UNAUTHORIZED",
  "message": "인증에 실패했습니다."
}
```

```json
{
  "type": "ERROR",
  "code": "INVALID_REQUEST",
  "message": "잘못된 요청입니다."
}
```

### 1-8. 공통 개인 이벤트

`/user/queue/private`는 단순 에러 전용 채널이 아니다.
현재 기준으로 아래 이벤트가 올 수 있다.

- `ERROR`
- `FORCE_DISCONNECT`
- 각 게임 모드의 개인 결과 이벤트

주의:
- `CONNECT` 이전 인증 실패는 `/user/queue/private`가 아니라 STOMP `ERROR` 프레임으로 수신한다.
- `CONNECT` 성공 이후 `@MessageMapping` 처리 중 발생한 개인 에러만 `/user/queue/private` 유니캐스트 대상이 된다.

#### FORCE_DISCONNECT

인증 상태 변경으로 현재 WebSocket 연결을 유지할 수 없을 때 서버가 전송한다.
서버가 `FORCE_DISCONNECT` 메시지를 전송하고, 클라이언트가 이를 수신해 연결을 종료하는 방식이다.
즉 서버가 WebSocket 세션을 직접 `close()`하는 것은 아니다.

발생 예시:
- 로그아웃
- 토큰 재발급
- 새 로그인으로 기존 세션 교체

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"FORCE_DISCONNECT"` 고정 |
| `code` | String | 연결 종료 사유 |
| `message` | String | 연결 종료 메시지 |

**code 값**

| code | 설명 |
| --- | --- |
| `LOGGED_OUT` | 로그아웃으로 연결 종료 |
| `TOKEN_REISSUED` | 토큰 재발급으로 연결 종료 |
| `REPLACED_BY_NEW_LOGIN` | 새 로그인으로 기존 연결 교체 |

```json
{
  "type": "FORCE_DISCONNECT",
  "code": "REPLACED_BY_NEW_LOGIN",
  "message": "새 로그인으로 인해 기존 연결이 종료되었습니다."
}
```

```json
{
  "type": "FORCE_DISCONNECT",
  "code": "LOGGED_OUT",
  "message": "로그아웃으로 인해 연결이 종료되었습니다."
}
```

```json
{
  "type": "FORCE_DISCONNECT",
  "code": "TOKEN_REISSUED",
  "message": "토큰 재발급으로 인해 기존 연결이 종료되었습니다."
}
```

프론트엔드 처리 규칙:
- `FORCE_DISCONNECT` 수신 시 현재 STOMP/WebSocket 연결을 즉시 종료해야 한다.
- 필요 시 로그인 화면 이동 또는 재연결 유도 처리를 수행한다.

---

## 2. AI 에이전트를 위한 해석 규칙

### 규칙 A. request body의 `playerId`는 V3에서 대부분 제거됨

V3부터 요청자를 식별하는 `playerId`는 request body에서 제거하고 세션 `Principal` 기반으로 서버가 판단한다.
단, 대상자(target)를 지정하는 경우(예: `nextHostId`)는 request body에 유지한다.

### 규칙 B. 개인 메시지는 모두 `/user/queue/private` 구독으로 본다

문서 내 개인 응답/에러는 모두 `/user/queue/private`로 수신한다고 해석한다.

### 규칙 C. 강퇴 및 퇴장 트리거는 REST API

`KICK_REQUEST`와 `LEAVE`는 V3부터 클라이언트가 WebSocket으로 발행하지 않는다.
REST API 호출 후 서버가 WebSocket 이벤트를 브로드캐스트하는 방식이다.

### 규칙 D. 게임 이벤트에는 `gameSessionId`와 `serverTime`이 포함됨

게임 중 발생하는 모든 이벤트에는 `gameSessionId`(세션 식별)와 `serverTime`(서버 기준 시각)이 포함된다.

---

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

---

## 4. 대기실 공통 이벤트

### 4-0. ROOM_STATE

- 서버 자동 전송
- 트리거: `/topic/room/{roomId}` 구독 직후
- 수신: `/user/queue/private`
- 설명: 재연결 직후 현재 방 상태를 복원하기 위한 상태 동기화 이벤트다.

**서버 전송 조건** (아래 중 하나를 만족하면 전송):
1. 클라이언트가 `/topic/room/{roomId}`를 구독한 경우
2. 클라이언트가 REST API `GET /api/rooms/{roomId}/state`를 호출한 경우

주의:
- WebSocket ROOM_STATE는 `/topic/room/{roomId}` 구독을 트리거로 삼지만, 방 전체로 브로드캐스트하지 않는다.
- 서버는 구독한 사용자 본인에게만 `/user/queue/private`로 `CONTRIBUTION_ROOM_STATE` 또는 `COOP_ROOM_STATE`를 유니캐스트한다.
- ROOM_STATE는 멤버 입장/퇴장 이벤트가 아니라 재연결 클라이언트의 화면 복원용 스냅샷이다.
- ROOM_STATE 조회 실패 시에도 `/user/queue/private`로 기존 `ERROR` 포맷을 전송한다.

**재연결 시 클라이언트 처리**:
- `"WAITING"`: 대기실 화면 복원
- `"IN_GAME"`: reconnect 미지원. 안내 후 대기실 또는 홈 이동

#### Response: 기여도 뺏기

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_ROOM_STATE"` 고정 |
| `roomId` | Long | 방 ID |
| `roomCode` | String | 방 코드 |
| `title` | String | 방 제목 |
| `mode` | String | 게임 모드 (`CONTRIBUTION` 고정) |
| `roomState` | String | 방 상태 (`WAITING` / `IN_GAME`) |
| `currentPlayers` | Integer | 현재 인원 수 |
| `maxPlayers` | Integer | 최대 인원 수 |
| `hasPassword` | Boolean | 비밀번호 설정 여부 |
| `members` | Array | 현재 참여 인원 목록 (공통 Player 객체 배열) |

```json
{
  "type": "CONTRIBUTION_ROOM_STATE",
  "roomId": 1,
  "roomCode": "A3F9KX",
  "title": "로그인 기능 같이 만들기",
  "mode": "CONTRIBUTION",
  "roomState": "WAITING",
  "currentPlayers": 1,
  "maxPlayers": 4,
  "hasPassword": false,
  "members": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": true,
      "isHost": true
    }
  ]
}
```

#### Response: 협력

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_ROOM_STATE"` 고정 |
| `roomId` | Long | 방 ID |
| `roomCode` | String | 방 코드 |
| `title` | String | 방 제목 |
| `teamName` | String | 팀 이름 |
| `mode` | String | 게임 모드 (`COOP` 고정) |
| `roomState` | String | 방 상태 (`WAITING` / `IN_GAME`) |
| `currentPlayers` | Integer | 현재 인원 수 |
| `maxPlayers` | Integer | 최대 인원 수 (4명 고정) |
| `hasPassword` | Boolean | 비밀번호 설정 여부 |
| `selectedMap` | Object | 선택한 맵 정보 |
| `selectedMap.mapId` | String | 맵 ID |
| `selectedMap.mapName` | String | 맵 이름 |
| `selectedMap.difficulty` | Integer | 맵 난이도 |
| `members` | Array | 현재 참여 인원 목록 (공통 Player 객체 배열) |

```json
{
  "type": "COOP_ROOM_STATE",
  "roomId": 1,
  "roomCode": "A3F9KX",
  "title": "협력 플레이 시작",
  "teamName": "깃허브 마스터즈",
  "mode": "COOP",
  "roomState": "WAITING",
  "currentPlayers": 2,
  "maxPlayers": 4,
  "hasPassword": true,
  "selectedMap": {
    "mapId": "550e8400-e29b-41d4-a716-446655440002",
    "mapName": "멋깔나는 맵",
    "difficulty": 3
  },
  "members": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": true,
      "isHost": true
    }
  ]
}
```

---

### 4-1. READY_UPDATE

- 발행: `/app/room/{roomId}/ready`
- 구독: `/topic/room/{roomId}`

#### Request

> V3 변경: `playerId` 필드 제거. 서버가 세션 Principal로 요청자를 식별한다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"READY_UPDATE"` 고정 |
| `isReady` | Boolean | Y | 준비 여부 |

```json
{
  "type": "READY_UPDATE",
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

- 에러 응답 경로: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 방이 존재하지 않음 |
| `ROOM_IN_GAME` | 이미 게임이 시작됨 |
| `PLAYER_NOT_IN_ROOM` | 방에 속하지 않은 플레이어의 요청 |
| `HOST_ALWAYS_READY` | 방장은 항상 준비 완료 상태 |

---

### 4-2. GAME_START

- 발행: `/app/room/{roomId}/start`
- 설명: 방장만 전송 가능. 서버가 Redis에서 `gameMode`를 확인하고 모드별 브로드캐스트를 전송한다.
- 기여도 뺏기 모드는 현재 방 인원수와 일치하는 `competitive_command_set.player_count` 데이터만 사용한다. 해당 인원수의 명령어 셋이 없으면 게임 시작은 실패한다.

#### Request

> V3 변경: `playerId` 필드 제거. 서버가 세션 Principal로 방장 여부를 검증한다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"GAME_START"` 고정 |

```json
{
  "type": "GAME_START"
}
```

#### 에러

- 응답 경로: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 존재하지 않는 방 |
| `GAME_ALREADY_STARTED` | 이미 게임 중인 방 |
| `NOT_HOST` | 방장이 아닌 사용자가 시작 요청 |
| `NOT_ENOUGH_PLAYERS` | 최소 인원 미달 |
| `NOT_ALL_READY` | 준비하지 않은 참가자 존재 |
| `COMMAND_SET_NOT_FOUND` | 기여도 뺏기에서 현재 방 인원수와 일치하는 명령어 셋 없음 |

#### Response: 기여도 뺏기

- 브로드캐스트: `/topic/room/{roomId}/contribution`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_STARTED"` 고정 |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `startAt` | Long | 게임 시작 타임스탬프 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `commandSetId` | Integer | 데이터셋 번호 |
| `initialBranch` | String | 게임 시작 시 모든 플레이어의 초기 브랜치 |
| `commandSet` | Array | 명령어 세트 목록 |
| `commandSet[].commandSequence` | Integer | 명령어 식별자 (commandSet 내부에서만 unique) |
| `commandSet[].text` | String | 명령어 전체 텍스트 |
| `commandSet[].branchName` | String | 명령어 노드가 표시될 브랜치 lane |
| `commandSet[].fallDurationMs` | Long | 프론트 낙하 애니메이션 렌더링 힌트. 서버 검증 기준은 아님 |
| `players` | Array | 참여 플레이어 목록 및 개인 최고 기록 |
| `players[].playerId` | UUID | 플레이어 ID |
| `players[].nickname` | String | 플레이어 닉네임 |
| `players[].bestContribution` | Integer | 기여도 뺏기 최고 기록 (%) |

```json
{
  "type": "CONTRIBUTION_STARTED",
  "serverTime": 1714567889000,
  "startAt": 1714567890000,
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "commandSetId": 2,
  "initialBranch": "main",
  "commandSet": [
    {
      "commandSequence": 0,
      "text": "git commit -m 'fix'",
      "branchName": "main",
      "fallDurationMs": 20000
    },
    {
      "commandSequence": 1,
      "text": "git push origin main",
      "branchName": "main",
      "fallDurationMs": 20000
    }
  ],
  "players": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "bestContribution": 85
    },
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440001",
      "nickname": "alice",
      "bestContribution": 72
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
| `timeLimit` | Integer | 제한 시간 (초) |
| `commandSetId` | Integer | 데이터셋 번호 (1~3) |
| `myCommands` | Array | 본인에게 배정된 명령어 목록 |
| `myCommands[].commandSequence` | Integer | 명령어 순서 |
| `myCommands[].text` | String | 실제 명령어 텍스트 |
| `players` | Array | 참여 플레이어 목록 및 개인 최고 기록 |
| `players[].playerId` | UUID | 플레이어 ID |
| `players[].nickname` | String | 플레이어 닉네임 |
| `players[].bestRecord` | Integer | 타임어택 최고 기록 (초) |

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
  ],
  "players": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "bestRecord": 45
    },
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440001",
      "nickname": "alice",
      "bestRecord": 52
    }
  ]
}
```

#### Response: 협력

- 브로드캐스트: `/topic/room/{roomId}/coop`

> 주의: `COOP_STARTED` 이후 즉시 `COOP_ROUND_REVEAL`이 이어서 전송됩니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_STARTED"` 고정 |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `startAt` | Long | 게임 시작 타임스탬프 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `totalRounds` | Integer | 총 라운드 수 (5 고정) |
| `graphData` | Object | SVG 렌더링용 그래프 구조 데이터 |
| `graphData.viewBox` | String | SVG viewBox 값 |
| `graphData.nodes` | Array | 노드 목록 |
| `graphData.edges` | Array | 엣지 목록 |
| `players` | Array | 참여 플레이어 목록 및 개인 최고 기록 |
| `players[].playerId` | UUID | 플레이어 ID |
| `players[].nickname` | String | 플레이어 닉네임 |
| `players[].bestTime` | Integer | 협력 모드 최고 기록 시간 (ms) |

**graphData.nodes 배열 항목**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `sequence` | Integer | 노드 식별자 (라운드 완료 시 점등 기준) |
| `x` | Integer | SVG x 좌표 |
| `y` | Integer | SVG y 좌표 |
| `label` | String | 노드 라벨 |
| `branch` | String | 브랜치명 |

**graphData.edges 배열 항목**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `from` | Integer | 시작 노드 sequence |
| `to` | Integer | 끝 노드 sequence |
| `type` | String | `solid` / `dashed` / `curve` |

> ⚠️ `graphData` 내 좌표값은 임시값이며, 프론트 화면 확정 후 서버 JSON 파일 수정으로 업데이트됩니다. 프론트는 `viewBox` 기준 좌표로 SVG를 렌더링하고 컨테이너 div로 위치를 제어합니다.

```json
{
  "type": "COOP_STARTED",
  "serverTime": 1714567889000,
  "startAt": 1714567890000,
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "totalRounds": 5,
  "graphData": {
    "viewBox": "0 0 600 300",
    "nodes": [
      { "sequence": 1, "x": 80,  "y": 150, "label": "init", "branch": "main" },
      { "sequence": 2, "x": 200, "y": 150, "label": "sync", "branch": "main" },
      { "sequence": 3, "x": 320, "y": 150, "label": "feat", "branch": "main" },
      { "sequence": 4, "x": 440, "y": 150, "label": "mrge", "branch": "main" },
      { "sequence": 5, "x": 560, "y": 150, "label": "fix",  "branch": "main" }
    ],
    "edges": [
      { "from": 1, "to": 2, "type": "solid" },
      { "from": 2, "to": 3, "type": "solid" },
      { "from": 3, "to": 4, "type": "solid" },
      { "from": 4, "to": 5, "type": "solid" }
    ]
  },
  "players": [
    { "playerId": "550e8400-e29b-41d4-a716-446655440000", "nickname": "dobby", "bestTime": 213 },
    { "playerId": "550e8400-e29b-41d4-a716-446655440001", "nickname": "alice", "bestTime": 248 },
    { "playerId": "550e8400-e29b-41d4-a716-446655440002", "nickname": "bob",   "bestTime": 226 },
    { "playerId": "550e8400-e29b-41d4-a716-446655440003", "nickname": "carol", "bestTime": 271 }
  ]
}
```

#### 개인 에러 응답

- 구독: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 방이 존재하지 않음 |
| `NOT_HOST` | 방장이 아님 |
| `NOT_ALL_READY` | 전원 준비 미완료 |
| `NOT_ENOUGH_PLAYERS` | 협력 모드 필수 인원(4명) 미충족 |
| `GAME_ALREADY_STARTED` | 이미 게임이 진행 중 |

---

### 4-3. KICKED / PLAYER_KICKED

> V3 변경: 강퇴 요청은 WebSocket이 아니라 REST API에서 처리한다. 이 섹션은 서버가 REST 처리 후 전송하는 WebSocket 이벤트만 정의한다.

- 트리거: 방장의 강퇴 REST API 호출 후 서버 자동 전송
- 강퇴 대상 개인 구독: `/user/queue/private`
- 나머지 전체 구독: `/topic/room/{roomId}`

#### 강퇴 대상 개인 응답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"KICKED"` 고정 |
| `playerId` | UUID | 강퇴된 본인 ID |
| `roomId` | Long | 강퇴된 방 ID |

```json
{
  "type": "KICKED",
  "playerId": "661f9511-f30c-52e5-b827-557766551111",
  "roomId": 42
}
```

#### 전체 응답

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"PLAYER_KICKED"` 고정 |
| `playerId` | UUID | 강퇴된 플레이어 ID |
| `nickname` | String | 강퇴된 플레이어 닉네임 |
| `remainMembers` | Array | 강퇴 후 남은 멤버 목록 (공통 Player 객체 배열) |

```json
{
  "type": "PLAYER_KICKED",
  "playerId": "661f9511-f30c-52e5-b827-557766551111",
  "nickname": "alice",
  "remainMembers": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": true,
      "isHost": true
    }
  ]
}
```

#### 에러 (REST API 에러, 방장에게)

- 구독: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `NOT_HOST` | 요청자가 방장이 아님 |
| `PLAYER_NOT_FOUND` | 대상 플레이어가 방에 없음 |
| `CANNOT_KICK_SELF` | 자기 자신을 추방할 수 없습니다. |
| `ROOM_IN_GAME` | 게임 중인 방에서는 강퇴할 수 없습니다. |

---

### 4-4. LEAVE

> V3 변경: 퇴장 요청은 WebSocket이 아니라 REST API에서 처리한다. 이 섹션은 서버가 REST 처리 후 전송하는 WebSocket 이벤트만 정의한다. 비정상 종료는 서버가 disconnect 이벤트로 감지한다.

- 트리거: 퇴장 REST API 호출 또는 비정상 disconnect 감지 후 서버 자동 전송
- 구독: `/topic/room/{roomId}`

> 방장 퇴장 시 `PLAYER_LEFT` → `HOST_DELEGATED` 순서로 전송된다.

#### Response

> V3 변경: 필드명 변경 — `playerId` → `leftPlayerId`, `nickname` → `leftPlayerNickname`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"PLAYER_LEFT"` 고정 |
| `leftPlayerId` | UUID | 나간 플레이어 ID |
| `leftPlayerNickname` | String | 나간 플레이어 닉네임 |
| `remainMembers` | Array | 퇴장 후 남은 멤버 목록 (공통 Player 객체 배열) |

```json
{
  "type": "PLAYER_LEFT",
  "leftPlayerId": "550e8400-e29b-41d4-a716-446655440000",
  "leftPlayerNickname": "dobby",
  "remainMembers": [
    {
      "playerId": "661f9511-f30c-52e5-b827-557766551111",
      "nickname": "alice",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": true,
      "isHost": true
    }
  ]
}
```

#### 인원 0명이 된 경우

- 별도 브로드캐스트 없음. 수신할 대상이 없으므로 `HOST_DELEGATED` 이벤트는 발생하지 않는다.
- 서버가 Redis에서 방 정보를 삭제한다.

---

### 4-5. PLAYER_JOINED

- 서버 자동 브로드캐스트 (REST API 입장 확정 후)
- 구독: `/topic/room/{roomId}`

#### Response

> V3 변경: `roomState` 필드 추가. `joinedPlayer`와 `allMembers` 상세 스펙 명시.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"PLAYER_JOINED"` 고정 |
| `roomState` | String | 방 상태 (`WAITING` / `IN_GAME`) |
| `joinedPlayer` | Object | 입장한 플레이어 정보 (공통 Player 객체) |
| `allMembers` | Array | 현재 방 전체 멤버 목록 (공통 Player 객체 배열) |

```json
{
  "type": "PLAYER_JOINED",
  "roomState": "WAITING",
  "joinedPlayer": {
    "playerId": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "dobby",
    "characterHair": "Hair_01",
    "characterHairColor": "Hairstyle-color_01",
    "characterBody": "Body_01",
    "characterEye": "Eyes_01",
    "characterOutfit": "Outfit_01",
    "characterOutfitColor": "Outfit-color_01",
    "isReady": false,
    "isHost": false
  },
  "allMembers": [
    {
      "playerId": "661f9511-f30c-52e5-b827-557766551111",
      "nickname": "alice",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": false,
      "isHost": true
    },
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": false,
      "isHost": false
    }
  ]
}
```

---

### 4-6. HOST_TRANSFER_REQUEST

- 발행: `/app/room/{roomId}/transfer-host`
- 전체 구독: `/topic/room/{roomId}`
- 개인 에러 구독: `/user/queue/private`
- 설명: 현재 방장이 다른 플레이어에게 자발적으로 방장 권한을 넘길 때 전송. 서버가 권한 검증 후 처리.

#### Request

> V3 변경: `currentHostId` 필드 제거. 서버가 세션 Principal로 방장 여부를 검증한다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"HOST_TRANSFER_REQUEST"` 고정 |
| `nextHostId` | UUID | Y | 위임 대상 플레이어 ID |

```json
{
  "type": "HOST_TRANSFER_REQUEST",
  "nextHostId": "661f9511-f30c-52e5-b827-557766551111"
}
```

#### 전체 응답

> isReady 처리 규칙: 위임 시 이전 방장은 일반 플레이어로 전환되어 `isReady: false`로 초기화. 새 방장은 `isReady: true`로 설정.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"HOST_TRANSFERRED"` 고정 |
| `newHostId` | UUID | 새 방장 ID |
| `newHostNickname` | String | 새 방장 닉네임 |
| `allMembers` | Array | 변경 후 전체 멤버 목록 (공통 Player 객체 배열, isHost 플래그 반영) |

```json
{
  "type": "HOST_TRANSFERRED",
  "newHostId": "661f9511-f30c-52e5-b827-557766551111",
  "newHostNickname": "alice",
  "allMembers": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": false,
      "isHost": false
    },
    {
      "playerId": "661f9511-f30c-52e5-b827-557766551111",
      "nickname": "alice",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": true,
      "isHost": true
    }
  ]
}
```

#### 개인 에러

- 구독: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 방이 존재하지 않음 |
| `NOT_HOST` | 요청자가 방장이 아님 |
| `PLAYER_NOT_FOUND` | 위임 대상 플레이어가 방에 없음 |
| `SELF_TRANSFER` | 자기 자신에게 위임 시도 |
| `ROOM_IN_GAME` | 게임이 이미 시작되어 위임 불가 |

---

### 4-7. ROOM_INFO_UPDATED

> V3 신규 추가. 방 정보 수정 REST API 성공 후 서버가 대기실 전체에 최신 방 정보를 브로드캐스트한다.

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}`

#### Response: 기여도 뺏기

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_ROOM_INFO_UPDATED"` 고정 |
| `roomId` | Long | 방 ID |
| `roomCode` | String | 방 코드 |
| `title` | String | 변경된 방 제목 |
| `mode` | String | 게임 모드 (`CONTRIBUTION` 고정) |
| `roomState` | String | 방 상태 (`WAITING` / `IN_GAME`) |
| `currentPlayers` | Integer | 현재 인원 수 |
| `maxPlayers` | Integer | 최대 인원 수 |
| `hasPassword` | Boolean | 비밀번호 설정 여부 |
| `members` | Array | 현재 참여 인원 목록 (공통 Player 객체 배열) |

```json
{
  "type": "CONTRIBUTION_ROOM_INFO_UPDATED",
  "roomId": 42,
  "roomCode": "A3F9KX",
  "title": "변경된 방 제목",
  "mode": "CONTRIBUTION",
  "roomState": "WAITING",
  "currentPlayers": 2,
  "maxPlayers": 4,
  "hasPassword": false,
  "members": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": true,
      "isHost": true
    }
  ]
}
```

#### Response: 협력

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_ROOM_INFO_UPDATED"` 고정 |
| `roomId` | Long | 방 ID |
| `roomCode` | String | 방 코드 |
| `title` | String | 변경된 방 제목 |
| `teamName` | String | 변경된 팀 이름 |
| `mode` | String | 게임 모드 (`COOP` 고정) |
| `roomState` | String | 방 상태 (`WAITING` / `IN_GAME`) |
| `currentPlayers` | Integer | 현재 인원 수 |
| `maxPlayers` | Integer | 최대 인원 수 (4명 고정) |
| `hasPassword` | Boolean | 비밀번호 설정 여부 |
| `selectedMap` | Object | 선택한 맵 정보 |
| `selectedMap.mapId` | String | 맵 ID |
| `selectedMap.mapName` | String | 맵 이름 |
| `selectedMap.difficulty` | Integer | 맵 난이도 |
| `members` | Array | 현재 참여 인원 목록 (공통 Player 객체 배열) |

```json
{
  "type": "COOP_ROOM_INFO_UPDATED",
  "roomId": 42,
  "roomCode": "A3F9KX",
  "title": "변경된 방 제목",
  "teamName": "변경된 팀 이름",
  "mode": "COOP",
  "roomState": "WAITING",
  "currentPlayers": 2,
  "maxPlayers": 4,
  "hasPassword": false,
  "selectedMap": {
    "mapId": "550e8400-e29b-41d4-a716-446655440002",
    "mapName": "멋깔나는 맵",
    "difficulty": 3
  },
  "members": [
    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": true,
      "isHost": true
    }
  ]
}
```

---

### 4-8. HOST_DELEGATED

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}`
- 설명: 방장이 위임 없이 나갔을 때 서버가 랜덤으로 새 방장을 선정해 브로드캐스트한다.
  방장 퇴장으로 인원이 0명이 되는 경우에는 `HOST_DELEGATED` 이벤트가 발생하지 않는다.

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"HOST_DELEGATED"` 고정 |
| `newHostId` | UUID | 새 방장 플레이어 ID |
| `newHostNickname` | String | 새 방장 닉네임 |
| `remainMembers` | Array | 현재 방 멤버 목록 (공통 Player 객체 배열) |

```json
{
  "type": "HOST_DELEGATED",
  "newHostId": "661f9511-f30c-52e5-b827-557766551111",
  "newHostNickname": "alice",
  "remainMembers": [
    {
      "playerId": "661f9511-f30c-52e5-b827-557766551111",
      "nickname": "alice",
      "characterHair": "Hair_01",
      "characterHairColor": "Hairstyle-color_01",
      "characterBody": "Body_01",
      "characterEye": "Eyes_01",
      "characterOutfit": "Outfit_01",
      "characterOutfitColor": "Outfit-color_01",
      "isReady": false,
      "isHost": true
    }
  ]
}
```

---

### 4-9. CHAT

- 발행: `/app/room/{roomId}/chat`
- 구독: `/topic/room/{roomId}`

#### Request

> V3 변경: `playerId` 필드 제거. 서버가 세션 Principal로 요청자를 식별한다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"CHAT_REQUEST"` 고정 |
| `nickname` | String | Y | 플레이어 닉네임 |
| `message` | String | Y | 채팅 내용 |

```json
{
  "type": "CHAT_REQUEST",
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

#### 에러

- 에러 응답 경로: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 방이 존재하지 않음 |
| `PLAYER_NOT_IN_ROOM` | 방에 속하지 않은 플레이어의 요청 |
| `MESSAGE_TOO_LONG` | 메시지 길이 초과 (150자 제한) |
| `MESSAGE_EMPTY` | 메시지가 비어있음 (공백만 있는 경우 포함) |

---

## 5. 기여도 뺏기 모드

### 고양이(CAT) 기여도 규칙

제한 시간 내 아무도 입력하지 못해 만료(miss)된 명령어의 기여도는 고양이(`[CAT]`)에게 귀속된다.

- `SCORE_UPDATE` / `COMMAND_EXPIRED` / `CONTRIBUTION_GAME_END`의 `scores` 및 `rankings` 배열에 고양이가 항상 포함된다.
- 고양이 항목: `playerId: null`, `nickname: "[CAT]"`
- **기여도 계산 기준**: 분모는 "지금까지 처리된 점수 대상 명령어 수"다. `git switch` / `git checkout`은 자유 브랜치 이동 입력이므로 commandSet에 포함하지 않고, 점수, progress, CAT 만료 대상에서도 제외한다.
  - 플레이어 기여도(%) = 해당 플레이어 성공 명령어 수 / 처리된 점수 대상 명령어 수 × 100
  - 고양이 기여도(%) = 만료된 점수 대상 명령어 수 / 처리된 점수 대상 명령어 수 × 100
  - 모든 플레이어 + 고양이의 기여도 합계는 100%

### 5-1. CONTRIBUTION_INPUT

- 발행: `/app/room/{roomId}/contribution/commands`
- 공개 구독: `/topic/room/{roomId}/contribution`
- 개인 실패 구독: `/user/queue/private`

> V3 변경: 발행 경로 변경 (`/input` → `/commands`). Request 구조 전면 변경. 실패 응답 type명 변경.

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"CONTRIBUTION_INPUT"` 고정 |
| `requestId` | UUID | Y | 요청-응답 매칭용 클라이언트 요청 ID |
| `gameSessionId` | UUID | Y | 현재 게임 세션 ID |
| `commandSequence` | Integer | 조건부 | 입력 대상 명령어 seq. 일반 명령어 입력 시 필수, `git switch` / `git checkout` 입력 시 생략 |
| `inputText` | String | Y | 입력한 텍스트 |

```json
{
  "type": "CONTRIBUTION_INPUT",
  "requestId": "5d4c7c80-7f3f-4d89-8d0b-7f9b1f5e21ab",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "commandSequence": 5,
  "inputText": "git commit -m \"feat: 로그인\""
}
```

#### Response: switch 성공

> V3 변경: `BRANCH_MOVE` → `POSITION_UPDATE`. `gameSessionId`, `serverTime`, `requestId` 추가.

- 경로: `/topic/room/{roomId}/contribution` (브로드캐스트)
- `git switch {branch}` 또는 `git checkout {branch}` 입력으로 브랜치를 이동한다. switch/checkout은 commandSet에 포함하지 않으며, 이동 대상 branch는 현재 commandSet의 `branchName` 또는 `initialBranch`에 존재해야 한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"POSITION_UPDATE"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `requestId` | UUID | 요청-응답 매칭용 클라이언트 요청 ID |
| `playerId` | UUID | 이동한 플레이어 ID |
| `branch` | String | 이동한 브랜치명 |

```json
{
  "type": "POSITION_UPDATE",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567890011,
  "requestId": "5d4c7c80-7f3f-4d89-8d0b-7f9b1f5e21ab",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "branch": "feature/login"
}
```

#### Response: 일반 명령어 정답

> V3 변경: `gameSessionId`, `requestId`, `serverTime` 추가. `progress`가 Integer → Object로 변경.

- 경로: `/topic/room/{roomId}/contribution` (브로드캐스트)

| 필드 | 타입 | 설명                           |
| --- | --- |------------------------------|
| `type` | String | `"SCORE_UPDATE"` 고정          |
| `gameSessionId` | UUID | 현재 게임 세션 ID                  |
| `requestId` | UUID | 요청-응답 매칭용 클라이언트 요청 ID        |
| `serverTime` | Long | 서버 응답 생성 시각                  |
| `commandSequence` | Integer | 완료된 명령어 seq                  |
| `winnerId` | UUID | 정답 플레이어 ID                   |
| `scores` | Array | 전체 플레이어 현황                   |
| `scores[].playerId` | UUID | 플레이어 ID. 고양이라면 null.         |
| `scores[].nickname` | String | 플레이어 닉네임. 고양이라면 [CAT] 으로 고정. |
| `scores[].contribution` | Integer | 현재 기여도 (%)                   |
| `scores[].rank` | Integer | 현재 순위                        |
| `progress` | Object | 전체 진행도                       |
| `progress.current` | Integer | 완료된 명령어 수                    |
| `progress.total` | Integer | 전체 명령어 수                     |
| `progress.percent` | Integer | 진행률 퍼센트                      |

```json
{
  "type": "SCORE_UPDATE",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "requestId": "5d4c7c80-7f3f-4d89-8d0b-7f9b1f5e21ab",
  "serverTime": 1714567890123,
  "commandSequence": 5,
  "winnerId": "550e8400-e29b-41d4-a716-446655440000",
  "scores": [
    { "playerId": "550e8400-e29b-41d4-a716-446655440000", "nickname": "dobby", "contribution": 40, "rank": 1 },
    { "playerId": "550e8400-e29b-41d4-a716-446655440001", "nickname": "alice", "contribution": 35, "rank": 2 },
    { "playerId": "550e8400-e29b-41d4-a716-446655440002", "nickname": "bob",   "contribution": 25, "rank": 3 },
    { "playerId": "550e8400-e29b-41d4-a716-446655440003", "nickname": "carol", "contribution": 10,  "rank": 4 },
    { "playerId": null, "nickname": "[CAT]", "contribution": 0, "rank": 5 }
  ],
  "progress": {
    "current": 6,
    "total": 10,
    "percent": 60
  }
}
```

#### Response: 입력 실패 (switch 실패 또는 명령어 오타)

> V3 변경: `CONTRIBUTION_INPUT_RESULT` (isCorrect: false) → `CONTRIBUTION_INPUT_FAILED`. `errorReason` 필드로 실패 원인 구분.

- 경로: `/user/queue/private` (유니캐스트)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_INPUT_FAILED"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `requestId` | UUID | 요청-응답 매칭용 클라이언트 요청 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `playerId` | UUID | 플레이어 ID |
| `errorReason` | String | 실패 원인 (`INVALID_BRANCH` / `WRONG_COMMAND`) |

**errorReason 목록**

| 코드 | 설명 |
| --- | --- |
| `INVALID_BRANCH` | 존재하지 않는 브랜치로 switch 시도, 또는 현재 플레이어 브랜치와 명령어 lane 불일치 |
| `WRONG_COMMAND` | 명령어 오타 |

```json
{
  "type": "CONTRIBUTION_INPUT_FAILED",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "requestId": "5d4c7c80-7f3f-4d89-8d0b-7f9b1f5e21ab",
  "serverTime": 1714567890456,
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "errorReason": "INVALID_BRANCH"
}
```

#### 에러

- 응답 경로: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `GAME_NOT_STARTED` | 게임이 시작되지 않음 |
| `INVALID_COMMAND` | 존재하지 않는 명령어 seq |
| `COMMAND_ALREADY_CLEARED` | 이미 다른 플레이어가 완료한 명령어 |
| `COMMAND_EXPIRED` | 현재 활성 명령어가 아님 |
| `GAME_ALREADY_ENDED` | 이미 종료된 게임에 입력 |
| `SESSION_MISMATCH` | 요청의 gameSessionId가 현재 게임과 불일치 |
| `PLAYER_NOT_IN_GAME` | 현재 게임에 참여하지 않은 플레이어 |

---

### 5-2. COMMAND_EXPIRE_REQUEST / COMMAND_EXPIRED

> 기여도 게임 진행 개편: 서버 자동 만료 스케줄이 아니라, 프론트가 명령어 노드 바닥 도달 시 만료 요청을 발행한다.

- 발행: `/app/room/{roomId}/contribution/commands/expire`
- 구독: `/topic/room/{roomId}/contribution`

#### Request

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"COMMAND_EXPIRE_REQUEST"` 고정 |
| `requestId` | UUID | Y | 요청-응답 매칭용 클라이언트 요청 ID |
| `gameSessionId` | UUID | Y | 현재 게임 세션 ID |
| `commandSequence` | Integer | Y | 바닥에 도달한 명령어 seq |

```json
{
  "type": "COMMAND_EXPIRE_REQUEST",
  "requestId": "75e9a6c8-5954-4c18-9e42-8465df8cae6d",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "commandSequence": 3
}
```

서버는 요청자 Principal이 현재 게임 참가자인지 검증하고, 해당 명령어가 아직 `READY` 상태일 때만 만료 처리한다. 이미 성공/이동/만료 처리된 명령어의 중복 만료 요청은 CAT 점수를 증가시키지 않고 브로드캐스트하지 않는다.

마지막 명령어가 아니면 `COMMAND_EXPIRED`를 브로드캐스트한다.
마지막 명령어라면 `CONTRIBUTION_GAME_END`를 브로드캐스트한다.

#### Response

| 필드 | 타입 | 설명                             |
| --- | --- |--------------------------------|
| `type` | String | `"COMMAND_EXPIRED"` 고정         |
| `gameSessionId` | UUID | 현재 게임 세션 ID                    |
| `serverTime` | Long | 서버 응답 생성 시각                    |
| `commandSequence` | Integer | 만료된 명령어 seq                    |
| `scores` | Array | 전체 기여도 목록                      |
| `scores[].playerId` | UUID | 플레이어 ID. 고양이라면 null.           |
| `scores[].nickname` | String | 닉네임. 고양이는 [CAT] 으로 고정.         |
| `scores[].contribution` | Integer | 현재 기여도                         |
| `scores[].rank` | Integer | 현재 순위 (동점이면 동일 순위, 다음 순위는 건너뜀) |
| `progress` | Object | 진행도                            |
| `progress.current` | Integer | 완료된 명령어 수                      |
| `progress.total` | Integer | 전체 명령어 수                       |
| `progress.percent` | Integer | 진행률 퍼센트                        |

```json
{
  "type": "COMMAND_EXPIRED",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567894000,
  "commandSequence": 3,
  "scores": [
    { "playerId": "550e8400-e29b-41d4-a716-446655440000", "nickname": "dobby", "contribution": 40, "rank": 1 },
    { "playerId": null, "nickname": "[CAT]", "contribution": 25, "rank": 2 }
  ],
  "progress": {
    "current": 10,
    "total": 20,
    "percent": 50
  }
}
```

#### 에러

- 응답 경로: `/user/queue/private`
- 이미 성공/만료 처리된 명령어의 만료 요청은 에러 응답 없이 no-op 처리된다.

| 코드 | 설명 |
| --- | --- |
| `AUTHENTICATION_REQUIRED` | Principal 없음 |
| `GAME_NOT_STARTED` | 게임이 시작되지 않았거나 진행 중이 아님 |
| `INVALID_COMMAND` | 존재하지 않는 명령어 seq |
| `GAME_ALREADY_ENDED` | 이미 종료된 게임에 만료 요청 |
| `SESSION_MISMATCH` | 요청의 gameSessionId가 현재 게임과 불일치 |
| `PLAYER_NOT_IN_GAME` | 현재 게임에 참여하지 않은 플레이어 |
| `LOCK_ACQUISITION_FAILED` | 분산 락 획득 타임아웃 (재시도 가능) |
| `LOCK_INTERRUPTED` | 락 대기 중 스레드 인터럽트 발생 |

---

### 5-3. CONTRIBUTION_GAME_END

> V3 변경: `gameSessionId`, `serverTime`, `isSuccess`, `reason` 추가. 플레이어 이탈 종료 케이스 추가.

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}/contribution`
- 설명: 마지막 명령어 처리 시 서버가 자동 브로드캐스트.
  - 명령어를 맞힌 경우: `SCORE_UPDATE` 이후 연달아 전송
  - 바닥에 도달한 경우: `CONTRIBUTION_GAME_END` 단독 전송

**랭킹 정렬 기준**:
1. `contribution` 내림차순
- 동점이면 동일 순위를 부여하고 다음 순위는 건너뛴다.
- 고양이(`[CAT]`)도 순위에 포함된다. 고양이가 1등이면 `winnerVideoTarget`은 `null`.
- `GAME_COMPLETED` 정상 종료 시 서버는 final rankings snapshot을 저장하고, CAT을 제외한 실제 플레이어 결과를 DB에 저장한다. DB 저장이 성공한 경우 실제 플레이어의 이번 게임 기여도와 총 플레이 수를 주간 Redis 랭킹에 누적한다.
- `PLAYER_DISCONNECTED` 조기 종료는 결과 DB 저장과 주간 Redis 랭킹 갱신을 수행하지 않는다.

#### Response: 정상 종료

| 필드 | 타입 | 설명                                      |
| --- | --- |-----------------------------------------|
| `type` | String | `"CONTRIBUTION_GAME_END"` 고정            |
| `gameSessionId` | UUID | 현재 게임 세션 ID                             |
| `serverTime` | Long | 서버 응답 생성 시각                             |
| `isSuccess` | Boolean | 정상 종료 여부                                |
| `reason` | String | 종료 사유 (`GAME_COMPLETED`)                |
| `rankings` | Array | 최종 순위 목록                                |
| `rankings[].rank` | Integer | 최종 순위                                   |
| `rankings[].playerId` | UUID | 플레이어 ID. 고양이라면 null                               |
| `rankings[].nickname` | String | 플레이어 닉네임. 고양이는 [CAT] 으로 고정.             |
| `rankings[].contribution` | Integer | 최종 기여도 (%)                              |
| `winnerVideoTarget` | UUID | 탈출 영상 대상 플레이어 ID (1등). 고양이가 1등이라면 null. |

```json
{
  "type": "CONTRIBUTION_GAME_END",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567895000,
  "isSuccess": true,
  "reason": "GAME_COMPLETED",
  "rankings": [
    { "rank": 1, "playerId": "550e8400-e29b-41d4-a716-446655440000", "nickname": "dobby",  "contribution": 40 },
    { "rank": 2, "playerId": "661f9511-f30c-52e5-b827-557766551111", "nickname": "alice",  "contribution": 35 },
    { "rank": 3, "playerId": "772e0622-f41d-43f6-a938-668877662222", "nickname": "bob",    "contribution": 25 },
    { "rank": 4, "playerId": "883e1733-a52e-44f7-b049-779988773333", "nickname": "carol",  "contribution": 10  },
    { "rank": 5, "playerId": null, "nickname": "[CAT]", "contribution": 5 }
  ],
  "winnerVideoTarget": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response: 플레이어 이탈로 인한 조기 종료

기여도 뺏기는 남은 플레이어 수가 1명 이하가 되면 서버가 강제 종료한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"CONTRIBUTION_GAME_END"` 고정 |
| `gameSessionId` | UUID | 게임 세션 ID |
| `serverTime` | Long | 서버 기준 이벤트 발생 시간 |
| `isSuccess` | Boolean | `false` 고정 |
| `reason` | String | `"PLAYER_DISCONNECTED"` 고정 |

```json
{
  "type": "CONTRIBUTION_GAME_END",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567895000,
  "isSuccess": false,
  "reason": "PLAYER_DISCONNECTED"
}
```

---

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

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"TIME_ATTACK_MINIGAME_CLEAR"` 고정 |

#### Response: 대기 공격 있음

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

---

## 7. 협력 모드

### 7-1. COOP_ROUND_REVEAL

> V3 변경: `revealEndsAt` → `revealStartsAt`. `gameSessionId`, `serverTime` 추가. `commands` 배열 항목 필드명 변경.

> V4 변경: `isReset` 추가. `commandOrder` 범위 `1~20` → `1~4` 수정.

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}/coop`
- 설명: 라운드 최초 시작 및 리셋 후 재공개 시 서버 자동 전송. 4개 명령어와 순서를 전체에게 3초 공개한다.
  공개 종료 후 서버가 자동으로 각 플레이어에게 `COOP_ROUND_ASSIGN`을 유니캐스트한다.

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_ROUND_REVEAL"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `round` | Integer | 현재 라운드 번호 (1~5) |
| `isReset` | Boolean | 리셋 후 재공개 여부. 최초 공개는 `false` |
| `revealStartsAt` | Long | 공개 시작 타임스탬프 (서버 기준 절대 시간) |
| `commands` | Array | 순서 포함 명령어 목록 |
| `commands[].commandOrder` | Integer | 입력 순서 (1~4) |
| `commands[].commandText` | String | 명령어 텍스트 |

> `revealStartsAt`은 서버 기준 절대 시간. 클라이언트는 `revealStartsAt - 현재시간`으로 남은 공개 시간을 계산.

> `isReset: true`인 경우 사이렌 효과를 끄고 재공개 화면으로 전환. `isReset: false`인 경우 일반 라운드 시작 화면으로 전환.

```json
{
  "type": "COOP_ROUND_REVEAL",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567891000,
  "round": 2,
  "isReset": false,
  "revealStartsAt": 1714567893000,
  "commands": [
    { "commandOrder": 1, "commandText": "git checkout -b feature/login" },
    { "commandOrder": 2, "commandText": "git add ." },
    { "commandOrder": 3, "commandText": "git commit -m 'feat: login'" },
    { "commandOrder": 4, "commandText": "git push origin feature/login" }
  ]
}
```

---

### 7-2. COOP_ROUND_ASSIGN

> V3 변경: `wrongPlayerNickname`, `gameSessionId`, `serverTime` 추가.

- 서버 자동 유니캐스트 (공개 단계 종료 후 플레이어별 개별 전송)
- 구독: `/user/queue/private`
- 설명: 플레이어마다 배정된 명령어 1개만 포함된다. `isReset: true`인 경우 이전과 다른 명령어가 배정될 수 있다.

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_ROUND_ASSIGN"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `round` | Integer | 현재 라운드 번호 |
| `isReset` | Boolean | 리셋 후 재배정 여부 |
| `myCommandText` | String | 배정된 명령어 텍스트 |
| `wrongPlayerNickname` | String | 틀린 플레이어의 닉네임 (`isReset: false`인 경우 null) |

```json
{
  "type": "COOP_ROUND_ASSIGN",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567894000,
  "round": 2,
  "isReset": true,
  "myCommandText": "git commit -m 'feat: login'",
  "wrongPlayerNickname": "dobby"
}
```

---

### 7-3. COOP_INPUT

- 발행: `/app/room/{roomId}/coop/input`
- 설명: 자신의 차례라고 판단한 플레이어가 명령어를 입력. 한 번에 1명씩 순서대로 처리.

#### Request

> V3 변경: `playerId` 제거, `requestId` 추가.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"COOP_INPUT"` 고정 |
| `requestId` | UUID | Y | 요청-응답 매칭용 클라이언트 요청 ID |
| `inputText` | String | Y | 입력한 명령어 텍스트 |

```json
{
  "type": "COOP_INPUT",
  "requestId": "8f6a75e0-23f5-4a4f-a9bc-0f6e6dd4fbf1",
  "inputText": "git commit -m 'feat: login'"
}
```

#### Response: 오타인 경우 (본인만)

> V3 변경: `COOP_TYPO` → `COOP_INPUT_WRONG`. `gameSessionId`, `serverTime`, `requestId` 추가.

- 경로: `/user/queue/private`
- 설명: 본인 차례는 맞으나 명령어 텍스트가 틀린 경우. 리셋 없이 재입력 가능.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_INPUT_WRONG"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `requestId` | UUID | 요청-응답 매칭용 클라이언트 요청 ID |
| `playerId` | UUID | 플레이어 ID |

```json
{
  "type": "COOP_INPUT_WRONG",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567894555,
  "requestId": "8f6a75e0-23f5-4a4f-a9bc-0f6e6dd4fbf1",
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response: 순서 오입력인 경우 (전체)

> V3 변경: `COOP_WRONG_ORDER` → `COOP_ORDER_WRONG`. `gameSessionId`, `serverTime`, `requestId` 추가.

- 경로: `/topic/room/{roomId}/coop`
- 설명: 자신의 차례가 아님에도 입력한 경우. 해당 플레이어가 `COOP_RESET`을 보내기 전까지 모든 플레이어의 입력은 서버에서 무시된다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_ORDER_WRONG"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `requestId` | UUID | 요청-응답 매칭용 클라이언트 요청 ID |
| `resetTargetPlayerId` | UUID | 잘못 입력한 플레이어 ID |
| `nickname` | String | 잘못 입력한 플레이어 닉네임 |

```json
{
  "type": "COOP_ORDER_WRONG",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567895123,
  "requestId": "8f6a75e0-23f5-4a4f-a9bc-0f6e6dd4fbf1",
  "resetTargetPlayerId": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "dobby"
}
```

#### Response: 정답인 경우 (전체)

> V3 변경: `COOP_INPUT_RESULT` → `COOP_INPUT_CORRECT`. `gameSessionId`, `serverTime`, `requestId` 추가.

> V4 변경: `round`, `stepInRound` 추가.

- 경로: `/topic/room/{roomId}/coop`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_INPUT_CORRECT"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `requestId` | UUID | 요청-응답 매칭용 클라이언트 요청 ID |
| `sequence` | Integer | 전체 게임 기준 완료된 입력 순서 (1~20, 라운드당 4개 × 5라운드) |
| `round` | Integer | 현재 라운드 번호 (1~5) |
| `stepInRound` | Integer | 라운드 내 완료된 명령어 순서 (1~4) |
| `isRoundComplete` | Boolean | 라운드 완료 여부 |

> 프론트는 `round` + `stepInRound` 기준으로 그래프 노드 점등 처리. `sequence`는 전체 진행도 표시용으로 사용.

```json
{
  "type": "COOP_INPUT_CORRECT",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567894789,
  "requestId": "8f6a75e0-23f5-4a4f-a9bc-0f6e6dd4fbf1",
  "sequence": 6,
  "round": 2,
  "stepInRound": 2,
  "isRoundComplete": false
}
```

#### 에러

- 응답 경로: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `GAME_ALREADY_ENDED` | 이미 종료된 게임에 입력 |
| `INPUT_BLOCKED` | `COOP_ORDER_WRONG` 상태로 입력 차단 중 |
| `LOCK_ACQUISITION_FAILED` | 분산 락 획득 타임아웃 (동시 입력 충돌, 재시도 가능) |
| `LOCK_INTERRUPTED` | 락 대기 중 스레드 인터럽트 발생 |

---

### 7-4. COOP_RESET

- 발행: `/app/room/{roomId}/coop/reset`
- 설명: `COOP_ORDER_WRONG` 수신 후 해당 플레이어(`resetTargetPlayerId` 일치)만 전송 가능.
  서버는 `inputText == "git reset"` 검증 후 처리.

#### Request

> V3 변경: `playerId` 제거, `requestId` 추가.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | Y | `"COOP_RESET"` 고정 |
| `requestId` | UUID | Y | 요청-응답 매칭용 클라이언트 요청 ID |
| `inputText` | String | Y | 입력한 명령어 텍스트 (`"git reset"` 고정) |

```json
{
  "type": "COOP_RESET",
  "requestId": "cfe7d4f9-61f5-43e8-b536-0e12df1c1b57",
  "inputText": "git reset"
}
```

#### Response: 오타인 경우 (본인만)

> V3 신규 추가.

- 경로: `/user/queue/private`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_RESET_WRONG"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `requestId` | UUID | 요청-응답 매칭용 클라이언트 요청 ID |
| `playerId` | UUID | 플레이어 ID |

```json
{
  "type": "COOP_RESET_WRONG",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567895333,
  "requestId": "cfe7d4f9-61f5-43e8-b536-0e12df1c1b57",
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response: 성공한 경우

> `COOP_ROUND_REVEAL` (`isReset: true`, 동일 라운드) → `COOP_ROUND_ASSIGN` (`isReset: true`, 재배정) 순서로 자동 전송. 각 이벤트 상세는 7-1, 7-2 섹션 참조.

#### 에러

- 응답 경로: `/user/queue/private`

| 코드 | 설명 |
| --- | --- |
| `NOT_RESET_PLAYER` | git reset을 입력해야 하는 플레이어가 아님 |
| `RESET_NOT_REQUIRED` | 현재 리셋 대기 상태가 아님 |
| `GAME_ALREADY_ENDED` | 이미 종료된 게임에 reset 입력 |
| `LOCK_ACQUISITION_FAILED` | 분산 락 획득 타임아웃 (재시도 가능) |
| `LOCK_INTERRUPTED` | 락 대기 중 스레드 인터럽트 발생 |

---

### 7-5. COOP_GAME_END

> V3 변경: `gameSessionId`, `serverTime`, `reason` 추가. `results` 배열에 `ranking` 추가. 성공/실패 구조 통일.

- 서버 자동 브로드캐스트
- 구독: `/topic/room/{roomId}/coop`
- 설명: 5라운드 완료 또는 플레이어 이탈(disconnect) 시 서버 자동 브로드캐스트.

**랭킹 기준**:
1. `elapsedTime` 오름차순
2. 오타 총 수 오름차순 (`wrongTypeCount + wrongOrderCount`)
- 공동 순위를 허용한다 (예: `1, 2, 3, 4` 또는 `1, 1, 1, 4`).

#### Response: 성공 (5라운드 완료)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_GAME_END"` 고정 |
| `gameSessionId` | UUID | 현재 게임 세션 ID |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `isSuccess` | Boolean | `true` 고정 |
| `reason` | String | `"GAME_COMPLETED"` 고정 |
| `elapsedTime` | Integer | 소요 시간 (ms) |
| `results` | Array | 팀원별 결과 목록 |
| `results[].playerId` | UUID | 플레이어 ID |
| `results[].nickname` | String | 플레이어 닉네임 |
| `results[].wrongTypeCount` | Integer | 오타 횟수 |
| `results[].wrongOrderCount` | Integer | 순서 오입력 횟수 |
| `results[].ranking` | Integer | 등수 |

```json
{
  "type": "COOP_GAME_END",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567999999,
  "isSuccess": true,
  "reason": "GAME_COMPLETED",
  "elapsedTime": 213,
  "results": [
    { "playerId": "550e8400-e29b-41d4-a716-446655440000", "nickname": "dobby",  "wrongTypeCount": 1, "wrongOrderCount": 0, "ranking": 1 },
    { "playerId": "661f9511-f30c-52e5-b827-557766551111", "nickname": "alice",  "wrongTypeCount": 2, "wrongOrderCount": 1, "ranking": 1 },
    { "playerId": "772g0622-g41d-63f6-c938-668877662222", "nickname": "bob",    "wrongTypeCount": 0, "wrongOrderCount": 2, "ranking": 1 },
    { "playerId": "883h1733-h52e-74g7-d049-779988773333", "nickname": "carol",  "wrongTypeCount": 3, "wrongOrderCount": 1, "ranking": 4 }
  ]
}
```

#### Response: 실패 (플레이어 이탈)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `type` | String | `"COOP_GAME_END"` 고정 |
| `gameSessionId` | UUID \| null | 게임 세션 ID. 게임 초기화(100ms) 전 이탈 시 `null` 가능 |
| `serverTime` | Long | 서버 응답 생성 시각 |
| `isSuccess` | Boolean | `false` 고정 |
| `reason` | String | `"PLAYER_DISCONNECTED"` 고정 |

```json
{
  "type": "COOP_GAME_END",
  "gameSessionId": "7b25b5a8-df79-4b45-a0ee-76f6b9f7e9a1",
  "serverTime": 1714567905000,
  "isSuccess": false,
  "reason": "PLAYER_DISCONNECTED"
}
```

---

## 8. V2 → V3 변경사항 요약

| 섹션 | 변경 내용 |
| --- | --- |
| 공통 에러코드 | `UNAUTHORIZED`, `INVALID_REQUEST` 추가 |
| 4-0 (신규) | `ROOM_STATE` 재연결 상태 동기화 이벤트 추가 |
| 4-1 READY_UPDATE | Request에서 `playerId` 제거. Request에서 `nickname` 제거. 에러에 `ROOM_IN_GAME`, `PLAYER_NOT_IN_ROOM`, `HOST_ALWAYS_READY` 추가 |
| 4-2 GAME_START | Request에서 `playerId` 제거. 각 모드 시작 응답에 `serverTime`, `gameSessionId`, `players` 추가. 기여도에 `initialBranch`, `fallDurationMs` 추가. 기여도 command set은 현재 방 인원수와 일치하는 `player_count`로 엄격 조회 |
| 4-3 KICK | 발행(Request) 없음 — REST API 처리로 이전. `KICKED.roomId` 타입 UUID→Long |
| 4-4 LEAVE | 발행(Request) 없음 — REST API 처리로 이전. `playerId`→`leftPlayerId`, `nickname`→`leftPlayerNickname` |
| 4-5 PLAYER_JOINED | `roomState` 필드 추가 |
| 4-6 HOST_TRANSFER_REQUEST | Request에서 `currentHostId` 제거. 에러에 `ROOM_NOT_FOUND` 추가 |
| 4-7 (신규) | `ROOM_INFO_UPDATED` 방 정보 수정 브로드캐스트 이벤트 추가 |
| 4-9 CHAT | Request에서 `playerId` 제거. 에러에 `MESSAGE_TOO_LONG`, `MESSAGE_EMPTY` 추가 |
| 5-1 CONTRIBUTION_INPUT | 발행 경로 `/input`→`/commands`. Request 구조 변경 (`requestId`, `gameSessionId`, 일반 명령어용 `commandSequence` 추가, `playerId` 제거). switch/checkout은 commandSet 밖 자유 입력으로 처리. `BRANCH_MOVE`→`POSITION_UPDATE`. `CONTRIBUTION_INPUT_RESULT`→`CONTRIBUTION_INPUT_FAILED`. `progress` Integer→Object. 에러코드 정비 |
| 5-2 COMMAND_EXPIRED | 프론트 바닥 도달 기반 `COMMAND_EXPIRE_REQUEST` 추가. 서버 자동 만료 스케줄 제거. `gameSessionId`, `serverTime` 추가. `progress` Integer→Object |
| 5-3 CONTRIBUTION_GAME_END | `gameSessionId`, `serverTime`, `isSuccess`, `reason` 추가. 이탈 종료 케이스 추가. 정상 종료 시 CAT 제외 결과 DB 저장 및 주간 Redis 랭킹 갱신 |
| 7-1 COOP_ROUND_REVEAL | `revealEndsAt`→`revealStartsAt`. `gameSessionId`, `serverTime` 추가. commands 항목 필드명 변경 |
| 7-2 COOP_ROUND_ASSIGN | `wrongPlayerNickname`, `gameSessionId`, `serverTime` 추가 |
| 7-3 COOP_INPUT | Request에서 `playerId` 제거, `requestId` 추가. `COOP_TYPO`→`COOP_INPUT_WRONG`. `COOP_WRONG_ORDER`→`COOP_ORDER_WRONG`. `COOP_INPUT_RESULT`→`COOP_INPUT_CORRECT`. 각 응답에 `gameSessionId`, `serverTime`, `requestId` 추가 |
| 7-4 COOP_RESET | Request에서 `playerId` 제거, `requestId` 추가. 오타 응답 `COOP_RESET_WRONG` 신규 추가 |
| 7-5 COOP_GAME_END | `gameSessionId`, `serverTime`, `reason` 추가. `results`에 `ranking` 추가. 실패 응답에 `gameSessionId`, `serverTime` 추가 |

---

## 9. V3 → V4 변경사항 요약

| 섹션 | 변경 내용 |
| --- | --- |
| 4-2 GAME_START (협력 응답) | `startGraphPicture` 제거 → `graphData` (viewBox / nodes / edges 구조) 추가. 프론트가 받은 데이터로 SVG 직접 렌더링. |
| 7-1 COOP_ROUND_REVEAL | `isReset` 필드 추가. `commandOrder` 범위 `1~20` → `1~4` 수정. |
| 7-3 COOP_INPUT (정답 응답) | `COOP_INPUT_CORRECT`에 `round`, `stepInRound` 추가. 프론트가 라운드/스텝 기준으로 그래프 노드 점등 처리. |
