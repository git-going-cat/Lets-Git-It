# 프론트엔드 개발 컨벤션 (Game Edition)

## 1. 기술 스택 원칙

- View(UI): React 19 + Tailwind CSS
- Game Engine: Phaser 4 (React와 별도 레이어로 격리)
- 상태 관리:
  - 서버 상태: TanStack Query (로컬 스토어 복제 금지)
  - 인게임 상태: Jotai (점수, 콤보 등 빈번한 렌더링)
  - 전역 메타 상태: Zustand (유저 정보, 방 코드, 설정)
- 데이터 검증: Zod (모든 API 및 WebSocket 패킷 검증 필수)

## 2. 레이어드 아키텍처

- View (React UI): 공통 UI 및 게임 레이어 렌더링
- Logic (Hooks): React 상태와 게임 엔진 간 이벤트 중재 (EventBus 활용)
- Engine (Phaser): 순수 게임 렌더링 및 물리 연산 (React import 금지)

## 3. 개발 규칙

- Phaser ↔ React: 직접 참조 금지, EventBus를 이용한 이벤트 기반 통신
- EventBus 이벤트명: 'domain:action' 형태 (game:pause, score:update)
- Phaser Scene 생명주기: create()에서 EventBus 등록, shutdown()에서 반드시 해제
- Scene 안에서 React import 금지
- WebSocket: core/socket/SocketManager.ts를 통해서만 연결
- Zod: 게임 중 패킷은 .safeParse() 필수 (오류 발생 시 로그 기록 후 폐기)
- 성능: 60FPS 보존을 위해 빈번한 업데이트는 Jotai atom 또는 엔진 내부 변수 활용

## 4. 컴포넌트 설계 규칙

- 데이터 가공, 이벤트 처리, EventBus 구독은 Custom Hook으로 분리
- 컴포넌트는 "어떻게 보여줄 것인가"만 담당
- useEffect 3개 이상 금지, 초과 시 Hook 분리
- Phaser Scene 이벤트 구독은 useEffect + cleanup 필수
- 게임 로직(점수 계산 등)은 Scene 안에 작성 금지, shared/utils/로 분리

## 5. 주석 규칙

- Hook, Util, Phaser Scene에는 JSDoc 필수
- 복잡한 수치 연산 (점수 계산, 좌표 계산 등)에는 라인 주석 필수
- 명백한 코드에는 주석 금지

## 6. 네이밍 규칙

- 컴포넌트 파일: PascalCase (SingleHUD.tsx)
- 훅/유틸/atom 파일: camelCase (useGameBridge.ts, scoreAtom.ts)
- Jotai atom 변수: Atom 접미사 필수 (scoreAtom, livesAtom)
- Phaser Scene 클래스: PascalCase + Scene 접미사 (SingleScene, CoopScene)
- Props 타입: 컴포넌트명 + Props (SingleHUDProps)
- Interface에 I 접두사 금지 (User O, IUser X)
- Jotai atom 파일: atom 단위로 파일 분리 (livesAtom.ts, comboAtom.ts) — 한 파일에 모으지 말 것

## 7. Import 순서

1. External (react, jotai, phaser 등)
2. Internal (@/ 절대 경로)
3. Relative (../, ./)
4. Types (import type)
5. Styles

- eslint-plugin-simple-import-sort로 자동 정렬 적용 중 (수동 정렬 불필요)

## 8. 데이터 통신

- any 타입 사용 금지, 모든 API 응답은 Zod 스키마 검증 후 사용
- 컴포넌트 내부에서 직접 axios 호출 금지
- features/{domain}/api에 정의된 함수를 TanStack Query와 조합하여 호출

## 9. 경로 사용

- `../` 두 번 이상 → 절대경로
- `../` 한 번이면 → 상대경로
- ex) `features/game` 안의 파일들을 참조한느 경우 상대경로, `features/game` 안의 파일을 수정 중인데 `features/auth` 나 `shared/button` 과 같은 식으로 다른 폴더로 나가는 경우 절대경로

## 10. 테스트 규칙 (Vitest)

- 테스트 환경: jsdom
- 테스트 대상 우선순위: shared/utils/ > features/_/hooks/ > features/_/api/
- Phaser Scene은 Canvas 의존성으로 인해 테스트 제외
- 테스트 파일 위치: 대상 파일과 동일 디렉토리 (same-dir 방식)
  - 예: scoreCalculator.ts → scoreCalculator.test.ts
- 게임 중 WebSocket 패킷(.safeParse() 실패)은 로그만 기록하고 폐기

## 11. 에러 처리 규칙

- 전역 ErrorBoundary: 라우트 최상단에 배치, 예상 못한 런타임 에러 캐치
- TanStack Query: throwOnError: false (전역 throw 비활성화), retry: 1
- 401 응답: axios interceptor에서 Refresh Token 재발급 시도
  - 성공 → 원래 요청 자동 재시도
  - 실패 → 로그아웃 + 로그인 페이지 이동
- 게임 중 WebSocket 에러: 재연결 시도 후 실패 시 모달 표시 → 대기실 이동 (BE 합의 후 확정)
- Zod safeParse 실패: console.error 로그 후 해당 패킷 폐기, UI 중단 없음

## 12. 환경변수 규칙

- VITE\_ 접두사 필수 (없으면 클라이언트에서 접근 불가)
- 환경변수는 직접 import.meta.env로 접근하지 않고 src/config/env.ts에서만 참조
- .env.local은 개인 로컬 설정용, 반드시 .gitignore에 포함

## 13. WebSocket 생명주기

- 연결: 방 입장 확정 시 (SocketManager.connect)
- 해제: 방 완전 이탈 / 홈 이동 시 (SocketManager.disconnect)
- 재연결 전략: BE 합의 후 확정
- 게임 중 연결 끊김 처리: BE 합의 후 확정

## 14. 지원 해상도

- 최소 지원 해상도: 1280 × 720
- 모바일: 미지원
- Phaser 캔버스: 고정 사이즈 또는 letterbox 스케일링
- Tailwind 기준 breakpoint: (팀 합의 후 확정)

## 15. 상태 관리 사용 규칙

### Jotai

- atom은 관심사 단위로 파일을 분리해서 배치 — 중앙 store 파일 하나에 모으지 말 것
  - ✅ `features/single/store/livesAtom.ts`, `features/single/store/scoreAtom.ts`
  - ❌ `features/single/store/singleStore.ts` (Zustand 방식, Jotai에서는 금지)
- 파생 관계인 atom끼리는 같은 파일에 둬도 무방

```ts
// scoreAtom.ts
export const comboAtom = atom(0);
export const bonusAtom = atom((get) => get(comboAtom) * 10); // 파생 atom
```

### Zustand

- 도메인별로 store를 분리 — 하나의 거대한 store 금지
  - ✅ `features/auth/store/authStore.ts`, `features/multi/store/multiStore.ts`
  - ❌ 모든 전역 상태를 `useStore` 하나에 몰아넣기

### TanStack Query

- 서버에서 받은 데이터를 Zustand/Jotai에 중복 저장 금지 — Query가 서버 상태를 단독 관리

```ts
// ❌ 이중 관리
const { data } = useQuery({ queryKey: ["ranking"], queryFn: fetchRanking });
useEffect(() => {
  useRankingStore.setState({ ranking: data });
}, [data]);

// ✅ data 그대로 사용
const { data: ranking } = useQuery({
  queryKey: ["ranking", mode],
  queryFn: () => fetchRanking(mode),
});
```

### TanStack Router

- 라우트 타입 수동 정의 금지 — `routeTree.gen.ts` 자동 생성 타입 그대로 사용
- search params 검증은 Zod와 연동

```ts
validateSearch: z.object({
  mode: z.enum(["contribution", "timeattack", "coop"]),
});
```

### Zod

- 게임 중 WebSocket 패킷은 `.safeParse()` 필수 — `.parse()`는 throw하므로 게임 중 사용 금지

```ts
// ❌ 게임 중 터짐
const packet = GamePacketSchema.parse(rawData);

// ✅ 실패해도 게임 유지
const result = GamePacketSchema.safeParse(rawData);
if (!result.success) {
  console.error("잘못된 패킷:", result.error);
  return;
}
```

### Phaser ↔ React

- React에서 Phaser Scene 직접 참조 금지 — EventBus 경유만 허용

```ts
// ❌ 강결합
const scene = gameInstance.scene.getScene("SingleScene") as SingleScene;
scene.pauseGame();

// ✅ EventBus 경유
EventBus.emit("game:pause");
```

---

## 16. Tailwind CSS 크기 규칙

- 크기(width, height, padding, margin, gap 등)는 Tailwind 기본 스케일 클래스 우선 사용
  - ✅ `w-32`, `p-4`, `gap-2`
  - ❌ `w-[128px]`, `p-[14px]`
- 여러 곳에서 공통으로 쓰이는 특수한 크기는 `tailwind.config.ts`의 `theme.extend`에 등록 후 사용

```ts
  // tailwind.config.ts
  theme: { extend: { width: { 'hud': '8rem', 'churu': '9rem' } } }
  // 사용: w-hud, w-churu
```

- 임의 값(`w-[...]`)은 Tailwind 스케일로 표현 불가능한 경우에만 허용, 이유를 주석으로 명시
