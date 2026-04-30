# Let's Git it WebSocket 명세 (STOMP Protocol)

## 📡 연결 정보

| 항목 | 내용 |
|------|------|
| URL | ws://localhost:8080/ws |
| 프로토콜 | STOMP |
| 라이브러리 | SockJS |
| 연결 시점 | 방 입장 확정 시 |
| 해제 시점 | 방 완전 이탈 / 홈으로 이동 시 |

> ⚠️ 싱글 모드는 WebSocket 미사용. REST API로만 처리.

---

## 📋 공통 Player 객체

멤버 정보가 포함되는 모든 이벤트에서 아래 형식을 공통으로 사용합니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| playerId | UUID | 플레이어 고유 ID |
| nickname | String | 닉네임 |
| asset | Array | 캐릭터/꾸미기 정보 JSON 배열 |
| isReady | Boolean | 준비 여부 |
| isHost | Boolean | 방장 여부 |

**예시**

    {
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "asset": [],
      "isReady": false,
      "isHost": false
    }

---

## 📋 Type 목록

### Request Type (클라이언트 → 서버)

| Type | 설명 | 적용 모드 |
|------|------|-----------|
| READY | 준비 상태 변경 | 멀티 공통 |
| GAME_START | 게임 시작 (방장만) | 멀티 공통 |
| KICK_REQUEST | 강퇴 요청 (방장만) | 멀티 공통 |
| LEAVE | 방 나가기 | 멀티 공통 |
| CHAT | 채팅 | 멀티 공통 |
| CONTRIBUTION_INPUT | 명령어 입력 | 기여도 뺏기 |
| COMMAND_EXPIRED | 명령어 바닥 도달 알림 | 기여도 뺏기 |
| TIME_INPUT | 명령어 입력 | 타임어택 |
| MINIGAME_RESULT | 미니게임 결과 | 타임어택 |
| COOP_INPUT | 협력 명령어 입력 | 협력 |
| COOP_RESET | 리셋 명령어 입력 | 협력 |

### Response Type (서버 → 클라이언트)

| Type | 설명 | 적용 모드 |
|------|------|-----------|
| PLAYER_JOINED | 플레이어 입장 | 멀티 공통 |
| PLAYER_LEFT | 플레이어 퇴장 | 멀티 공통 |
| PLAYER_KICKED | 플레이어 강퇴 (나머지한테) | 멀티 공통 |
| KICKED | 강퇴 당한 본인 알림 | 멀티 공통 |
| HOST_CHANGED | 방장 변경 | 멀티 공통 |
| READY_CHANGED | 준비 상태 변경 | 멀티 공통 |
| CHAT_MESSAGE | 채팅 메시지 | 멀티 공통 |
| GAME_END | 게임 종료 | 멀티 공통 |
| CONTRIBUTION_STARTED | 기여도 뺏기 게임 시작 | 기여도 뺏기 |
| COMMAND_SPAWN | 명령어 낙하 | 기여도 뺏기 |
| CONTRIBUTION_INPUT_RESULT | 입력 결과 | 기여도 뺏기 |
| SCORE_UPDATE | 기여도 업데이트 | 기여도 뺏기 |
| TIME_STARTED | 타임어택 게임 시작 | 타임어택 |
| TIME_INPUT_RESULT | 입력 결과 | 타임어택 |
| MINIGAME_START | 미니게임 시작 | 타임어택 |
| TIMEATTACK_STATE | 타임어택 상태 | 타임어택 |
| COOP_STARTED | 협력 게임 시작 | 협력 |
| COOP_INPUT_RESULT | 협력 입력 결과 | 협력 |
| COOP_WRONG | 협력 오입력 | 협력 |
| COOP_NEXT_ROUND | 다음 라운드 명령어 | 협력 |
| ERROR | 에러 | 공통 |

---

## 📂 경로 목록

### 구독 경로 (서버 → 클라이언트)

| 경로 | 설명 | 구독 시점 |
|------|------|-----------|
| /topic/room/{roomId} | 대기실 전체 브로드캐스트 | 방 입장 시 |
| /topic/room/{roomId}/contribution | 기여도 뺏기 게임 이벤트 | 게임 시작 시 |
| /topic/room/{roomId}/time | 타임어택 게임 이벤트 | 게임 시작 시 |
| /topic/room/{roomId}/coop | 협력 게임 이벤트 | 게임 시작 시 |
| /queue/private | 개인 메시지 (강퇴, 에러, 알림) | 방 입장 시 |

### 발행 경로 (클라이언트 → 서버)

| 경로 | 설명 |
|------|------|
| /app/room/{roomId}/ready | 준비 상태 변경 |
| /app/room/{roomId}/start | 게임 시작 |
| /app/room/{roomId}/kick | 강퇴 요청 |
| /app/room/{roomId}/leave | 방 나가기 |
| /app/room/{roomId}/chat | 채팅 |
| /app/room/{roomId}/contribution/input | 기여도 뺏기 명령어 입력 |
| /app/room/{roomId}/contribution/expired | 명령어 바닥 도달 알림 |
| /app/room/{roomId}/time/input | 타임어택 명령어 입력 |
| /app/room/{roomId}/time/minigame | 타임어택 미니게임 결과 |
| /app/room/{roomId}/coop/input | 협력 명령어 입력 |
| /app/room/{roomId}/coop/reset | 협력 리셋 명령어 |

---

## 🏠 공통 이벤트 (대기실)

### READY | 준비 상태 변경

**발행**: /app/room/{roomId}/ready  
**구독**: /topic/room/{roomId}

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "READY" 고정 |
| playerId | UUID | Y | 플레이어 ID |
| nickname | String | Y | 플레이어 닉네임 |
| isReady | Boolean | Y | 준비 여부 |

    {
      "type": "READY",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "isReady": true
    }

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "READY_CHANGED" 고정 |
| playerId | UUID | 준비 상태 변경한 플레이어 ID |
| nickname | String | 준비 상태 변경한 플레이어 닉네임 |
| isReady | Boolean | 준비 여부 |
| allReady | Boolean | 전원 준비 완료 여부 |

    {
      "type": "READY_CHANGED",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "isReady": true,
      "allReady": false
    }

**에러 코드**

| 코드 | 설명 |
|------|------|
| ROOM_NOT_FOUND | 방이 존재하지 않음 |
| GAME_ALREADY_STARTED | 이미 게임 시작됨 |

---

### GAME_START | 게임 시작

**발행**: /app/room/{roomId}/start  
**구독**: /topic/room/{roomId}  
**설명**: 방장만 전송 가능. 서버가 Redis에서 gameMode 확인 후 모드별 Response 전송

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "GAME_START" 고정 |
| playerId | UUID | Y | 방장 ID |

    {
      "type": "GAME_START",
      "playerId": "550e8400-e29b-41d4-a716-446655440000"
    }

**Response - 기여도 뺏기**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "CONTRIBUTION_STARTED" 고정 |
| startAt | Long | 게임 시작 타임스탬프 |
| commandSetId | Integer | 데이터셋 번호 (1~3) |
| commandSet | Array | 명령어 세트 목록 |

    {
      "type": "CONTRIBUTION_STARTED",
      "startAt": 1714567890000,
      "commandSetId": 2,
      "commandSet": [
        {
          "commandSequence": 0,
          "text": "git commit -m 'fix'",
          "displayText": "fix login bug",
          "branchId": "main"
        }
      ]
    }

**Response - 타임어택**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "TIME_STARTED" 고정 |
| startAt | Long | 게임 시작 타임스탬프 |
| timeLimit | Integer | 제한 시간 (초) |
| commandSetId | Integer | 데이터셋 번호 (1~3) |
| myCommands | Array | 본인에게 배정된 명령어 목록 |

    {
      "type": "TIME_STARTED",
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

**에러 코드**

| 코드 | 설명 |
|------|------|
| NOT_HOST | 방장이 아님 |
| NOT_ALL_READY | 전원 준비 미완료 |
| NOT_ENOUGH_PLAYERS | 인원 부족 |

---

### KICK_REQUEST | 강퇴 요청

**발행**: /app/room/{roomId}/kick  
**구독 (강퇴 대상)**: /queue/private  
**구독 (나머지 전체)**: /topic/room/{roomId}  
**설명**: 방장만 전송 가능. 서버가 권한 검증 후 처리

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "KICK_REQUEST" 고정 |
| hostId | UUID | Y | 강퇴 요청한 방장 ID |
| targetId | UUID | Y | 강퇴 대상 플레이어 ID |

    {
      "type": "KICK_REQUEST",
      "hostId": "550e8400-e29b-41d4-a716-446655440000",
      "targetId": "661f9511-f30c-52e5-b827-557766551111"
    }

**강퇴 대상 Response** → /queue/private

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "KICKED" 고정 |
| playerId | UUID | 강퇴된 본인 ID |
| roomId | UUID | 강퇴된 방 ID |

    {
      "type": "KICKED",
      "playerId": "661f9511-f30c-52e5-b827-557766551111",
      "roomId": "772g0622-g41d-63f6-c938-668877662222"
    }

**나머지 전체 Response** → /topic/room/{roomId}

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "PLAYER_KICKED" 고정 |
| playerId | UUID | 강퇴된 플레이어 ID |
| nickname | String | 강퇴된 플레이어 닉네임 |
| remainMembers | Array | 강퇴 후 남은 멤버 목록 (Player 객체 배열) |

    {
      "type": "PLAYER_KICKED",
      "playerId": "661f9511-f30c-52e5-b827-557766551111",
      "nickname": "alice",
      "remainMembers": [
        {
          "playerId": "550e8400-e29b-41d4-a716-446655440000",
          "nickname": "dobby",
          "asset": [],
          "isReady": true,
          "isHost": true
        }
      ]
    }

**에러 코드**

| 코드 | 설명 |
|------|------|
| NOT_HOST | 방장이 아님 |
| PLAYER_NOT_FOUND | 대상 플레이어가 방에 없음 |
| SELF_KICK | 자기 자신을 강퇴 시도 |

---

### LEAVE | 방 나가기

**발행**: /app/room/{roomId}/leave  
**구독**: /topic/room/{roomId}  
**설명**: 정상적으로 방을 나갈 때 전송. 비정상 종료(튕김)는 서버가 SessionDisconnectEvent로 감지

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "LEAVE" 고정 |
| playerId | UUID | Y | 나가는 플레이어 ID |

    {
      "type": "LEAVE",
      "playerId": "550e8400-e29b-41d4-a716-446655440000"
    }

**Response (방장이 아닌 경우)** → /topic/room/{roomId}

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "PLAYER_LEFT" 고정 |
| playerId | UUID | 나간 플레이어 ID |
| nickname | String | 나간 플레이어 닉네임 |
| remainMembers | Array | 퇴장 후 남은 멤버 목록 (Player 객체 배열) |

**Response (방장이 나간 경우)** → /topic/room/{roomId}

방장 퇴장 시 PLAYER_LEFT → HOST_CHANGED 순서대로 전송

**Response (인원 0명이 된 경우)**

별도 브로드캐스트 없음. 서버가 Redis에서 방 정보 삭제 처리

---

### CHAT | 채팅

**발행**: /app/room/{roomId}/chat  
**구독**: /topic/room/{roomId}

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "CHAT" 고정 |
| playerId | UUID | Y | 플레이어 ID |
| nickname | String | Y | 플레이어 닉네임 |
| message | String | Y | 채팅 내용 |

    {
      "type": "CHAT",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "message": "ㄱㄱ"
    }

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "CHAT_MESSAGE" 고정 |
| playerId | UUID | 채팅 보낸 플레이어 ID |
| nickname | String | 채팅 보낸 플레이어 닉네임 |
| message | String | 채팅 내용 |
| sentAt | Long | 전송 시각 타임스탬프 |

    {
      "type": "CHAT_MESSAGE",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby",
      "message": "ㄱㄱ",
      "sentAt": 1714567890000
    }

---

## 🏎️ 기여도 뺏기 모드

### CONTRIBUTION_INPUT | 명령어 입력

**발행**: /app/room/{roomId}/contribution/input  
**구독**: /topic/room/{roomId}/contribution

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "CONTRIBUTION_INPUT" 고정 |
| playerId | UUID | Y | 플레이어 ID |
| inputText | String | Y | 입력한 텍스트 |

    {
      "type": "CONTRIBUTION_INPUT",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "inputText": "git commit -m \"feat: 로그인\""
    }

**Response 1: checkout 성공** → /topic/room/{roomId}/contribution (브로드캐스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "POSITION_UPDATE" 고정 |
| playerId | UUID | 이동한 플레이어 ID |
| branch | String | 이동한 브랜치명 |

    {
      "type": "POSITION_UPDATE",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "branch": "feature/login"
    }

**Response 2: 오류** → /queue/private (유니캐스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "CONTRIBUTION_INPUT_RESULT" 고정 |
| playerId | UUID | 플레이어 ID |
| isCorrect | Boolean | false 고정 |
| errorCode | String | (Optional) "INVALID_BRANCH" 또는 생략 |

    {
      "type": "CONTRIBUTION_INPUT_RESULT",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "isCorrect": false,
      "errorCode": "INVALID_BRANCH"
    }

**Response 3: 일반 명령어 맞힌 경우** → /topic/room/{roomId}/contribution (브로드캐스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "SCORE_UPDATE" 고정 |
| commandSequence | Integer | 방금 완료된 명령어 seq |
| winnerId | UUID | 해당 명령어를 맞힌 플레이어 ID |
| scores | Array | 전체 플레이어 현황 |
| progress | Integer | 전체 진행도 (%) |

    {
      "type": "SCORE_UPDATE",
      "commandSequence": 5,
      "winnerId": "550e8400-e29b-41d4-a716-446655440000",
      "scores": [
        {
          "playerId": "550e8400-e29b-41d4-a716-446655440000",
          "nickname": "dobby",
          "contribution": 40,
          "rank": 1
        }
      ],
      "progress": 60
    }

**에러 코드**

| 코드 | 설명 |
|------|------|
| GAME_NOT_STARTED | 게임이 시작되지 않음 |
| INVALID_BRANCH | 존재하지 않는 브랜치 (checkout 실패) |
| INVALID_COMMAND | 존재하지 않는 명령어 seq |

---

### COMMAND_EXPIRED | 명령어 바닥 도달

**발행**: /app/room/{roomId}/contribution/expired  
**설명**: 프론트 타이머 기준으로 명령어가 바닥에 닿았을 때 전송

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "COMMAND_EXPIRED" 고정 |
| playerId | UUID | Y | 플레이어 ID |
| commandSequence | Integer | Y | 바닥에 닿은 명령어 seq |

    {
      "type": "COMMAND_EXPIRED",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "commandSequence": 6
    }

**Response** → /topic/room/{roomId}/contribution (브로드캐스트)

SCORE_UPDATE 형식과 동일

---

### GAME_END | 기여도 뺏기 종료

**구독**: /topic/room/{roomId}/contribution  
**설명**: CONTRIBUTION_INPUT 또는 COMMAND_EXPIRED 처리 시 commandSequence == totalCommandCount 이면 서버가 자동 브로드캐스트

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "GAME_END" 고정 |
| rankings | Array | 최종 순위 목록 |
| winnerVideoTarget | UUID | 탈출 영상 대상 플레이어 ID (1등) |

    {
      "type": "GAME_END",
      "rankings": [
        {
          "rank": 1,
          "playerId": "550e8400-e29b-41d4-a716-446655440000",
          "nickname": "dobby",
          "contribution": 40
        }
      ],
      "winnerVideoTarget": "550e8400-e29b-41d4-a716-446655440000"
    }

---

## ⏱️ 타임어택 모드

### TIME_ATTACK_INPUT | 명령어 입력

**발행**: /app/room/{roomId}/time-attack/input  
**구독**: /topic/room/{roomId}/time-attack

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "TIME_ATTACK_INPUT" 고정 |
| playerId | UUID | Y | 플레이어 ID |
| inputText | String | Y | 입력한 텍스트 |

    {
      "type": "TIME_ATTACK_INPUT",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "inputText": "git push origin feature/login"
    }

**Response - 틀린 경우** → /queue/private (유니캐스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "TIME_ATTACK_INPUT_RESULT" 고정 |
| playerId | UUID | 플레이어 ID |
| isCorrect | Boolean | false 고정 |

**Response - 맞힌 경우** → /topic/room/{roomId}/time-attack (브로드캐스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "TIME_ATTACK_INPUT_RESULT" 고정 |
| playerId | UUID | 입력한 플레이어 ID |
| slotIndex | Integer | 변경된 슬롯 index |
| isCorrect | Boolean | true 고정 |
| totalCount | Integer | 해당 플레이어의 총 명령어 수 |
| clearedSlotIndex | Integer | 맞힌 명령어 슬롯 index |
| nextCommandText | String | 해당 슬롯에 채워넣을 새로운 명령어 |

    {
      "type": "TIME_ATTACK_INPUT_RESULT",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "slotIndex": 2,
      "isCorrect": true,
      "totalCount": 8,
      "clearedSlotIndex": 2,
      "nextCommandText": "git commit -m \"feat\""
    }

---

### TIME_ATTACK_MINIGAME_START | 미니게임 시작

**구독**: /queue/private (유니캐스트)

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "TIME_ATTACK_MINIGAME_START" 고정 |
| keySequence | Array | 방향키 배열 |
| keyCount | Integer | 방향키 총 개수 (pushCount × 2) |
| queueCount | Integer | 현재 대기 중인 추가 공격 수 |

    {
      "type": "TIME_ATTACK_MINIGAME_START",
      "keySequence": ["←", "→", "↑", "←", "↓", "→"],
      "keyCount": 6,
      "queueCount": 0
    }

---

### MINIGAME_RESULT | 미니게임 결과

**발행**: /app/room/{roomId}/time-attack/minigame  
**구독**: /queue/private

> 미니게임 실패는 프론트에서 자체적으로 처음부터 재시작 (서버 통신 없음)  
> 미니게임 성공 시에만 서버에 전송

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "TIME_ATTACK_MINIGAME_RESULT" 고정 |
| playerId | UUID | Y | 방어자(B) ID |
| nickname | String | Y | 방어자(B) 닉네임 |

    {
      "type": "TIME_ATTACK_MINIGAME_RESULT",
      "playerId": "661f9511-f30c-52e5-b827-557766551111",
      "nickname": "alice"
    }

**Response - 큐 비어있을 때** → /queue/private (유니캐스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "TIME_ATTACK_MINIGAME_CLEAR" 고정 |
| playerId | UUID | 방어자(B) ID |
| nickname | String | 방어자(B) 닉네임 |
| message | String | 안내 메시지 |

**Response - 큐에 공격이 남아있을 때** → /queue/private (유니캐스트)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "TIME_ATTACK_MINIGAME_START" 고정 |
| attackerNickname | String | 공격자(A) 닉네임 |
| keySequence | Array | 방향키 배열 |
| keyCount | Integer | 방향키 총 개수 |
| queueCount | Integer | 아직 남은 대기 공격 수 |

---

### GAME_END | 타임어택 종료

**구독**: /topic/room/{roomId}/time-attack  
**설명**: 제한 시간 종료 시 서버가 자동 브로드캐스트

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "GAME_END" 고정 |
| winner | Object | 승자 플레이어 정보 |
| result | Array | 플레이어별 최종 결과 |

    {
      "type": "GAME_END",
      "winner": {
        "playerId": "550e8400-e29b-41d4-a716-446655440000",
        "nickname": "dobby"
      },
      "result": [
        {
          "playerId": "550e8400-e29b-41d4-a716-446655440000",
          "nickname": "dobby",
          "totalCount": 24
        }
      ]
    }

---

## 🤝 협력 게임 모드

### COOP_STARTED | 게임 시작 알림

**구독**: /topic/room/{roomId}/coop  
**설명**: GAME_START 처리 직후 서버 자동 전송. 게임 전체에 걸쳐 1회만 전송

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "COOP_STARTED" 고정 |
| startAt | Long | 게임 시작 타임스탬프 (서버 기준 절대 시간) |
| totalRounds | Integer | 총 라운드 수 (5 고정) |

    {
      "type": "COOP_STARTED",
      "startAt": 1714567890000,
      "totalRounds": 5
    }

---

### COOP_ROUND_REVEAL | 라운드 명령어 공개

**구독**: /topic/room/{roomId}/coop  
**설명**: 4개 명령어와 순서를 전체에게 3초 공개. revealEndsAt 경과 후 서버가 자동으로 각 플레이어에게 COOP_ROUND_ASSIGN 유니캐스트

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "COOP_ROUND_REVEAL" 고정 |
| round | Integer | 현재 라운드 번호 (1~5) |
| revealEndsAt | Long | 공개 종료 타임스탬프 |
| commands | Array | 순서 포함 명령어 목록 |

    {
      "type": "COOP_ROUND_REVEAL",
      "round": 2,
      "revealEndsAt": 1714567893000,
      "commands": [
        {
          "commandId": 1,
          "commandText": "git checkout -b feature/login"
        }
      ]
    }

---

### COOP_ROUND_ASSIGN | 명령어 배정

**구독**: /queue/private  
**설명**: revealEndsAt 경과 후 서버가 각 플레이어에게 자동 유니캐스트. 배정된 명령어 1개만 포함

**Response**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "COOP_ROUND_ASSIGN" 고정 |
| round | Integer | 현재 라운드 번호 |
| isReset | Boolean | 리셋 후 재배정 여부 |
| myCommand | Object | 배정된 명령어 |

    {
      "type": "COOP_ROUND_ASSIGN",
      "round": 2,
      "isReset": false,
      "myCommand": {
        "commandId": 3,
        "order": 3,
        "commandText": "git commit -m 'feat: login'"
      }
    }

---

### COOP_INPUT | 명령어 입력

**발행**: /app/room/{roomId}/coop/input  
**설명**: 자신의 차례라고 판단한 플레이어가 명령어를 입력

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "COOP_INPUT" 고정 |
| playerId | UUID | Y | 플레이어 ID |
| inputText | String | Y | 입력한 명령어 텍스트 |

    {
      "type": "COOP_INPUT",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "inputText": "git commit -m 'feat: login'"
    }

**Response 1: 오타** → /queue/private (본인만)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "COOP_TYPO" 고정 |
| playerId | UUID | 플레이어 ID |

**Response 2: 순서 오입력** → /topic/room/{roomId}/coop (전체)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "COOP_WRONG_ORDER" 고정 |
| resetTargetPlayerId | UUID | 잘못 입력한 플레이어 ID |
| nickname | String | 잘못 입력한 플레이어 닉네임 |

**Response 3: 정답** → /topic/room/{roomId}/coop (전체)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "COOP_INPUT_RESULT" 고정 |
| sequence | Integer | 완료된 순서 (1~20) |
| isRoundComplete | Boolean | 라운드 완료 여부 |

    {
      "type": "COOP_INPUT_RESULT",
      "sequence": 2,
      "isRoundComplete": false
    }

---

### COOP_RESET | git reset 입력

**발행**: /app/room/{roomId}/coop/reset  
**설명**: COOP_WRONG_ORDER 수신 후 해당 플레이어(resetTargetPlayerId 일치)만 전송 가능

**Request**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | String | Y | "COOP_RESET" 고정 |
| playerId | UUID | Y | git reset을 입력하는 플레이어 ID |
| inputText | String | Y | 입력한 명령어 텍스트 |

    {
      "type": "COOP_RESET",
      "playerId": "550e8400-e29b-41d4-a716-446655440000"
    }

**에러 코드**

| 코드 | 설명 |
|------|------|
| NOT_RESET_PLAYER | git reset을 입력해야 하는 플레이어가 아님 |
| RESET_NOT_REQUIRED | 현재 리셋 대기 상태가 아님 |

---

### GAME_END | 협력 게임 종료

**구독**: /topic/room/{roomId}/coop  
**설명**: 5라운드 완료 또는 플레이어 이탈(disconnect) 시 서버 자동 브로드캐스트

**Response - 성공 (5라운드 완료)**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "GAME_END" 고정 |
| isSuccess | Boolean | true 고정 |
| elapsedTime | Integer | 소요 시간 (초) |
| finalGraph | Object | 완성된 브랜치 형상 |
| rankings | Array | 전체 순위 목록 |

**Response - 실패 (플레이어 이탈)**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | String | "GAME_END" 고정 |
| isSuccess | Boolean | false 고정 |
| reason | String | "PLAYER_DISCONNECTED" 고정 |
| playerId | UUID | 이탈한 플레이어 ID |
| nickname | String | 이탈한 플레이어 닉네임 |

    {
      "type": "GAME_END",
      "isSuccess": false,
      "reason": "PLAYER_DISCONNECTED",
      "playerId": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "dobby"
    }

---

## 📌 주요 개념

### startAt이 필요한 이유

서버 기준 절대 시간으로, 네트워크 지연으로 인한 수신 시간 차이를 보정합니다.

    방장이 GAME_START 보냄
    → 서버가 처리 후 GAME_STARTED 브로드캐스트
    
    A (서울)   → 10ms 후 수신
    B (부산)   → 50ms 후 수신
    C (해외)   → 200ms 후 수신
    
    프론트는 startAt을 받으면
    현재 시간 - startAt = 이미 경과한 시간
    → A가 늦게 받았어도 경과 시간만큼 앞당겨서 렌더링
    → 모든 플레이어가 같은 시점 기준으로 게임 시작

---

## 🔧 Redis 키 패턴

### 기여도 뺏기

    contribution:{roomId}:{playerId}:currentBranch
    contribution:{roomId}:branch:{branchName}:commands

### 타임어택

    timeattack:{roomId}:{playerId}:commandSet
    timeattack:{roomId}:{playerId}:queue
    timeattack:{roomId}:{playerId}:slots
    timeattack:{roomId}:{playerId}:totalCount
    timeattack:{roomId}:{playerId}:pushCount
    timeattack:{roomId}:{playerId}:isInMinigame
    timeattack:{roomId}:{playerId}:attackQueue

### 협력

    coop:{roomId}:round
    coop:{roomId}:currentOrder
    coop:{roomId}:completedCount
    coop:{roomId}:isWaitingReset
    coop:{roomId}:resetTargetPlayerId

---

**이 명세서는 Let's Git it 프로젝트의 WebSocket 통신을 정의합니다. 모든 백엔드 개발자는 이 명세를 준수하여 일관된 게임 플로우를 구현해야 합니다.**