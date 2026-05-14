# TROUBLESHOOTING_싱글_핫픽스_ESC커맨드미낙하_재진입실패

> hotfix/FE-싱글-버그픽스 브랜치 — `useSinglePageGuards.ts`, `SingleScene.ts` 수정

---

## Bug 1 — StartModal에서 ESC 후 게임 시작 시 커맨드가 낙하하지 않음

### 증상

1. `/single` 진입 → StartModal(git clone 입력창) 표시
2. 명령어 입력 없이 ESC → PauseModal(설정 화면) 표시
3. "이어하기" 클릭 → StartModal 재표시
4. git clone 명령어 입력 → 게임 상태는 `playing`으로 전환되지만 **명령어 노드가 레인에 나타나지 않음**

### 진단

**ESC 처리 흐름 추적**

| 단계 | 발생 지점 | 상태 |
|------|-----------|------|
| 1. ESC 입력 | `useEscHandler` | `gameStatus === 'idle'` → `setPrePauseStatus('idle')` + `EventBus.emit('game:pause')` |
| 2. game:pause 수신 | `SingleScene.handleGamePause` | `isUserPaused = true` + **`this.tweens.pauseAll()`** |
| 3. 이어하기 클릭 | `usePauseModal.onResume` | `setGameStatus(prePauseStatus = 'idle')` |
| 4. game:resume 미발행 | `usePauseModal.onResume` | `prePauseStatus === 'idle'`이므로 `EventBus.emit('game:resume')` 스킵 |
| 5. game:start 수신 | `SingleScene.handleGameStart` | `startTimer()` + `showCurrentCommand()` 호출 |
| 6. tween 생성 | `BranchLane.showCommand` | `this.scene.tweens.add(...)` — **TweenManager가 pauseAll 상태이므로 tween 미동작** |

**근본 원인**

`prePauseStatus === 'idle'`일 때 이어하기를 눌러도 `game:resume`이 발행되지 않아 `SingleScene.handleGameResume()`이 호출되지 않는다. 이 때문에 `handleGamePause`에서 호출한 `tweens.pauseAll()`이 해제되지 않은 채로 `game:start`에 진입한다.

Phaser 3의 `TweenManager.pauseAll()`은 시간 스케일을 0으로 설정하므로, 이후 새로 추가된 tween도 동작하지 않는다.

> 관련 구현: `IMPLEMENTATION_일시정지시스템및게임타이머.md` — "2. Phaser `SingleScene`이 `this.time.paused = true`로 타이머를 멈추므로"

### 해결

**파일: `FE/src/features/single/scenes/SingleScene.ts`**

`handleGameStart`에서 게임 시작 전 TweenManager 상태를 명시적으로 초기화한다.

```ts
// Before
private readonly handleGameStart = (): void => {
  if (this.isTutorialMode) return;
  this.startTimer();
  this.showCurrentCommand();
};

// After
private readonly handleGameStart = (): void => {
  if (this.isTutorialMode) return;
  // idle 상태에서 ESC → game:pause → resume(game:resume 미발행)로 tweens.pauseAll()이
  // 호출된 채 game:start에 도달할 수 있다. 게임 시작 시점에 TweenManager를 반드시 재개한다.
  this.isUserPaused = false;
  this.tweens.resumeAll();
  this.startTimer();
  this.showCurrentCommand();
};
```

---

## Bug 2 & 3 — 게임 종료 후 홈에서 싱글 재진입 시 첫 시도 실패

### 증상

**Bug 2**: 게임 진행 중 브라우저 뒤로가기 → 홈 이동 → 싱글 모드 클릭 → 모드 선택 창이 열리지 않거나, 열려도 게임 시작이 안 됨. 두 번째 클릭은 정상.

**Bug 3**: 동일 경로 → 모드 선택 창에서 Normal 선택 → "게임 시작" 클릭 → 모달이 닫히고 홈으로 리다이렉트. 두 번째 시도는 정상.

### 진단

**`useSinglePageGuards`의 `GUARD_KEY` 메커니즘 추적**

```
[1] /single 진입 → useSinglePageGuards 마운트
    → window.history.pushState() (중복 히스토리 항목 추가)
    → popstate 리스너 등록

[2] 브라우저 뒤로가기 → popstate 발화
    → sessionStorage.setItem('single:historyGuard', 'true')  ← GUARD_KEY 세팅
    → navigate({ to: '/home', replace: true })
    → SinglePage 언마운트

[3] 홈 → 모드 선택 → Normal 선택 → "게임 시작"
    → navigate({ to: '/single', search: { difficulty: 'NORMAL' } })

[4] /single 재진입 → useSinglePageGuards 마운트
    → sessionStorage.getItem('single:historyGuard') === 'true'  ← GUARD_KEY 발견
    → sessionStorage.removeItem(...)
    → navigate({ to: '/home', replace: true })  ← 정상 진입인데 홈으로 강제 리다이렉트
```

**근본 원인**

GUARD_KEY는 "브라우저 뒤로가기/앞으로가기 재진입 방지" 목적으로 설계되었으나, 뒤로가기 후 **메뉴에서 정상적으로 재진입하는 경우도 동일하게 차단**한다. GUARD_KEY가 sessionStorage에 남아 있는 한 다음 번 `/single` 마운트는 무조건 홈으로 리다이렉트된다.

> 관련 구현: `IMPLEMENTATION_세션만료및재시작처리.md` — "기존 브라우저 히스토리 방어 로직은 유지되어 뒤로가기/앞으로가기 재진입은 `/home`으로 보낸다."

**GUARD_KEY 없이도 뒤로가기가 막히는 이유**

```
[히스토리 상태]
진입 전:  [..., /home]
진입 후:  [..., /home, /single, /single]  ← pushState로 중복 항목 추가

뒤로가기: [..., /home, /single*, /single]  (* = 이전 항목으로 이동)
          → popstate 발화 → navigate({ to: '/home', replace: true })
          → [..., /home, /home, /single]  ← replace로 현재 항목 덮어씀

앞으로가기: /single 항목으로 이동하면 SinglePage가 새 세션으로 초기화되므로
            stale 세션 재진입 문제 없음
```

pushState + popstate 캐치만으로 이미 뒤로가기가 차단된다. GUARD_KEY는 불필요하며 부작용만 발생시킨다.

### 해결

**파일: `FE/src/features/single/hooks/useSinglePageGuards.ts`**

GUARD_KEY 로직(`sessionStorage.getItem` / `sessionStorage.setItem`)을 제거하고, pushState + popstate 방식만 유지한다.

```ts
// Before
useEffect(() => {
  const GUARD_KEY = 'single:historyGuard';

  if (sessionStorage.getItem(GUARD_KEY)) {
    sessionStorage.removeItem(GUARD_KEY);
    navigate({ to: '/home', replace: true });
    return;
  }

  window.history.pushState(null, '', window.location.href);

  const handlePopState = () => {
    sessionStorage.setItem(GUARD_KEY, 'true');
    navigate({ to: '/home', replace: true });
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [navigate]);

// After
useEffect(() => {
  window.history.pushState(null, '', window.location.href);

  const handlePopState = () => {
    navigate({ to: '/home', replace: true });
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [navigate]);
```

---

## 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `FE/src/features/single/scenes/SingleScene.ts` | `handleGameStart`에 `isUserPaused = false` + `tweens.resumeAll()` 추가 |
| `FE/src/features/single/hooks/useSinglePageGuards.ts` | GUARD_KEY sessionStorage 로직 제거 |

---

## 재현 조건

**Bug 1**
1. 싱글 모드 진입 (any difficulty)
2. StartModal에서 명령어 입력 없이 ESC
3. PauseModal에서 이어하기 클릭
4. git clone 명령어 정확히 입력
5. → 커맨드 노드 미낙하 확인

**Bug 2 & 3**
1. 싱글 게임 진행 중 브라우저 뒤로가기 버튼 클릭
2. 홈 화면에서 싱글 모드 버튼 클릭
3. → 모드 선택 창 미표시 또는 "게임 시작" 후 홈으로 리다이렉트 확인
4. 두 번째 시도 → 정상 작동 확인 (GUARD_KEY 소진 후)

---

## Test Plan

- ESC → 이어하기 → git clone 입력 → 커맨드 정상 낙하 확인
- ESC → ESC(재입력) → git clone 입력 → 커맨드 정상 낙하 확인
- 게임 진행 중 브라우저 뒤로가기 → 홈 이동 확인
- 홈에서 싱글 모드 클릭 → 첫 시도에서 정상 진입 확인
- 게임 진행 중 "나가기" 버튼 → 홈 이동 → 싱글 재진입 정상 확인 (기존 정상 케이스 회귀 방지)
