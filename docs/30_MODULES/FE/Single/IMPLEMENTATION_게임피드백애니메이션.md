# Single_IMPLEMENTATION_게임피드백애니메이션

## Background / Context

싱글 모드 게임의 시각적 피드백을 강화하는 작업.  
기존 아이템 시스템은 성공 시 랜덤 드롭 → 슬롯 채움 구조였으나, 노드가 미리 아이템 노드처럼 보이지 않아 "어떤 노드를 맞추면 아이템을 얻는다"는 예측이 불가능했다.  
추가로 성공/실패 여부가 타이핑 화면 외에 시각적으로 명확히 드러나지 않는 문제가 있었다.

**이번 작업 범위**
1. 아이템 드롭을 세션 시작 시 사전 배정 (Pre-scheduled drop)
2. 아이템 노드 시각 구분
3. 아이템 획득·사용 애니메이션 (HUD pop, StashOverlay, CherryPickOverlay, RestoreOverlay)
4. Stash 명령어 성공 시 조기 종료
5. 오타·Miss 시 화면(Phaser 씬) 흔들림
6. 명령어 성공 시 노드 폭발 + 녹색 링 애니메이션

---

## Decision

### 1. 사전 드롭 배정 (`singleStore.ts`)

세션 시작 시(`setSession`) 모든 명령어에 대해 한 번에 드롭 여부와 종류를 결정한다.

```ts
const ITEM_DROP_RATE: Record<Difficulty, number> = { EASY: 0.4, NORMAL: 0.3, HARD: 0.2 };
const ITEM_TYPES: ItemType[] = ['stash', 'cherry-pick', 'restore'];

function assignItemDrops(commands: Command[], difficulty: Difficulty): Command[] {
  const rate = ITEM_DROP_RATE[difficulty];
  return commands.map((cmd) => {
    if (Math.random() < rate) {
      return { ...cmd, itemDrop: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)] };
    }
    return cmd;
  });
}
```

`Command` 타입에 `itemDrop?: ItemType` 필드가 추가됐다.  
튜토리얼 모드이거나 difficulty가 null이면 `assignItemDrops`를 호출하지 않는다.

**기존 방식 대비 변경점**:
| | 기존 | 변경 후 |
|--|------|---------|
| 드롭 시점 | `command:complete` 시 랜덤 결정 | 세션 시작 시 사전 배정 |
| 노드 표시 | 일반 노드와 동일 | 아이템 노드는 시각적으로 다름 |
| Miss 시 | 드롭 X | 드롭 X (동일) |
| 슬롯 가득 찼을 때 | 드롭 없음 | 노드는 아이템 노드로 보이지만 획득 안 됨 |

### 2. `useSingleGame` 드롭 처리 변경

기존 랜덤 드롭 로직 제거. `handleComplete`에서 `completedCmd.itemDrop`을 확인해 획득 처리한다.

```ts
const completedCmd = useSingleStore.getState().commandSet[index];
if (completedCmd?.itemDrop) {
  const slotIndex = ITEM_SLOT_MAP.indexOf(completedCmd.itemDrop) as 0 | 1 | 2;
  if (slotIndex !== -1 && !itemSlotsRef[slotIndex]) {
    itemSlotsRef[slotIndex] = true;
    setItemSlots([itemSlotsRef[0], itemSlotsRef[1], itemSlotsRef[2]]);
    EventBus.emit('item:acquired', { slot: slotIndex });
  }
}
```

슬롯이 이미 채워져 있으면 `item:acquired`를 emit하지 않는다 (노드는 아이템 노드로 보이지만 획득 없음).  
Miss 경로는 `handleComplete`를 거치지 않으므로 자동으로 드롭 없음.

### 3. 아이템 노드 시각 구분 (`BranchLane.ts`)

`buildNode(text, itemDrop?)` 시그니처 변경. `itemDrop`이 있을 때 다른 스타일을 적용한다.

| | 일반 노드 | 아이템 노드 |
|--|---------|-----------|
| 배경 | 반투명 글로우 + 어두운 원 | 브랜치 색상 완전 채움 |
| 테두리 | 브랜치 색상 | 흰색 (0.9 alpha) |
| 글로우 | 작음 (GLOW_ALPHA 0.2) | 강함 (GLOW_RADIUS+4, alpha 0.5) |
| 아이콘 | 없음 | 원 중심에 아이콘 텍스트 (`≡` / `◆` / `♥`) |
| pulse 트윈 | 없음 | 없음 |

```ts
private static readonly ITEM_ICONS: Record<string, string> = {
  stash: '≡',
  'cherry-pick': '◆',
  restore: '♥',
};
```

### 4. HUD 아이템 획득 팝 애니메이션 (`HUDItemSlots.tsx`)

`item:acquired` 이벤트 수신 시 해당 슬롯 버튼에 `animate-item-pop` 재생.  
`key={`i-${popKeys[i]}`}` 패턴으로 매번 remount → 애니메이션 재시작.

```ts
const [popKeys, setPopKeys] = useState<[number, number, number]>([0, 0, 0]);

// item:acquired handler
setPopKeys((prev) => {
  const next = [...prev] as [number, number, number];
  next[slot] += 1;
  return next;
});
```

```css
@keyframes item-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.4); }
  65%  { transform: scale(0.9); }
  82%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

### 5. StashOverlay (`StashOverlay.tsx`)

`item:use { slot: 0 }` 수신 시 반투명 파란 오버레이 + "STASH!" 텍스트를 표시하고, `stash:end` 수신 시 숨긴다. SingleScene이 stash의 source of truth이며 StashOverlay는 자체 setTimeout 없이 이벤트만 구독한다.

```ts
useEffect(() => {
  const handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }) => {
    if (slot !== 0) return;
    setActive(true);
    setActiveCount((c) => c + 1);
  };

  const handleEnd = () => {
    setActive(false);
  };

  EventBus.on('item:use', handleItemUse);
  EventBus.on('stash:end', handleEnd);
  return () => {
    EventBus.off('item:use', handleItemUse);
    EventBus.off('stash:end', handleEnd);
  };
}, []);
```

**SingleScene 연동**: SingleScene이 모든 stash 종료 지점에서 `stash:end`를 emit한다.
- `time.delayedCall(5000, ...)` 콜백에서 자연 만료 시
- `handleCommandComplete`에서 명령어 성공으로 조기 종료 시 (`stashTimeoutId.remove()` + `tweens.resumeAll()` + `timerEvent.paused = false`)
- `handleGameEnd` / `shutdown`에서 게임 종료·씬 정리 시

**"STASH!" 쾅 애니메이션**: `key={activeCount}`로 매 발동 시 remount → `animate-stash-bang` 재실행.

```css
@keyframes stash-bang {
  0%   { transform: scale(3.5); opacity: 0; }
  35%  { opacity: 1; }
  65%  { transform: scale(0.88); }
  80%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

### 6. CherryPickOverlay (`CherryPickOverlay.tsx`)

`item:use { slot: 1 }` 수신 시 🐾 발바닥이 stamp → fade 단계로 애니메이션을 재생하고, `cherry-pick:end` 수신 시 사라진다.

```
phase: null → 'stamp'(550ms setTimeout) → 'fade' → (cherry-pick:end) → null
```

stamp→fade 전환은 짧은 시각 cue라 setTimeout으로 유지하되, 최종 사라짐(`phase=null`)은 SingleScene의 `cherry-pick:end` 이벤트로 동기화한다. ESC 일시정지 중에도 SingleScene 타이머가 함께 멈추므로 🐾 사라짐 시점이 실제 cherry-pick 완료와 일치한다.

**SingleScene 연동**: `handleItemUse` slot 1에서 `time.delayedCall(CHERRY_PICK_ANIM_MS, ...)` 콜백이 `command:complete`(React state)와 `cherry-pick:end`(오버레이 동기화)를 함께 emit한다. `handleGameEnd` / `shutdown`에서도 cherry-pick 활성 중이면 `cherry-pick:end`를 emit해 정리한다.

```ts
// src/features/single/constants/itemAnimations.ts
export const CHERRY_PICK_ANIM_MS = 800;
```

```ts
// CherryPickOverlay.tsx
useEffect(() => {
  let stampTimer: ReturnType<typeof setTimeout> | undefined;

  const handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }) => {
    if (slot !== 1) return;
    clearTimeout(stampTimer);
    setPhase('stamp');
    stampTimer = setTimeout(() => setPhase('fade'), STAMP_MS);
  };

  const handleEnd = () => {
    clearTimeout(stampTimer);
    setPhase(null);
  };

  EventBus.on('item:use', handleItemUse);
  EventBus.on('cherry-pick:end', handleEnd);
  return () => {
    EventBus.off('item:use', handleItemUse);
    EventBus.off('cherry-pick:end', handleEnd);
    clearTimeout(stampTimer);
  };
}, []);
```

```css
@keyframes paw-stamp {
  0%   { transform: scale(4) translateY(-40px); opacity: 0; }
  20%  { opacity: 1; }
  70%  { transform: scale(1.15) translateY(0); }
  80%  { transform: scale(0.82) translateY(0); }
  90%  { transform: scale(1.04) translateY(0); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes paw-fade {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
```

### 7. RestoreOverlay (`RestoreOverlay.tsx`)

`item:use { slot: 2 }` 수신 시 ♥가 확대되며 페이드아웃하는 힐링 아우라를 700ms 재생한다.  
`key={animKey}` 패턴으로 매번 remount.

```css
@keyframes restore-heal {
  0%   { transform: scale(0.6); opacity: 0.9; }
  60%  { opacity: 0.5; }
  100% { transform: scale(3.5); opacity: 0; }
}
```

**Restore `item:use` emit 누락 수정**: 기존 `useSingleGame`의 restore 처리에서 `EventBus.emit('item:use', { slot: 2 })`가 누락되어 RestoreOverlay가 반응하지 않았다. emit을 추가해 수정.

**타이머 관리**: 초기 구현에서 `setTimeout()` 반환값을 변수에 저장하지 않아 clear가 불가능했다. 연속 사용 시 이전 타이머가 남아 `setVisible(false)`가 겹쳐 호출되는 문제가 있었다.

```ts
useEffect(() => {
  let t: ReturnType<typeof setTimeout> | undefined;

  const handler = ({ slot }: { slot: 0 | 1 | 2 }) => {
    if (slot !== 2) return;
    clearTimeout(t);  // 연속 사용 시 이전 타이머 취소
    setVisible(true);
    setAnimKey((k) => k + 1);
    t = setTimeout(() => setVisible(false), 700);
  };

  EventBus.on('item:use', handler);
  return () => {
    EventBus.off('item:use', handler);
    clearTimeout(t);  // unmount 시 잔여 타이머 정리
  };
}, []);
```

### 8. 오버레이 마운트 위치

세 오버레이 모두 `containerRef` div(Phaser 씬 컨테이너) 안에 `absolute inset-0`으로 마운트된다.  
Phaser의 `tweens.pauseAll()`은 CSS 트랜지션/애니메이션에 영향을 주지 않으므로 stash 중에도 오버레이 애니메이션이 정상 재생된다.

### 9. 현재 캐릭터 조회 공통화 (`shared/hooks/useCurrentCharacterAsset.ts`)

싱글 화면에서 탈출 애니메이션과 플레이어 캐릭터는 모두 현재 로그인한 사용자의 캐릭터 외형 데이터를 필요로 한다.  
이 데이터는 수정용 `mypage` 로직과 분리된 읽기 전용 조회이므로 `shared` 레이어로 공통화했다.

- `shared/types/user.types.ts`에 `CharacterAsset` 공통 타입을 둔다.
- `shared/hooks/useCurrentCharacterAsset.ts`에서 `GET /api/v1/members/me`를 조회하고 Zod로 검증한다.
- `EscapeAnimation.tsx`와 `PlayerCharacter.tsx`는 직접 `http.get`을 호출하지 않고 이 훅만 사용한다.
- 캐릭터 수정, 닉네임 수정, 탈퇴와 같은 mutation 로직은 그대로 `features/mypage`에 남긴다.

```ts
// shared/hooks/useCurrentCharacterAsset.ts
export function useCurrentCharacterAsset() {
  return useQuery({
    queryKey: ['member', 'me', 'character'],
    queryFn: async (): Promise<CharacterAsset> => {
      const { data } = await http.get('/api/v1/members/me');
      const parsed = currentCharacterResponseSchema.parse(data);
      return parsed.data;
    },
  });
}
```

**EscapeAnimation API 실패 시 ResultModal 블로킹 방지**

`useCurrentCharacterAsset` 쿼리가 실패하면 `asset`이 영구적으로 `undefined`가 된다.  
`EscapeAnimation`은 `if (!asset) return null`로 빈 렌더를 반환하고, `onComplete`가 절대 호출되지 않아 `GameEndScreen`이 escape phase에 머무른 채 `ResultModal`을 영원히 표시하지 않는 블로킹 상태가 된다.

흐름: `GameEndFlowInner` → `GameEndScreen`(escape phase) → `EscapeAnimation.onComplete` → video phase → `onVideoEnd` → `ResultModal`

`isError` 상태를 추가로 구독하고, API 실패 시 즉시 `onComplete`를 호출해 다음 단계로 넘어가도록 처리한다.

```ts
// EscapeAnimation.tsx
const { data: asset, isError } = useCurrentCharacterAsset();

useEffect(() => {
  if (!isError) return;
  onComplete?.();
}, [isError, onComplete]);

if (!asset) return null;
```

### 9. EventBus 신규 이벤트

```ts
// EventBus.ts EventMap에 추가
'item:acquired': { slot: 0 | 1 | 2 };
'command:wrong': void;
'stash:end': void;          // StashOverlay 동기화
'cherry-pick:end': void;    // CherryPickOverlay 동기화
```

### 10. 오타·Miss 화면 흔들림 (`command:wrong`)

**emit 시점**:
- `useCommandInput` 오타 경로 (Enter 입력, 텍스트 불일치)
- `useCommandInput` handleMiss (command:miss 수신 시)

**적용 대상**: `containerRef` div (Phaser 씬 영역만 흔들림, HUD·입력창 고정).  
부모 div(`overflow-hidden`)가 translateX 초과분을 클리핑하므로 스크롤이 생기지 않는다.

```tsx
// SingleGameContent.tsx
const [shaking, setShaking] = useState(false);

const triggerShake = useCallback(() => {
  setShaking(false);
  setTimeout(() => setShaking(true), 0); // 이미 흔들리는 중이면 재시작
}, []);

// containerRef div
<div
  ref={containerRef}
  className={`relative overflow-hidden ${shaking ? 'animate-screen-shake' : ''}`}
  onAnimationEnd={() => setShaking(false)}
>
```

```css
@keyframes screen-shake {
  0%   { transform: translateX(0); }
  15%  { transform: translateX(-10px); }
  30%  { transform: translateX(9px); }
  45%  { transform: translateX(-7px); }
  60%  { transform: translateX(5px); }
  75%  { transform: translateX(-3px); }
  90%  { transform: translateX(2px); }
  100% { transform: translateX(0); }
}
/* duration: 350ms ease-out */
```

### 11. 명령어 성공 노드 애니메이션 (`BranchLane.ts`)

`clearCommand()` 대신 `flashSuccess()`를 호출해 즉시 제거가 아닌 폭발 연출 후 소멸시킨다.  
`SingleScene.handleCommandComplete`에서 호출.

```ts
flashSuccess(): void {
  // fallTween 정지
  // 노드 참조 분리 (commandNode = null → clearCommand 중복 방지)

  // 녹색 링: 노드 위치에 Graphics 생성, scaleX/Y 2.8배 확장 + fade (380ms)
  ring.setPosition(this.laneWidth / 2, nodeY);
  ring.lineStyle(3, 0x4ade80, 0.9);
  ring.strokeCircle(0, 0, NODE.RADIUS);

  // 노드 폭발: scale 1 → 1.5 + alpha 0 (260ms)
  tweens.add({ targets: node, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 260 });
}
```

Graphics scale 트윈의 기준점은 Graphics 객체의 position이다.  
`ring.setPosition(laneWidth/2, nodeY)` 후 `strokeCircle(0, 0, r)`로 그리면 확장이 노드 중심에서 방사된다.

아이템 노드·일반 노드 모두 동일한 `flashSuccess`가 적용된다.  
cherry-pick 자동 완료도 `command:complete`를 emit하므로 동일하게 재생된다.

---

## Why

### 드롭을 세션 시작 시 사전 배정하는 이유

사전 배정이어야 낙하 중인 노드가 아이템 노드처럼 보일 수 있다.  
실시간 랜덤 결정 방식에서는 "노드를 맞추면 아이템을 얻는다"는 사전 정보가 없어 아이템 노드 시각화 자체가 의미가 없다.

### StashOverlay를 React/CSS로 구현하는 이유

stash 중 Phaser의 `tweens.pauseAll()`이 호출되어 있다.  
Phaser 기반 오버레이는 트윈이 멈추면 애니메이션도 함께 멈춘다.  
React CSS 애니메이션은 Phaser 타임라인과 독립적이므로 stash 중에도 정상 재생된다.

### Stash 종료를 SingleScene이 source of truth로 두는 이유

이전 구현은 `StashOverlay`가 자체 `setTimeout`(브라우저 실시간)으로 5초를 측정하고 SingleScene이 별도 setTimeout으로 같은 5초를 측정하는 이중 타이머 구조였다. ESC 일시정지 중 SingleScene 타이머는 멈추지만 StashOverlay 쪽은 계속 흘러 STASH! 텍스트만 먼저 사라지는 동기화 깨짐이 발생했다.

수정안: SingleScene이 모든 stash/cherry-pick 종료 지점에서 `stash:end` / `cherry-pick:end`를 emit하고, 오버레이는 이 이벤트만 구독한다. ESC 일시정지 → SingleScene 타이머 정지 → 이벤트 emit 시점도 함께 지연 → 오버레이 사라짐 시점이 실제 효과 종료와 일치한다.

### CherryPickOverlay와 SingleScene이 상수를 공유하는 이유

cherry-pick 사용 시 React가 800ms 동안 발바닥 애니메이션을 재생하고, Phaser는 800ms 후 `command:complete`를 emit해 낙하를 재개한다.  
이 두 타이밍이 어긋나면 애니메이션이 끝나기 전에 노드가 사라지거나 반대로 노드가 멈춰있는 채로 대기하는 문제가 생긴다.  
`CHERRY_PICK_ANIM_MS` 상수를 단일 소스로 공유해 타이밍 불일치를 구조적으로 방지한다.

### 화면 전체가 아닌 Phaser 씬만 흔드는 이유

전체 화면을 흔들면 HUD·입력창도 함께 이동해 입력 중 불편하다.  
또한 outer div에 `translateX`를 적용하면 부모에 `overflow: hidden`이 없어 스크롤이 생긴다.  
Phaser 씬 컨테이너(`containerRef`)만 흔들면 부모의 `overflow: hidden`이 클리핑을 담당하고, HUD·입력창은 고정 상태를 유지한다.

### `setTimeout(() => setShaking(true), 0)` 재시작 트릭

`setShaking(false)` → `setShaking(true)`를 동일 렌더 사이클에서 호출하면 React가 배치 업데이트해 false 상태가 DOM에 반영되지 않는다.  
`setTimeout(..., 0)`으로 다음 태스크 큐로 분리하면 false 렌더 → true 렌더가 별도로 발생해 CSS 애니메이션이 재시작된다.

### `flashSuccess`에서 `commandNode`를 null로 먼저 설정하는 이유

폭발 트윈이 진행 중일 때 `clearCommand()`가 외부에서 호출되면 `commandNode`를 다시 destroy하려고 시도한다.  
먼저 `this.commandNode = null`로 참조를 해제해두면, 이후 `clearCommand()` 호출이 이미 null인 노드를 무시하므로 중복 destroy가 발생하지 않는다.

---

## Caution

- **아이템 노드이지만 슬롯이 가득 찬 경우**: 노드는 아이템 노드처럼 보이지만 맞춰도 아이템을 획득하지 못한다. `item:acquired`가 emit되지 않으므로 HUD pop 애니메이션도 없다.
- **Miss 시 아이템 미획득**: `handleComplete`를 거치지 않으므로 `itemDrop`이 있는 노드를 miss해도 아이템이 지급되지 않는다.
- **cherry-pick 사용 시 아이템 드롭 발생 가능**: cherry-pick 완료도 `command:complete` → `handleComplete` 체인을 타므로 해당 명령어에 `itemDrop`이 설정되어 있으면 아이템을 획득할 수 있다.
- **Stash 중 오타 시 stash 유지**: `command:wrong`은 stash를 종료시키지 않는다. `command:complete`(성공)일 때만 조기 종료된다.
- **Stash 중복 발동 불가**: `stashTimeoutId !== null`이면 새 stash가 무시된다. 시간 초기화 없음.
- **`flashSuccess` 후 `clearCommand` 안전**: `commandNode = null`로 먼저 해제하므로 외부에서 `clearCommand`를 호출해도 중복 destroy가 발생하지 않는다.
- **애니메이션 CSS 등록 위치**: 모든 keyframe은 `src/index.css`에, theme 변수(`--animate-*`)는 `@theme` 블록에 등록되어 있다. Tailwind v4는 `@theme`의 `--animate-*` 변수를 `animate-*` 유틸리티 클래스로 자동 매핑한다.

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `src/core/bridge/EventBus.ts` | `item:acquired`, `command:wrong`, `stash:end`, `cherry-pick:end` 이벤트 추가 |
| `src/features/single/types/single.types.ts` | `Command.itemDrop?: ItemType` 필드 추가 |
| `src/features/single/store/singleStore.ts` | `assignItemDrops()` 추가, `setSession`에서 호출 |
| `src/features/single/hooks/useSingleGame.ts` | 사전 배정 드롭 처리, `item:acquired` emit, restore `item:use` emit 추가 |
| `src/features/single/hooks/useCommandInput.ts` | 오타·miss 시 `command:wrong` emit |
| `src/features/single/scenes/BranchLane.ts` | `buildNode` itemDrop 시각화, `flashSuccess()` 추가 |
| `src/features/single/scenes/SingleScene.ts` | `cherryPickTimeoutId`, stash 조기 종료, `flashSuccess()` 호출 |
| `src/features/single/components/SingleGameContent.tsx` | screen shake 상태·핸들러, containerRef에 shake 클래스 |
| `src/features/single/components/HUDItemSlots.tsx` | `item:acquired` 팝 애니메이션 |
| `src/features/single/components/StashOverlay.tsx` | 신규 생성 |
| `src/features/single/components/CherryPickOverlay.tsx` | 신규 생성 → 타이머 ID 클로저 관리로 누수 수정 |
| `src/features/single/components/RestoreOverlay.tsx` | 신규 생성 → 타이머 ID 클로저 관리로 누수 수정 |
| `src/features/single/components/EscapeAnimation.tsx` | `isError` 구독 추가 → API 실패 시 `onComplete` 즉시 호출 |
| `src/features/single/constants/itemAnimations.ts` | `CHERRY_PICK_ANIM_MS = 800` 신규 생성 |
| `src/index.css` | keyframe 5종 추가 (`restore-heal`, `stash-bang`, `paw-stamp`, `paw-fade`, `item-pop`, `screen-shake`) |

---

## Test Plan

- 세션 시작 후 낙하하는 노드 중 일부가 아이템 노드(색상 채움 + 아이콘)로 표시되는지 확인
- 아이템 노드 성공 → HUD 해당 슬롯에 팝 애니메이션 + 슬롯 채워짐 확인
- 슬롯이 가득 찬 상태에서 아이템 노드 성공 → 팝 없음, 슬롯 변화 없음 확인
- 아이템 노드 miss → 아이템 미획득 확인
- Alt+1 (stash): "STASH!" 쾅 애니메이션 표시, 5초 후 자동 종료, Phaser 낙하 재개 확인
- Stash 중 ESC 일시정지 → STASH! 텍스트 유지 + 노드 정지 유지, 이어하기 시 잔여 시간 후 자동 종료 확인 (오버레이가 SingleScene과 동기화)
- Stash 중 명령어 성공 → 5초 전 stash 즉시 종료(`stash:end` emit), 낙하 재개 확인
- Stash 중 오타 → stash 유지 확인
- Alt+2 (cherry-pick): 🐾 발바닥 stamp → fade 재생 확인, 800ms 후 Phaser 자동 완료 확인
- Cherry-pick 중 ESC 일시정지 → 노드 정지 유지, 이어하기 시 잔여 시간 후 자동 완료 확인
- Alt+2 연속 사용 시 이전 애니메이션이 중단되고 새 애니메이션으로 재시작되는지 확인 (타이머 중첩 없음)
- Alt+3 (restore): ♥ 힐링 아우라 700ms 재생 확인
- Alt+3 연속 사용 시 애니메이션 중첩 없이 재시작되는지 확인
- DevTools Network에서 `GET /api/v1/members/me` 차단 후 SUCCESS/ESCAPE_FAILED 게임 종료 → ResultModal이 정상 표시되는지 확인 (EscapeAnimation isError fallback)
- 오타 입력 시 Phaser 씬만 흔들림, HUD·입력창 고정 확인, 스크롤 없음 확인
- Miss 시 Phaser 씬 흔들림 확인
- 명령어 성공 시 노드 폭발(scale up + fade) + 녹색 링 방사 확인
- game:restart 후 오버레이·애니메이션 정상 초기화 확인
