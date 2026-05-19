# IMPLEMENTATION_WS연동 — 기여도 뺏기 실 서버 연동

## Background / Context

`IMPLEMENTATION_INGAME.md`는 mock 레이어(`socketManager.simulateIncoming`) 기반의 UI/게임 로직 구현을 다룬다. 이 문서는 그 위에 실 WS 서버를 연결하면서 결정된 **게임 생명주기 관리, 메시지 라우팅, 입력 파이프라인, 결과 흐름** 전반을 기록한다.

관련 TROUBLESHOOTING: `TROUBLESHOOTING_인게임_WS연동_버그수정.md`

---

## Decision

### 1. 게임 생명주기 — `gameStatusAtom` 상태 전이

`gameStatusAtom`(`'idle' | 'playing' | 'ended'`)이 전체 UI의 단일 source of truth다.

```
WaitingRoom 수신 CONTRIBUTION_STARTED
  → contributionStore.setSession()
  → navigate('/contribution')
      ↓
ContributionPage 마운트
  → useContributionGame effect (sessionId 의존)
      → gameStatus = 'idle'       // 카운트다운 표시
      → clientStartAt 타이머 예약
          ↓ (startAt 도달)
      → gameStatus = 'playing'    // 게임 시작
      → contributionBus.emit('game:start')
          ↓ (CONTRIBUTION_GAME_END 수신)
      → gameStatus = 'ended'      // ResultModal 표시
```

`ContributionGameContent.tsx`의 카운트다운 UI:

```ts
// gameStatus === 'idle' && clientStartAt이 있을 때만 타이머 갱신
useEffect(() => {
  if (gameStatus === 'playing' || !clientStartAt) return;
  const id = window.setInterval(() => setNow(Date.now()), 250);
  return () => window.clearInterval(id);
}, [gameStatus, clientStartAt]);

const countdown: number | null = (() => {
  if (gameStatus === 'playing' || !clientStartAt) return null;
  const remaining = Math.ceil((clientStartAt - now) / 1000);
  return remaining > 0 ? remaining : null;
})();
```

`setNow`는 interval callback 안에서만 호출(`react-hooks/set-state-in-effect` 통과). `countdown`은 `now` + `clientStartAt`으로 derived.

### 2. WaitingRoom → ContributionPage 핸드오프

`WaitingRoom.tsx`의 `handleContributionStarted`가 `CONTRIBUTION_STARTED` 메시지를 받아 store를 세팅하고 navigate한다.

**myPlayerId 결정 우선순위** (서버가 memberId를 playerId로 보내기 때문에 세 단계 fallback):

```ts
const myPlayerId =
  message.players.find((p) => p.playerId === myMemberId)?.playerId ||
  currentMembers.find((m) => m.playerId === myMemberId)?.playerId ||
  currentMembers.find((m) => m.nickname === myNickname)?.playerId ||
  null;
```

**branches 결정**: `initialBranch` + commandSet의 모든 `branchName` 합집합(중복 제거). 순서 보장을 위해 `initialBranch`를 먼저 배치한다.

```ts
const branches = [
  ...new Set([
    message.initialBranch,
    ...message.commandSet.map((c) => c.branchName),
  ]),
];
```

**players 매핑**: `CONTRIBUTION_STARTED.players[]`에는 캐릭터 자산이 없으므로 `currentMembers`(WaitingRoom의 roomStore)에서 character 6필드를 JOIN한다. 모든 플레이어의 `currentBranch`는 `initialBranch`로 초기화.

```ts
players: message.players.map((player) => {
  const member = currentMembers.find((m) => m.playerId === player.playerId);
  return {
    playerId: player.playerId,
    nickname: player.nickname,
    currentBranch: message.initialBranch,
    characterHair: member?.characterHair ?? '',
    ...
  };
}),
```

`clientStartAt = Date.now() + (startAt - serverTime)` — 서버 타임스탬프 차이를 클라이언트 wall-clock으로 변환.

### 3. WS 구독 구조 — `useContributionGame`

두 채널을 구독한다.

| 채널 | 키 | 수신 메시지 |
|------|----|-------------|
| `/topic/room/{roomId}/contribution` | `contribution:game:{roomId}` | POSITION_UPDATE, SCORE_UPDATE, COMMAND_EXPIRED, CONTRIBUTION_PLAYER_DISCONNECTED, CONTRIBUTION_GAME_END |
| `/user/queue/private` | `contribution:private` | CONTRIBUTION_INPUT_FAILED, FORCE_DISCONNECT, KICKED, ERROR |

키 네이밍 규칙: 도메인:역할:roomId 형태로 구독을 식별한다. 같은 키로 `subscribe`하면 이전 구독을 대체(socketManager 내부 Map 기반).

**cleanup**: `unsubscribe`만 호출, `disconnect` 호출 금지. socketManager는 전역 공용 자원이며 WaitingRoom이 같은 소켓을 이어쓴다.

**게임 시작 타이머 & 조기 종료 가드**:

```ts
let gameEndedEarly = false;
const unsubGameEnd = contributionBus.subscribe('game:end', () => {
  gameEndedEarly = true;
  if (timerId !== null) { clearTimeout(timerId); timerId = null; }
});

const triggerStart = () => {
  if (gameEndedEarly) return;  // 카운트다운 중 GAME_END 수신 시 playing 전환 차단
  setGameStatus('playing');
  contributionBus.emit('game:start');
};
```

카운트다운 도중 `CONTRIBUTION_GAME_END`가 도착하면 `game:end` 이벤트로 타이머를 즉시 취소해 `gameStatus`가 `'ended'` → `'playing'`으로 덮어씌워지는 것을 막는다.

### 4. 메시지 라우팅 — `contributionSocketHandlers`

`handleContributionGameTopicMessage`가 raw 메시지를 `type` 필드로 분기한다. `CONTRIBUTION_GAME_END`는 두 variant(`isSuccess: true/false`)가 union이라 `discriminatedUnion` 외부에서 별도 처리.

```ts
if (base.data.type === 'CONTRIBUTION_GAME_END') {
  // ContributionGameEndSchema.safeParse → handleContributionGameEnd
}
const result = contributionGameTopicMessageSchema.safeParse(raw);
// discriminatedUnion: POSITION_UPDATE | SCORE_UPDATE | COMMAND_EXPIRED | CONTRIBUTION_PLAYER_DISCONNECTED
```

**각 메시지 핸들러 요약**:

| 메시지 | 핸들러 동작 |
|--------|-------------|
| `POSITION_UPDATE` | `store.updatePlayerBranch(playerId, branch)` + `position:update` bus emit. `playerId === myPlayerId`면 추가로 `branch:switch` emit |
| `SCORE_UPDATE` | scores/progress/currentSeq 갱신 + `score:update` bus emit |
| `COMMAND_EXPIRED` | scores/progress/currentSeq 갱신 + `command:expired` bus emit |
| `CONTRIBUTION_PLAYER_DISCONNECTED` | scores 갱신만 (게임 계속 진행) |
| `CONTRIBUTION_GAME_END` | `setGameResult(msg)` + `setGameStatus('ended')` + `game:end` bus emit |
| `CONTRIBUTION_INPUT_FAILED` | `command:failed` bus emit |
| `FORCE_DISCONNECT` | `socketManager.disconnect()` + `onForceDisconnect()` 콜백 |
| `KICKED` | `socketManager.disconnect()` + `onKicked(roomId)` 콜백 |

`commandSequence` 변환 규칙:

- **서버 payload**: 방금 완료된 명령어 번호 (1-based)
- **bus `score:update` / `command:expired`**: 서버 payload 값 그대로
- **store/ref `currentSeq`**: `msg.commandSequence + 1` (다음 입력 대상)
- **Scene `commandMap.get(seq)`**: bus에서 받은 값(완료된 번호)으로 조회

### 5. contributionBus 이벤트 계약

React/Hook ↔ Phaser Scene 간 통신 전용. `features/contribution` 도메인 안에서만 사용.

| 이벤트 | emit 주체 | 구독 주체 | 목적 |
|--------|-----------|-----------|------|
| `game:start` | `useContributionGame` | `ContributionScene` | 첫 명령어 spawn 트리거 |
| `game:end` | `contributionSocketHandlers` | `ContributionScene`, `useContributionInput`, `useContributionGame` | 노드 정리, 입력 초기화, 타이머 취소 |
| `command:submit` | `useContributionInput` | `useContributionGame` | WS 발행 |
| `command:expire` | `ContributionScene` | `useContributionGame` | COMMAND_EXPIRE_REQUEST WS 발행 |
| `command:failed` | `contributionSocketHandlers` | `ContributionScene`, `useContributionInput` | 화면 흔들림 + history 반영 |
| `score:update` | `contributionSocketHandlers` | `ContributionScene`, `useContributionInput` | flashSuccess + history 반영 |
| `command:expired` | `contributionSocketHandlers` | `ContributionScene`, `useContributionInput` | flashMiss + history 반영 |
| `position:update` | `contributionSocketHandlers` | `ContributionScene` | 다른 플레이어 레인 글로우 이동 |
| `branch:switch` | `contributionSocketHandlers` | `ContributionScene`, `useContributionInput` | 내 레인 글로우 + activeBranch 갱신 |

### 6. 입력 파이프라인 — `useContributionInput`

모든 입력을 BE로 publish하고 응답으로 결과를 판정한다. FE 검증 없음.

**requestId 기반 텍스트 추적**: 입력 시점에는 `inputValue`가 바로 비워지므로, 비동기 응답 시점에 사용자가 친 텍스트를 알 수 없다. submit 시 requestId → text를 `pendingTextsRef`(Map)에 저장하고, 응답 수신 시 requestId로 조회해 history에 표시.

```ts
// submit
const requestId = crypto.randomUUID();
pendingTextsRef.current.set(requestId, trimmed);
contributionBus.emit('command:submit', { text: trimmed, requestId });
setInputValue('');

// 응답
const handleScoreUpdate = ({ winnerId, requestId }) => {
  if (winnerId === myPlayerId) {
    const text = pendingTextsRef.current.get(requestId) ?? '';
    setHistory((prev) => [...prev, { text, status: 'ok' }]);
  }
  pendingTextsRef.current.delete(requestId);
};
```

**history status 매핑**:

| 응답 | status | 텍스트 |
|------|--------|--------|
| `SCORE_UPDATE`, `winnerId === myPlayerId` | `'ok'` | pendingTexts에서 조회 |
| `POSITION_UPDATE`, `playerId === myPlayerId` | `'switch'` | pendingTexts에서 조회 |
| `INPUT_FAILED`, `WRONG_COMMAND` | `'typo'` | pendingTexts에서 조회 |
| `INPUT_FAILED`, `INVALID_BRANCH` | `'wrong-branch'` | 고정 메시지 `'잘못된 브랜치입니다!'` |
| `COMMAND_EXPIRED` | `'miss'` | 고정 메시지 `'MISS!'` |
| `game:end` | — | inputValue·history·pendingTexts 초기화 |

**no-op short-circuit**: 현재 activeBranch로의 `git switch`는 BE 발행 없이 history만 추가.

**COMMAND_EXPIRED 시 pendingTexts 전체 초기화**: 해당 라운드에서 in-flight 상태이던 모든 요청은 더 이상 응답이 오지 않으므로 clear.

### 7. 결과 흐름 — `useResultModal`

`gameStatus === 'ended' && result !== null`일 때 ResultModal이 visible.

**10초 자동 복귀 타이머**:

```ts
useEffect(() => {
  if (!isVisible) return;
  const targetTime = Date.now() + AUTO_RETURN_MS;
  const initId = window.setTimeout(() => setEndsAt(targetTime), 0);  // async setState
  const tickId = window.setInterval(() => setNow(Date.now()), 1000);
  const navId = window.setTimeout(() => { onBackToRoomRef.current(); }, AUTO_RETURN_MS);
  return () => {
    window.clearTimeout(initId);
    window.clearInterval(tickId);
    window.clearTimeout(navId);
  };
}, [isVisible]);
```

`setEndsAt`은 `setTimeout(0)` callback 안에서 호출(`react-hooks/set-state-in-effect` 통과). `onBackToRoomRef`로 stale closure 방지. 사용자가 버튼을 먼저 클릭하면 `isVisible`이 false로 변경 → effect cleanup → 타이머 자동 취소, 이중 발화 없음.

**"메인으로" 클릭 시 leaveRoom 직접 호출**:

```ts
const onHome = () => {
  if (roomId != null) void leaveRoom(roomId).catch(() => {});
  cleanup();  // clearSession() → roomId = null
  void navigate({ to: '/home' });
};
```

`cleanup()` 전에 roomId를 캡처해 직접 호출. `clearSession()` 이후에는 `useRoomExitGuard`의 leave 예약이 취소되기 때문. 상세 원인은 `TROUBLESHOOTING_인게임_WS연동_버그수정.md` Bug 5 참조.

`onBackToRoom()`은 방에 계속 멤버로 남아있으므로 `leaveRoom` 호출 안 함.

### 8. 페이지 레벨 구조 — `ContributionPage`

```tsx
export default function ContributionPage() {
  const roomId = useContributionStore((s) => s.roomId);
  const sessionId = useContributionStore((s) => s.sessionId);
  const clearSession = useContributionStore((s) => s.clearSession);

  useRoomExitGuard({ roomId, reset: clearSession });

  if (!sessionId) return null;

  return (
    <Provider>           {/* Jotai scope 격리 */}
      <ContributionGameContent />
      <ResultModal />
    </Provider>
  );
}
```

`useRoomExitGuard`가 탭 닫기(`pagehide` + keepalive fetch), SPA 언마운트(`setTimeout(leave, 0)`)를 담당. `Jotai Provider`로 scope를 격리해 게임 전용 atom이 다른 페이지로 누출되지 않도록 한다.

---

## Why

### 왜 requestId 기반 텍스트 추적 (vs inputValue 직접 저장)

`command:submit` 시점에 `setInputValue('')`가 호출된다. BE 응답(`SCORE_UPDATE` 등)은 비동기이므로 콜백 실행 시점에 `inputValue`는 이미 빈 문자열이다. 입력 텍스트를 정확히 history에 표시하려면 submit 시점의 값을 별도로 보관해야 한다.

`pendingTextsRef`를 ref로 관리하는 이유: Map에 항목을 추가/삭제해도 리렌더가 필요 없고, history state 업데이트로 충분히 UI가 갱신된다.

### 왜 contributionBus를 Phaser Scene과 React 사이에 두나

`FE_CONVENTION.md §15`의 "Phaser ↔ React 직접 참조 금지" 원칙. Scene은 React를 import할 수 없고, React 컴포넌트는 Phaser Scene 인스턴스를 직접 제어하면 생명주기 불일치 문제가 생긴다. 버스를 경유하면 양쪽 모두 이벤트만 알면 되고 상호 의존성이 없다.

`singleBus`와 동일한 구조를 `contributionBus`로 도메인 분리. 두 모드가 같은 버스를 공유하면 이벤트 이름 충돌 위험이 있음.

### 왜 `gameStatus`를 Jotai atom으로 (vs store)

`gameStatus`는 UI 조건부 렌더링(`ContributionGameContent`, `ResultModal`, `CountdownOverlay`)에 직접 연결되어 빈번하게 변경된다. Zustand selector로도 처리할 수 있으나, Jotai atom은 구독이 세밀하고 Phaser Scene 바깥(React)에서만 사용하는 "UI 상태"의 성격에 맞는다.

반면 `commandSet`, `players`, `branches` 같이 Phaser Scene이 `useContributionStore.getState()`로 직접 읽어야 하는 데이터는 Zustand에 유지한다(`FE_CONVENTION.md §15` — Phaser가 직접 읽는 게임 세션 데이터는 Zustand 예외).

### 왜 countdown을 derived로 계산 (vs useState로 관리)

```ts
// ❌ 이 패턴은 react-hooks/set-state-in-effect를 위반한다
useEffect(() => {
  if (gameStatus !== 'playing') {
    setCountdown(null);  // effect body에서 직접 setState
    return;
  }
  ...
});

// ✅ now를 setState 트리거로, countdown은 derived로
const [now, setNow] = useState(() => Date.now());
useEffect(() => {
  if (gameStatus === 'playing' || !clientStartAt) return;
  const id = window.setInterval(() => setNow(Date.now()), 250);
  return () => window.clearInterval(id);
}, [gameStatus, clientStartAt]);
const countdown = !clientStartAt ? null : Math.max(0, Math.ceil((clientStartAt - now) / 1000));
```

`setNow`는 interval callback(비동기) 안에서만 호출하므로 ESLint 규칙을 통과한다. countdown은 render 시점에 `now`와 `clientStartAt`으로 계산되는 derived 값이다.

---

## Caution

- **`roomId == null` 체크**: `!roomId`는 `roomId === 0`에서 잘못 동작. WS 구독 등 모든 guard는 `roomId == null` 또는 `roomId === undefined` 사용.
- **socketManager.disconnect() 호출 금지**: 게임 hook cleanup에서 호출하면 WaitingRoom 소켓 구독이 파괴됨. `FORCE_DISCONNECT`/`KICKED` 핸들러에서만 호출.
- **`isMe: z.boolean().optional()`**: 서버가 `isMe` 필드를 내려보내지 않으므로 Zod 스키마에서 반드시 `.optional()`. `z.boolean()`으로 바꾸면 `SCORE_UPDATE` 파싱 실패 → 명령어 미삭제 버그 발생.
- **`contributionBus`는 `features/contribution` 안에서만**: cross-feature 버스 import는 아키텍처 경계 위반. 다른 도메인에서 기여도 이벤트가 필요하면 wiring wrapper(`routes/-XxxRoute.tsx`)에서 처리.
- **WaitingRoom reset 타이밍**: `handleContributionStarted`에서 `setSession()` 후 `reset()`(WaitingRoom 상태 초기화)을 호출한다. `reset()` 전에 `setSession()`이 완료돼야 ContributionPage가 `sessionId`를 읽을 수 있다.
- **`CONTRIBUTION_PLAYER_DISCONNECTED` ≠ 게임 종료**: 플레이어 이탈 이벤트는 scores를 갱신만 하고 게임을 끝내지 않는다. 서버가 조건(예: 1명 남음)을 판단해 별도로 `CONTRIBUTION_GAME_END`를 보낸다.

---

## Test Plan

- `npx tsc --noEmit` / `npx eslint src/features/contribution/` 통과
- WS 실 연동 흐름:
  1. 방 생성 → 대기방 입장 → 게임 시작 → `/contribution` 진입 확인
  2. 카운트다운 3초 표시 후 게임 전환 확인
  3. 명령어 정타 → 화면에서 노드 사라짐 + 점수 갱신 확인
  4. 오타 → 화면 흔들림 + history `typo` 표시
  5. `git switch <branch>` → 캐릭터 이동 + 레인 글로우 전환
  6. 명령어 만료(타임아웃) → flashMiss + `MISS!` history
  7. 다른 탭으로 이동 후 복귀 → 명령어 위치가 경과 시간에 맞게 표시됨 확인
  8. 게임 종료 → ResultModal 표시 + 10초 카운트다운 진행 → 자동으로 방으로 이동
  9. ResultModal "메인으로" 클릭 → `/home` 이동 후 로비에서 방이 사라졌는지 확인
  10. 카운트다운 중 상대 이탈 → ResultModal 표시 (게임 화면으로 넘어가지 않음) 확인
