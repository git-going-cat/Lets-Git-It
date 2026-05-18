# Single_IMPLEMENTATION_싱글_이벤트버스_도메인분리

## Background / Context

기존 `EventBus`는 `core/bridge/EventBus.ts`에 정의된 전역 싱글턴으로, 다음과 같은 강결합 문제가 있었다.

- **타입 구현이 클래스에 하드코딩**: `TypedEventBus` 클래스가 `EventMap`을 직접 참조하는 비제네릭 구조였다. 다른 도메인용 버스를 만들려면 동일 클래스를 복제해야 했다.
- **도메인 분리 부재**: 싱글 플레이용 이벤트(`game:*`, `command:*`, `item:*`, `branch:*`, `tutorial:*` 등 24개)가 전역 `EventMap`에 모두 들어 있어, 추후 다른 모드(coop/speed/timeattack) 이벤트가 추가될 경우 이름 충돌 위험이 컸다.
- **리스너 cleanup 누락 위험**: `on`을 호출하면 같은 위치에 `off`를 수동으로 짝지어야 했다. 특히 `useSingleGame`처럼 11개 이벤트를 한 곳에서 등록하는 god hook에서 누락 시 메모리 누수와 중복 호출이 발생할 수 있었다.

위 문제를 해결하기 위해 EventBus를 제네릭 클래스 + 도메인별 인스턴스 구조로 분리하고, 구독 cleanup을 강제하는 패턴을 도입했다.

---

## Decision

### 1. 제네릭 `TypedEventBus<TMap>` 추출 — `core/bridge/TypedEventBus.ts`

`EventBus.ts`에 인라인되어 있던 클래스를 별도 파일로 분리하여 도메인 이벤트 맵을 타입 인자로 받는 제네릭 클래스로 재작성했다.

```typescript
export class TypedEventBus<TMap extends object> extends Phaser.Events.EventEmitter {
  emit<K extends keyof TMap & string>(
    event: K,
    ...args: TMap[K] extends void ? [] : [TMap[K]]
  ): boolean { ... }

  on<K extends keyof TMap & string>(event: K, fn: Callback<TMap, K>, context?: unknown): this { ... }
  once<K extends keyof TMap & string>(event: K, fn: Callback<TMap, K>, context?: unknown): this { ... }
  off<K extends keyof TMap & string>(event: K, fn?: Callback<TMap, K>, context?: unknown): this { ... }

  /** 구독 시점에 해제 함수를 반환해 cleanup 누락을 구조적으로 차단 */
  subscribe<K extends keyof TMap & string>(event: K, fn: Callback<TMap, K>): () => void {
    this.on(event, fn);
    return () => this.off(event, fn);
  }
}
```

`Phaser.Events.EventEmitter`를 상속하여 Phaser Scene 내부에서도 동일하게 사용할 수 있다.

### 2. 싱글 전용 버스 — `features/single/bridge/singleBus.ts`

싱글 플레이 도메인의 이벤트 계약(`SingleEventMap`)과 인스턴스(`singleBus`)를 정의했다. `GameRestartPayload`도 함께 이전했다.

```typescript
export interface SingleEventMap {
  'game:start': void;
  'game:pause': void;
  // ... 24개 이벤트
}

export const singleBus = new TypedEventBus<SingleEventMap>();
```

### 3. 15개 파일 마이그레이션

기존 `EventBus`를 import하던 모든 단일 도메인 코드를 `singleBus`로 교체했다.

- `components/`: `CherryPickOverlay`, `HUDItemSlots`, `PlayerCharacter`, `RestoreOverlay`, `SingleGameContent`, `StartModal`, `StashOverlay`
- `hooks/`: `useCommandInput`, `useEscHandler`, `usePauseModal`, `useResultModal`, `useSingleGame`, `useSinglePageGuards`, `useTutorialMode`
- `scenes/`: `SingleScene`

`core/bridge/EventBus.ts`는 `TypedEventBus`만 re-export하는 진입점으로 단순화되었다. 도메인별 EventMap은 더 이상 core에 두지 않는다.

### 4. `subscribe` 패턴으로 cleanup 강제

기존 `on` + `off` 짝짓기 패턴을 `subscribe` 호출 + 반환값 활용으로 통일했다.

| 패턴 | 코드 |
|-----|-----|
| 단일 구독 | `useEffect(() => singleBus.subscribe(event, fn), [])` |
| 다중 구독 | `const unsubs = [singleBus.subscribe(...), ...]; return () => unsubs.forEach(fn => fn())` |

`useSingleGame.ts`의 11개 구독, `useCommandInput.ts`의 4개 구독, `useTutorialMode.ts`의 3개 구독 모두 `subscribe` 패턴으로 정리되었다.

---

## Why

### 제네릭 클래스로 분리한 이유

기존 `TypedEventBus`는 `EventMap`을 클래스 정의 안에서 직접 참조하는 비제네릭 구조였다. 이 상태로는 도메인을 분리해도 **클래스 자체를 도메인마다 복제**해야 했다. 제네릭으로 추출하면 클래스 1개를 인스턴스화만 달리해 도메인별 버스를 만들 수 있다.

### 제약 조건을 `Record<string, unknown>`이 아닌 `object`로 한 이유

TypeScript 6.0부터 `interface EventMap`은 인덱스 시그니처(`[key: string]: unknown`)가 명시되지 않으면 `Record<string, unknown>` 제약을 만족하지 않는다(`Type 'EventMap' does not satisfy the constraint 'Record<string, unknown>'. Index signature for type 'string' is missing in type 'EventMap'.`).

대안으로 EventMap에 인덱스 시그니처를 추가하면 임의 키를 허용하게 되어 타입 정밀도가 떨어진다. 클래스 레벨 제약은 `object`로 완화하고, 실제 키/페이로드 타입 안전성은 메서드의 `K extends keyof TMap & string` 제약이 담당한다.

### `subscribe` 메서드를 추가한 이유

기존 `on` + `off` 패턴은 구독과 해제를 두 위치에 분리해 작성하므로 `off` 누락이 발생하기 쉬웠다. `subscribe`는 `on`을 즉시 실행하고 `off`를 클로저로 반환해, **구독 즉시 해제 함수를 받는 형태**로 강제한다. React `useEffect` cleanup 함수와 자연스럽게 결합되어 누락이 구조적으로 불가능해진다.

### 도메인 버스를 `features/single/bridge/`에 둔 이유

FSD 아키텍처상 도메인 이벤트 계약은 해당 도메인에 위치해야 한다. `core/`에 두면 `core ← features` 역방향 의존이 발생하고, 추후 다른 모드 추가 시 다시 분리 작업이 필요해진다. `bridge/`라는 명칭은 React ↔ Phaser 통신 계약임을 드러낸다.

---

## Caution

- **`singleBus`는 여전히 모듈 레벨 싱글턴**이다. 게임 세션마다 새 인스턴스를 만들지 않는다. 동시에 여러 싱글 게임 인스턴스가 떠야 하는 요구사항이 생기면 React Context 기반 주입으로 전환해야 한다(현재 요구사항으로는 오버엔지니어링이라 진행 안 함).
- **Phaser Scene의 cleanup은 `shutdown()`에 의존**한다. `SingleScene`은 `Phaser.Scenes.Events.SHUTDOWN` + `Phaser.Core.Events.DESTROY` 두 이벤트에 모두 `shutdown()`을 연결해 두었다. `game.destroy(true)` 시 일부 Phaser 버전이 SHUTDOWN을 보장하지 않으므로 DESTROY를 백업으로 받는다.
- **`TypedEventBus`의 제네릭 제약은 `object`로 완화**되어 있다. 잘못된 타입(`number`, `string` 등)을 넘기면 메서드 호출 시점에서 컴파일 에러가 나지만, 클래스 인스턴스화 시점에서는 잡히지 않는다. 도메인 EventMap은 항상 `interface` 또는 `type`으로 정의해야 한다.
- **cross-feature import / `useSingleGame` god hook은 미해결**이다. 별도 이슈로 분리되어 다음 리팩터링에서 다룬다(아래 "후속 작업" 참고).

---

## Test Plan

- 게임 시작/일시정지/재개/종료/재시작 흐름 정상 동작 확인 (이벤트 라우팅 변경 없음)
- 명령어 입력 → `command:complete` 흐름 정상 확인
- 명령어 시간 초과 → `command:miss` → 목숨 감소 확인
- 아이템 획득(`item:acquired`) / 사용(`item:use` / `stash:end` / `cherry-pick:end`) 흐름 확인
- 튜토리얼 모드 진입 시 `tutorial:show-command` / `tutorial:freeze-command` / `tutorial:pause` 흐름 확인
- ESC → pause → resume 사이클에서 리스너 누수 없음 확인 (DevTools Memory 또는 EventBus listener count 검증)
- SinglePage 마운트 → 언마운트 → 재마운트 후 이벤트 동작 정상 확인 (cleanup 누락 시 중복 핸들러로 인한 점프 발생 가능)
- `tsc --noEmit` 통과 확인

---

## 후속 작업

이번 작업의 범위는 `EventBus → singleBus` 도메인 분리와 cleanup 패턴 도입이다. 추가로 발견된 강결합 문제는 별도 이슈로 분리한다.

1. **Cross-feature 역방향 의존 정리**: `features/single`이 `features/auth`, `features/mypage`를 직접 import 중인 6개 위치를 `shared/`로 끌어올리거나 단방향 주입으로 변경.
2. **`useSingleGame` god hook 분할**: 284줄에 lives·score·items·timer·branch·restart가 모두 들어있어 책임별 분리(`useGameLifecycle`, `useGameScore`, `useGameLives`, `useItemSlots`, `useGameTimer`) 권장.
