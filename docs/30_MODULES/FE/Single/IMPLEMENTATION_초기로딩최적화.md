# IMPLEMENTATION_초기로딩최적화

## Background / Context

앱 첫 접속 시 초기 JS 로드 시간이 약 12초에 달했다. 원인은 모든 라우트 컴포넌트가 정적으로 import되어 있어, 로그인 페이지 진입 시에도 게임 전용 라이브러리인 **Phaser (~3-4MB)** 가 초기 번들에 포함된 것이었다.

```
로그인 페이지 진입
 └─ 초기 번들 로드
     ├─ routes/single.tsx → SinglePage → SingleGameContent → EventBus → Phaser ❌
     ├─ routes/tutorial.tsx → TutorialPage → ... → Phaser ❌
     └─ routes/home.tsx → HomePage (모달 다수 포함) ❌
```

추가로 `useBgm()`이 `__root.tsx`에서 호출되어 앱 진입 즉시 5MB mp3 다운로드가 시작되고 있었다.

## Decision

### 1. TanStack Router `.lazy.tsx` 라우트 분리

TanStack Router file-based routing의 `.lazy.tsx` 접미사를 활용해 컴포넌트를 별도 청크로 분리했다.

```
routes/single.tsx       — validateSearch, beforeLoad (가드 로직만)
routes/single.lazy.tsx  — component: SinglePage      (lazy 로드)

routes/tutorial.tsx       — validateSearch, beforeLoad
routes/tutorial.lazy.tsx  — component: TutorialPage

routes/home.tsx       — (빈 route 정의)
routes/home.lazy.tsx  — component: HomePage
```

`/single`, `/tutorial` 분리만으로 Phaser 전체가 초기 번들에서 제외된다.  
`/home` 분리는 모달 컴포넌트들(DictionaryModal, RankingModal 등)의 초기 로드를 방지한다.

### 2. Vite manualChunks

라우트 분할 후 Phaser를 독립 청크로 고정해 브라우저 캐시 재사용률을 높였다.

```ts
// vite.config.ts
manualChunks(id) {
  if (id.includes('/node_modules/phaser')) return 'phaser';
  if (id.includes('/node_modules/@sentry') || id.includes('/node_modules/posthog-js')) return 'monitoring';
  if (id.includes('/node_modules/react') || id.includes('/node_modules/@tanstack')) return 'vendor';
},
```

Phaser는 게임 로직이 바뀌지 않는 한 변경이 없으므로, 별도 청크로 분리하면 재방문 시 캐시 히트율이 높아진다.

### 3. BGM 지연 로드

`useBgm()`을 `__root.tsx`에서 `HomePage`로 이동했다. 로그인/콜백 페이지에서는 5MB mp3 다운로드가 시작되지 않는다.

`SinglePage`, `TutorialPage`에도 `useBgm()`을 추가해 게임 중 일시정지 모달에서의 볼륨 변경이 정상 동작하도록 유지했다. `_audio` 싱글톤이 공유되므로 중복 Audio 인스턴스는 생성되지 않는다.

### 4. Phaser 청크 Prefetch

게임 진입 시 체감 지연을 없애기 위해 `HomePage` 마운트 직후 Phaser 청크를 백그라운드에서 미리 요청한다.

```ts
// HomePage.tsx
useEffect(() => {
  void import('@/features/single/components/SinglePage');
}, []);
```

홈 화면을 탐색하는 동안 Phaser 청크가 다운로드되어, 게임 버튼 클릭 시 이미 캐시된 상태가 된다.

## Result

| 항목 | Before | After |
|---|---|---|
| 초기 JS 로드 시간 | 약 14초 | 약 1.6초 |
| 초기 번들에 Phaser 포함 여부 | O | X |
| 게임 진입 지연 | 없음 (이미 로드) | prefetch로 실질적 없음 |
| mp3 다운로드 시점 | 앱 진입 즉시 | 홈 페이지 진입 시 |

## Caution

- `routes/home.tsx`가 빈 route 정의(`createFileRoute('/home')({})`)로 바뀌었다. 이후 `/home`에 `loader`나 `errorComponent`가 필요하면 `home.tsx`에 추가하면 된다. `component`는 항상 `home.lazy.tsx`에만 둔다.
- `useBgm()`은 현재 `HomePage`, `SinglePage`, `TutorialPage` 세 곳에서 호출된다. 새 게임 페이지가 추가되면 해당 Page 컴포넌트에도 `useBgm()`을 추가해야 한다.
- `manualChunks`는 함수 형태만 지원한다 (`vitest/defineConfig` 타입 제약). 객체 형태는 타입 에러 발생.

## Test Plan

- 로그인 페이지 진입 시 DevTools Network 탭에서 `phaser-*.js` 청크가 로드되지 않는지 확인한다.
- 홈 페이지 진입 후 `phaser-*.js` prefetch 요청이 발생하는지 확인한다.
- 게임 진입 시 Phaser 청크가 이미 캐시되어 즉시 로드되는지 확인한다.
- 일시정지 모달에서 BGM 볼륨 변경 시 즉시 반영되는지 확인한다.
