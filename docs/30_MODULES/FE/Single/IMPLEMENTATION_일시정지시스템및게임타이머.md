# Single_IMPLEMENTATION_일시정지시스템및게임타이머

## Background / Context

싱글 모드 인게임 일시정지 시스템 구현 작업 (S14P31A304-130).  
127번 작업에서 `SingleScene`, `BranchLane`, `useSingleGame` 등 핵심 게임 루프가 구현됐으나, ESC 키나 버튼으로 게임을 멈추는 기능이 없었다.  
또한 게임 재시작 시 `BranchLane.ts:115`에서 `TypeError: Cannot read properties of undefined (reading 'add')` 오류가 발생해 재진입이 불가능했다.  
진행도 바에 경과 시간을 함께 표시해달라는 요구도 이 작업에서 함께 반영했다.

---

## Decision

### 1. ESC 단일 리스너 (`useSingleGame`)

ESC 키 처리를 `useSingleGame` 훅의 단일 `keydown` 리스너 한 곳에서만 담당한다.

```ts
const statusRef = useRef(gameStatus);
useEffect(() => { statusRef.current = gameStatus; }, [gameStatus]);

useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (statusRef.current === 'playing') {
      EventBus.emit('game:pause');
    } else if (statusRef.current === 'paused') {
      setGameStatus('playing');
      EventBus.emit('game:resume');
    }
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

`gameStatus` 최신값은 `statusRef`로 동기화해 stale closure를 방지한다.  
`PixelModal`에 `onClose`를 전달하지 않으면 `useModal`의 ESC 핸들러가 비활성화되므로, `PauseModal`은 `onClose` 없이 렌더링한다.

### 2. 일시정지 모달 (`PauseModal`)

`gameStatusAtom`이 `'paused'`일 때 표시되며, 인라인으로 BGM/SFX 설정 섹션을 포함한다.

- 구성: BGM/SFX 토글 + 볼륨 슬라이더 / 이어하기 / 다시하기 / 나가기 버튼
- BGM/SFX 상태는 `PauseModal` 내부 `useState`로 임시 관리
- 이벤트 처리 로직은 `usePauseModal` 훅으로 분리

```
game:pause  → handleGamePause → gameStatusAtom = 'paused'  → PauseModal 표시
game:resume → handleGameResume → gameStatusAtom = 'playing' → PauseModal 숨김
```

### 3. 일시정지 버튼 (`SingleGameContent`)

우측 패널 `h-48` 영역 내부에 flex column 레이아웃으로 배치했다.

```tsx
<div className="flex h-48 flex-col border-b border-gray-700 p-2">
  {/* 상단: 우측 정렬 일시정지 버튼 */}
  <div className="flex justify-end">
    <button className="nes-btn text-xs" onClick={() => EventBus.emit('game:pause')}>⏸</button>
  </div>
  {/* 하단: 중앙 정렬 캐릭터 */}
  <div className="flex flex-1 items-end justify-center pb-2">
    <span className="text-4xl">😸</span>
  </div>
</div>
```

### 4. BranchLane TypeError 수정 (`SingleScene`)

`SingleScene.create()`에서 game 레벨 `DESTROY` 이벤트를 구독해 `shutdown()`을 보장한다.

```ts
this.game.events.once(Phaser.Core.Events.DESTROY, this.shutdown, this);
```

### 5. 게임 경과 시간 표시 (`GameProgress`)

`elapsedTimeAtom`을 구독해 `MM:SS` 포맷으로 진행도 바 우측에 표시한다.

```ts
function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
```

Phaser `SingleScene`이 `this.time.paused = true`로 타이머를 멈추므로, 일시정지 중에는 `elapsedTimeAtom`도 자동으로 멈춘다.

---

## Why

### ESC 리스너를 한 곳에서만 처리하는 이유

`PixelModal`의 `useModal`은 마운트 시 ESC 핸들러를 자동으로 등록한다.  
`PauseModal`이 `onClose`를 받으면 `useModal`이 ESC 핸들러를 추가로 등록해 이중 처리가 발생한다.  
ESC 하나에 "게임 일시정지" 와 "모달 닫기"가 동시에 발화하면 상태 머신이 의도치 않게 전환된다.  
`useSingleGame`에서 단일 리스너로 관리하고 `PauseModal`에 `onClose`를 전달하지 않는 방식으로 이중 처리를 차단한다.

### statusRef를 사용하는 이유

ESC 리스너는 마운트 시 한 번만 등록한다(`deps: []`).  
클로저가 초기 `gameStatus` 값을 캡처하므로, ref 없이는 항상 초기값(`'idle'`)을 읽게 된다.  
`useEffect`로 `statusRef.current`를 `gameStatus`에 동기화해 항상 최신 상태를 참조한다.

### BGM/SFX 상태를 Zustand로 이관하지 않은 이유

홈의 `SettingsModal`과 공유하려면 `settingsStore` 연결이 필요하나, 해당 store가 아직 구현되지 않았다.  
현재는 `PauseModal` 내부 `useState`로 임시 관리하고, `settingsStore` 완성 후 이관한다.

### BranchLane 오류의 근본 원인

`SingleGameContent` 언마운트 시 `game.destroy(true)`를 호출하지만, Phaser 3 일부 버전에서  
`SceneManager.destroy()` → `sys.destroy()` 경로가 `sys.shutdown()`을 건너뛴다.  
결과적으로 `EventBus` 핸들러가 정리되지 않은 채 남아, 새 게임 생성 시 이미 파괴된  
`BranchLane`(`this.scene === undefined`)을 참조하는 핸들러가 이중 실행되어 TypeError가 발생했다.

### `game.events.once(DESTROY, this.shutdown, this)`를 선택한 이유

Phaser의 게임 레벨 `DESTROY` 이벤트는 `SceneManager` 레벨보다 앞서 발화하며,  
Phaser 문서에서 보장하는 리소스 해제 진입점이다.  
`shutdown()` 자체는 이미 idempotent하게 작성되어 있어 이중 호출이 발생해도 안전하다.

### 경과 시간 표시에 `elapsedTimeAtom`을 재사용한 이유

이미 `useSingleGame`이 `timer:tick` EventBus 이벤트로 `elapsedTimeAtom`을 갱신하고 있다.  
Phaser 타이머(`this.time`)가 일시정지 여부를 제어하므로, 별도의 React 타이머 없이  
게임 일시정지 상태가 경과 시간에 자동 반영된다.

---

## Caution

- `PauseModal`의 BGM/SFX 상태는 현재 로컬 `useState`로 관리된다. 페이지를 이탈하거나 재시작하면 초기화된다. → `settingsStore` 이관 필요 (TODO)
- `😸` 캐릭터는 이모지 임시 대체다. 실제 캐릭터 에셋으로 교체 필요 (TODO)
- `/single` 경로 직접 접근이 현재 허용된다. API 연동 후 `routes/single.tsx`의 `beforeLoad`에서 `useSingleStore.getState().sessionId` 유무로 가드를 추가해야 한다 (TODO).
- `game.events.once(DESTROY, this.shutdown, this)` 픽스는 `shutdown()` 이중 호출이 발생할 수 있다. `shutdown()` 내부의 `EventBus.off`는 이미 해제된 핸들러를 다시 해제해도 오류가 발생하지 않으므로 안전하다.
- `SingleScene`에 `isUserPaused` 플래그가 추가되었다. `handleGamePause`에서 `true`, `handleGameResume`에서 `false`로 관리하며, stash 아이템(`item:use slot 0`)의 자동 재개 여부를 판단하는 데 사용된다. stash 중 ESC 일시정지 → stash 만료 후 자동 재개 안 됨 → 유저가 이어하기를 눌러야 재개된다. → `IMPLEMENTATION_아이템드롭및사용.md` — "4. stash 구현" 참고.
- `elapsedTimeAtom`은 ms 단위다. 결과 화면에서 `playTimeMs`로 전달할 때 단위 변환 주의.
- `GameProgress`의 진행도 바 너비가 `w-full`로 고정되어 있어 경과 시간 span이 추가되면 내부 레이아웃이 좁아진다. 해상도 1280×720 기준으로 확인 필요.

---

## Test Plan

- ESC 키 → `gameStatusAtom` `'paused'` 전환 + `PauseModal` 표시 확인 → **시각 확인 완료**
- ESC 키 재입력 (paused 상태) → `'playing'` 복귀 + `PauseModal` 숨김 확인 → **시각 확인 완료**
- 일시정지 버튼 클릭 → 동일 동작 확인 → **시각 확인 완료**
- 이어하기 버튼 → `game:resume` emit + 게임 재개 확인 → **시각 확인 완료**
- 다시하기 버튼 → `game:restart` emit + 씬 재시작 + atom 초기화 확인 → **시각 확인 완료**
- 나가기 버튼 → `/home` replace 이동 확인 → **시각 확인 완료**
- 게임 완료 후 재시작 → BranchLane TypeError 미발생 확인 → **시각 확인 완료**
- 일시정지 중 `GameProgress` 경과 시간 정지 확인 → **시각 확인 완료**
- 재개 후 경과 시간 재진행 확인 → **시각 확인 완료**
