# IMPLEMENTATION_INGAME — 기여도 뺏기 인게임 화면

## Background / Context

기여도 뺏기 게임의 인게임 화면을 구현했다. 게임 스펙상 다음을 만족해야 한다.

1. 플레이어 N명이 동시에 같은 명령어 셋을 타이핑하고, **먼저 친 사람이 그 명령어의 기여도를 가져간다**
2. 시간 안에 아무도 못 치면 **miss**로 누적, 미스 기여도가 별도로 표시된다
3. 각 플레이어는 `git switch`로 브랜치를 자유롭게 이동, 자기 캐릭터가 해당 레인 하단에 표시된다
4. 레인 수 = 플레이어 수 + 1, 처음부터 전체 visible (싱글의 CREATE 명령어와 달리 순차 공개 없음)
5. 명령어는 한 번에 하나씩이 아니라 **인원수 비례로 미리 다음 명령어가 등장**해야 빠른 입력감을 유지 (싱글 HARD 모드의 60% look-ahead 패턴 참고)

BE WebSocket이 아직 연동되지 않은 상태라, 인게임 UI 전체를 실 동작으로 검증할 수단도 함께 필요했다.

---

## Decision

### 1. 명령어 큐 + Look-ahead Chain Spawn — `ContributionScene` / `ContributionLane`

`ContributionLane`이 단일 노드가 아닌 `commandNodes: Container[]` 큐를 관리한다. `showCommand`는 큐 끝에 push, `flashSuccess`/`flashMiss`는 head를 shift. 같은 레인에 여러 명령어가 동시에 떨어져도 충돌 없음.

`ContributionScene`은 `lastSpawnedSeq` + `lookAheadTimer`로 spawn을 chain한다.

```ts
private spawnNext(): void {
  if (this.isGameEnded) return;
  const nextSeq = this.lastSpawnedSeq + 1;
  const cmd = this.commandMap.get(nextSeq);
  if (!cmd) return;
  this.lanes.get(cmd.branchName)?.showCommand(cmd.text, DEFAULT_FALL_DURATION_MS, () => {});
  this.lastSpawnedSeq = nextSeq;
  this.scheduleLookAhead();
}

private scheduleLookAhead(): void {
  this.lookAheadTimer?.remove();
  if (this.lastSpawnedSeq + 1 >= this.commandMap.size) return;
  this.lookAheadTimer = this.time.delayedCall(
    DEFAULT_FALL_DURATION_MS * this.spawnRatio,
    () => { this.lookAheadTimer = null; this.spawnNext(); }
  );
}
```

`spawnRatio`는 `utils/spawnRatio.ts`로 분리(컨벤션 4장: 게임 로직은 Scene 안 금지):

```ts
export function calculateLookAheadRatio(numPlayers: number): number {
  return Math.max(0.1, 0.5 - 0.1 * numPlayers);
}
```

- 2명: 0.3 → 직전 명령어가 30% 내려왔을 때 다음 등장
- 3명: 0.2
- 4명: 0.1
- 5명+: 0.1 (clamp)

**SCORE_UPDATE / COMMAND_EXPIRED 수신 시 즉시 spawn 분기**:

```ts
private readonly handleScoreUpdate = ({ commandSequence }): void => {
  const clearedSeq = commandSequence - 1;
  const clearedCmd = this.commandMap.get(clearedSeq);
  if (clearedCmd) this.lanes.get(clearedCmd.branchName)?.flashSuccess();
  // 다음 명령어가 아직 spawn 안 됐으면 (lookahead 전에 사용자가 완료한 경우) 즉시 spawn
  if (clearedSeq === this.lastSpawnedSeq) this.spawnNext();
};
```

`clearedSeq < lastSpawnedSeq`인 경우는 lookahead가 이미 다음 명령어를 띄운 상태라 추가 spawn 안 함.

### 2. 플레이어 캐릭터 오버레이 — `MultiPlayerCharacters` (React)

싱글의 `PlayerCharacter`와 동일하게 Phaser 캔버스 위 React `absolute` 오버레이. 다만 멀티는 한 레인에 여러 명이 있을 수 있어 슬롯 분배가 필요하다.

- 슬롯 인덱스 = `players` 배열 인덱스(서버에서 받은 입장 순서). 모든 클라이언트에서 같은 순서를 보장.
- 위치: `leftPercent = (laneIndex + (slotIndex + 0.5) / numSlots) / totalLanes * 100`
  - 같은 브랜치에 N명이 모이면 가로로 균등 배치, 빈 자리는 유지

내 캐릭터는 `useCurrentCharacterAsset()`(authStore), 다른 플레이어는 `OTHER_PLAYER_FALLBACK_ASSET`(constants/character.ts) 사용. **상태는 store가 단일 source** — `contributionStore.players[].currentBranch`만 읽는다. local state로 복제하지 않음.

### 3. BE 단일 채점 + 사용자 입력 텍스트 큐 — `useContributionInput`

git switch를 포함한 모든 입력을 FE 검증 없이 BE로 publish하고, 응답 종류로 판정한다. `git switch`는 commandSet에 들어오지 않는 단순 브랜치 이동 명령으로만 취급한다(채점 대상 아님).

- `CONTRIBUTION_INPUT_FAILED { errorReason: 'INVALID_BRANCH' | 'WRONG_COMMAND' }` → 오타·잘못된 브랜치
- `POSITION_UPDATE`에서 `playerId === myPlayerId` → 내 브랜치 이동 확정 (useContributionGame이 `branch:switch` bus로 relay)
- `SCORE_UPDATE`에서 `winnerId === myPlayerId` → 정타 확정

history에는 single과 동일하게 사용자가 친 텍스트를 그대로 표시해야 하는데, 비동기 응답 시점에는 inputValue가 이미 비워져 있으므로 submit 시점에 `pendingTextsRef`(ref 큐)에 push하고 응답 시 dequeue한다.

```ts
// 현재 브랜치로의 switch만 FE no-op short-circuit (BE 호출 불필요)
if (isSwitchCommand(trimmed) && parseSwitchTarget(trimmed) === activeBranch) {
  setHistory((prev) => [...prev, { text: trimmed, status: 'switch' }]);
  setInputValue('');
  return;
}
pendingTextsRef.current.push(trimmed);
contributionBus.emit('command:submit', { text: trimmed });
```

status 매핑(single 대응):

- 정타 → `'ok'` (SCORE_UPDATE winnerId=me 시 dequeue)
- switch → `'switch'` (POSITION_UPDATE for me 시 dequeue, 항상 단순 movement)
- 오타 → `'typo'` (INPUT_FAILED WRONG_COMMAND 시 dequeue, 텍스트는 사용자 입력 그대로)
- 잘못된 브랜치 → `'wrong-branch'` (INPUT_FAILED INVALID_BRANCH, 고정 안내 메시지)
- MISS → `'miss'` (COMMAND_EXPIRED)

라운드 종료(SCORE_UPDATE/COMMAND_EXPIRED) 시 큐를 비워 silent drop된 입력의 누적을 방지한다.

### 4. Miss 처리: `scores` 배열의 Sentinel Entry

BE가 `SCORE_UPDATE` / `COMMAND_EXPIRED` / `CONTRIBUTION_GAME_END`의 scores/rankings에 miss 기여도를 별도 entry로 보낸다는 합의(예정). FE는 sentinel `playerId`로 구분.

```ts
// features/contribution/constants/score.ts
export const MISS_SENTINEL_ID = '00000000-0000-4000-8000-000000000000';
export const MISS_SENTINEL_NICKNAME = '고양이';
```

`PlayerRankingList`는 sentinel을 감지해 `MissCatSprite`(cat.png frame 0)로 렌더, 다른 플레이어는 `AnimatedCharacter`로 렌더.

### 5. Mock at WS Transport Layer — `socketManager.simulateIncoming`

WS 미연동 상태에서도 인게임 UI 전체를 실 동작으로 검증하기 위해, **mock 페이로드가 `useContributionGame`의 실 WS 경로(safeParse → bus emit → scene/store)를 그대로 통과**하도록 구성했다.

```ts
// SocketManager.ts (dev 전용 메서드)
simulateIncoming(destination: string, message: object): void {
  for (const sub of this.pendingSubscriptions.values()) {
    if (sub.destination === destination) sub.callback(message);
  }
  for (const sub of this.subscriptions.values()) {
    if (sub.destination === destination) sub.callback(message);
  }
}

enterMockMode(): void { this.mockMode = true; }  // publish silent no-op
```

`dev/useMockContributionWs.ts`가 가짜 서버 역할: `command:submit` 수신 → 입력 검증 → `simulateIncoming('/topic/room/0/contribution', mockScoreUpdate)`. 명령어 타임아웃, 상대방 가로채기, POSITION_UPDATE 주기 발생, 게임 종료까지 시뮬레이션.

WS 연동 시 제거 절차는 [#후속-작업](#후속-작업) 참조.

### 6. `AnimatedCharacter` 확장 — `paused` / `cropTopRatio`

랭킹 카드는 N개 캐릭터를 동시에 표시해야 해서 모든 인스턴스가 `requestAnimationFrame` 루프를 도는 건 CPU 부담. 또 캐릭터 에셋 상단에 빈 픽셀이 있어 카드가 불필요하게 커지는 문제.

```tsx
interface AnimatedCharacterProps {
  ...
  paused?: boolean;       // true면 첫 프레임만 그리고 rAF 안 돌림
  cropTopRatio?: number;  // 상단에서 잘라낼 비율 (0-1)
}
```

- `paused=true` + `cropTopRatio=0.25` → 랭킹 카드용 정적 슬림 캐릭터
- 기본값(`false`, `0`) → 기존 동작 그대로(레인 하단 idle 애니메이션)

---

## Why

### 왜 Look-ahead Chain (vs 명령어 하나씩)

싱글 HARD 모드의 `scheduleNextHardSpawn` 패턴을 그대로 차용했다. 인원이 많을수록 한 명령어를 누군가 차지할 확률이 커서 회전이 빠르다 → 다음 명령어를 더 일찍 띄워야 입력 흐름이 끊기지 않음. 동시에 같은 레인에 N개 노드가 떨어질 수 있어 `ContributionLane`의 큐 지원이 전제 조건이 된다.

### 왜 Mock을 WS 트랜스포트 레이어에 두었나 (vs bus 직접 emit)

초기 구현은 `useMockContributionWs`가 `contributionBus.emit('score:update', ...)`를 직접 호출했다. 문제: **mock과 real이 다른 경로**를 탐.

- real: WS message → `useContributionGame`의 `safeParse()` → `bus.emit('score:update', ...)`
- mock (이전): 페이로드 없이 곧장 bus emit → schema 검증 우회

mock에서 잘 동작하던 코드가 real WS 연결 시 schema 변경/검증 실패로 다르게 동작할 위험이 컸다. `simulateIncoming`을 socketManager에 추가해 mock 페이로드가 **동일한 `useContributionGame` subscribe callback을 통과**하도록 바꾸니, mock 디버깅 중 발견한 schema 호환성 이슈 두 건이 모두 real WS 시점이 아닌 mock 시점에 잡혔다 (예: `MISS_SENTINEL_ID`가 Zod v4 UUID 검증 통과 못 하는 문제).

### 왜 `MISS_SENTINEL_ID`를 v4 UUID 형식으로

Zod v4의 `z.string().uuid()`는 RFC 9562/4122를 준수해 3번째 그룹 첫 글자 `1-8`(version) + 4번째 그룹 첫 글자 `8-b`(variant)를 강제한다. 단순 all-zeros UUID(`'00000000-0000-0000-0000-000000000000'`)는 nil UUID로 별도 허용되지만, `'00000000-0000-0000-0000-000000000001'` 같은 임의 ID는 version 비트가 0이라 검증 실패.

`scores: z.array(ScoreEntrySchema)` 안에서 `playerId: z.string().uuid()`로 검증되므로 sentinel도 유효한 UUID여야 한다. v4 형식(`-4xxx-8xxx-`)으로 두면 BE도 그대로 보낼 수 있고 FE 검증도 통과.

### 왜 store를 단일 truth source로 (vs local state 복제)

초기 구현은 `MultiPlayerCharacters`에 `playerBranches` local state를 두고 `position:update`/`branch:switch` bus event로 갱신했다. 컨벤션 15장의 "TanStack Query 데이터를 store에 복제 금지" 원칙은 store→local에도 동일하게 적용된다. 실제로:

- 내가 `git switch`하면 local state는 즉시 바뀌지만 store는 그대로 → 다른 reader(remount 시 초기화 등)에서 stale 데이터
- `position:update`도 store(`updatePlayerBranch`)와 local 두 곳에 같은 정보 저장

`useContributionGame`이 POSITION_UPDATE 수신 시 store를 갱신 + `MultiPlayerCharacters`는 store만 구독하니 모든 모순 사라짐. `branch:switch` bus는 내 입력 텍스트의 history 반영 + `activeBranchAtom` 동기화 + Phaser 레인 글로우 용도.

### 왜 git switch를 BE 단일 채점으로 (vs FE 클라이언트 검증)

초기 구현은 `useContributionInput`이 `isSwitchCommand` + `branches.includes(target)`로 FE에서 검증하고, 통과 시 store + activeBranch + bus emit을 옵티미스틱 갱신했다. 다음 문제가 있어 BE 단일 채점으로 바꿨다.

- **multiplayer 동기화 누락**: BE에 publish가 안 되니 POSITION_UPDATE가 broadcast되지 않아 다른 플레이어가 내 switch를 보지 못함
- **채점 권한 충돌**: 정답 switch 명령어를 누가 먼저 입력했는지를 BE가 결정해야 하는데 FE가 먼저 처리하면 SCORE_UPDATE를 받을 수 없음
- **검증 로직 중복**: `INVALID_BRANCH` 판정이 FE/BE 양쪽에 존재

모든 입력을 BE로 publish하고 응답으로 판정하니 정합성이 맞고, FE는 `target === activeBranch` no-op short-circuit만 남겼다. 사용자가 입력한 텍스트를 single처럼 그대로 history에 보여주려면 비동기 응답까지 텍스트를 보존해야 해서 `pendingTextsRef` ref 큐를 도입.

### 왜 `AnimatedCharacter`에 prop을 추가 (vs 별도 컴포넌트)

`StaticCharacter`를 따로 만들면 `buildLayerPaths` / `loadImage` / `imageCache` / `ANIMATIONS` / `getSourceX` 등 핵심 로직이 통째로 중복된다. 두 컴포넌트가 분기되면 추후 에셋 포맷 변경(레이어 추가, 프레임 수 변화 등) 시 양쪽을 모두 수정해야 함. 옵션 prop 두 개 추가가 더 적은 코드 + 단일 truth source.

---

## Caution

- **BE 합의 미완료 항목**:
  - `MISS_SENTINEL_ID` 형식 (현재 `00000000-0000-4000-8000-000000000000`) — 그대로 갈지, top-level `missContribution` 필드 등 다른 방식으로 갈지
  - `CONTRIBUTION_STARTED` 페이로드에 다른 플레이어 캐릭터 자산 추가 (현재 `OTHER_PLAYER_FALLBACK_ASSET`으로 통일)
- **`!roomId` 패턴 금지**: `roomId === 0`도 유효한 mock 값이므로 `!roomId`로 falsy 체크하면 mock 세션에서 WS 구독이 동작하지 않음. `roomId == null` 또는 `roomId === undefined` 사용. `useContributionGame.ts`의 subscribe/publish effect에서 모두 적용됨.
- **WaitingRoom → /contribution 핸드오프 미구현**: 팀원 영역. WaitingRoom에서 `CONTRIBUTION_STARTED` 수신 시 `ContributionPage.tsx`의 mock seed useLayoutEffect와 동일한 변환 로직(commandSet → unique branches, initialBranch → 각 플레이어 currentBranch)을 적용한 뒤 `setSession()` + `navigate('/contribution')` 해야 함. 변환 후 페이로드 구조는 `contributionStore.setSession`의 인자 타입 참조.
- **`commandSequence` 의미**:
  - WS payload: 방금 완료된 시퀀스 (서버 기준 cleared)
  - bus event `score:update`/`command:expired`: 다음 시퀀스 (`useContributionGame`에서 `+1` 처리)
  - Scene에서 다시 `-1`로 cleared 추출. 이 변환 규칙은 `useContributionGame.ts:79-87`과 `ContributionScene.handleScoreUpdate`에 흩어져 있어 변경 시 양쪽 모두 확인 필요.
- **switch 명령어 처리**: `git switch`는 commandSet에 들어오지 않는 단순 브랜치 이동 명령(채점 대상 아님). FE는 모든 switch 입력을 BE로 publish하고, BE는 유효 브랜치면 POSITION_UPDATE를, 없는 브랜치면 `CONTRIBUTION_INPUT_FAILED { errorReason: 'INVALID_BRANCH' }`를 응답한다. 예외로 `target === activeBranch`는 FE 로컬 no-op으로 BE 호출 스킵. mock(`useMockContributionWs`)도 동일 분류를 `command:submit` 핸들러 내부에서 시뮬레이션.
- **`gameStatus === 'playing'` 진입 조건**: `useContributionGame`은 `sessionId`가 truthy해질 때만 `setGameStatus('playing')`. mock 모드에서는 `ContributionPage`의 useLayoutEffect가 sessionId를 시드한 후 ContributionGameContent의 useContributionGame 효과가 발화. 실 흐름에서는 WaitingRoom이 `setSession()` 호출 → navigate → ContributionPage 마운트 → useContributionGame 효과 발화 순.
- **Phaser tween 참조는 node.setData('tween', ...)으로 관리**: 노드 destroy 시 Phaser가 tween을 정리. `node.getData('tween')?.stop()` 호출은 destroy 전 안전을 위한 보조.

---

## Test Plan

- `npx tsc --noEmit` / `npx eslint src/` / `npm run build` 통과
- `/contribution` 직접 진입 (mock 활성):
  - 4개 레인(main, feat/login, feat/signup, feat/hotfix) 표시, 모두 visible
  - 3명 캐릭터가 main 레인 하단에 슬롯 0/1/2 위치로 배치
  - 진행도 `0/7`, 경과 시간 즉시 흐름
  - 명령어 `git add .` 정확 입력 → 성공 애니메이션, 진행도 `1/7`, 내 기여도 100%, 히스토리에 입력 텍스트 그대로 `ok` 표시
  - 오타 입력 → 입력 텍스트 그대로 `typo` 표시, 명령어 유지
  - `git switch feat/login` → POSITION_UPDATE 응답 후 내 캐릭터 이동 + 레인 글로우 변경, 히스토리에 입력 텍스트 그대로 `switch` 표시
  - `git switch nonexistent` → `존재하지 않는 브랜치입니다!` 히스토리(`wrong-branch`), 캐릭터 위치 유지
  - 현재 브랜치로의 `git switch <activeBranch>` → BE 호출 없이 히스토리만 추가
  - 10초 미입력 → COMMAND_EXPIRED → miss(고양이) 기여도 증가, 다음 명령어
  - 4-9초 대기 → 상대방 가로채기 SCORE_UPDATE, 해당 상대방 기여도 증가
  - 6초 주기 → 상대방 캐릭터가 랜덤 레인으로 이동
  - sequence 2번, 5번은 2.5초 안에 무조건 miss 처리
  - 7번 명령어 처리 후 CONTRIBUTION_GAME_END → 입력 비활성
- 다른 인원 수 시나리오는 `dev/mockSession.ts`의 `MOCK_CONTRIBUTION_STARTED.players` 배열을 조정해 검증

---

## 후속 작업

### WS 연동 시 제거 절차

1. `FE/src/features/contribution/dev/mockSession.ts` 삭제
2. `FE/src/features/contribution/dev/useMockContributionWs.ts` 삭제
3. `FE/src/features/contribution/dev/` 폴더 삭제 (비어있으면)
4. `ContributionGameContent.tsx`: `import { useMockContributionWs } from '../dev/useMockContributionWs';` 라인 + `useMockContributionWs();` 호출 라인 제거 (각 1줄)
5. `ContributionPage.tsx`: `import { MOCK_CONTRIBUTION_STARTED, MOCK_MY_PLAYER_ID } from '../dev/mockSession';` 제거, `useLayoutEffect` 블록 통째로 제거, `sessionId` 가드 복원:
   ```tsx
   const sessionId = useContributionStore((s) => s.sessionId);
   if (!sessionId) return <준비중 화면>;
   ```
6. `SocketManager.ts`: `mockMode` 필드, `simulateIncoming`, `enterMockMode`, `publish`의 `if (this.mockMode) return;` 제거 (선택 — 다른 mock 환경에서 재사용 여지가 있으면 유지)

### BE 합의 후 변경할 부분

- `MISS_SENTINEL_ID` 값 — BE가 보낼 sentinel 합의 시 `constants/score.ts` 갱신
- `OTHER_PLAYER_FALLBACK_ASSET` 제거 — BE가 `CONTRIBUTION_STARTED.players[]`에 캐릭터 6필드를 포함하기 시작하면 `ContributionPlayer`와 `MultiPlayerCharacters` / `PlayerRankingList`에서 entry의 자산을 직접 사용

### 추후 분리 후보

- nes-progress의 1위 강조 색상은 현재 인라인 `[&::-moz-progress-bar]:!bg-yellow-100` arbitrary variant로 적용. theme 토큰화 또는 nes.css 변수 활용 검토.
- `ContributionLane`의 success ring/miss flash 색(`0x4ade80`, `0xef4444`)은 `NODE` 상수 영역으로 빼는 게 일관성에 좋음.
