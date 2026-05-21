# Let's Git it — FE 폴더 구조 생성 지시서

> 이 파일을 Claude Code(CLI)에 그대로 전달하면 폴더 구조를 자동 생성합니다.
> 아래 내용을 복사해서 Claude Code에 붙여넣으세요.

---

## ✅ CLI 전달 프롬프트 (복사해서 사용)

```
아래 지시에 따라 FE/src/ 폴더 구조를 생성해줘.

## 규칙
1. 모든 폴더는 아래 구조 그대로 생성할 것
2. .ts / .tsx 파일은 아래 내용만 포함한 빈 껍데기로 생성할 것
   - 파일 상단에 // TODO: 구현 필요 주석
   - export default function 또는 export const 최소 선언
3. 빈 폴더는 .gitkeep 파일로 채울 것
4. 이미지/영상 파일은 생성하지 말 것 (assets 하위 폴더만 생성)
5. 기존에 이미 있는 파일은 덮어쓰지 말 것

## 생성할 구조

src/
├── assets/
│   ├── character/
│   │   ├── hair/
│   │   ├── hair_color/
│   │   ├── body/
│   │   ├── body_color/
│   │   ├── eye/
│   │   └── outfit/
│   ├── bg/
│   ├── sounds/
│   └── video/
│
├── config/
│   └── env.ts                        ← 환경변수 단일 진입점 (import.meta.env 직접 접근 금지)
│
├── shared/
│   ├── components/                   ← 도메인 무관 공통 UI (구 components/common/ 통합)
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── GlassCard.tsx
│   │   ├── Win11Window.tsx
│   │   ├── PixelLogo.tsx
│   │   ├── Avatar.tsx
│   │   ├── RouteErrorFallback.tsx    ← routes/ errorComponent 전용
│   │   └── LoadingSpinner.tsx        ← routes/ pendingComponent 전용
│   └── types/
│       ├── game.types.ts
│       ├── user.types.ts
│       ├── socket.types.ts
│       └── ranking.types.ts
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx       ← 페이지 루트 컴포넌트 (/, 로그인 진입점)
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── NicknameSetup.tsx
│   │   │   └── CharacterSetup.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── schemas/
│   │   │   ├── login.schema.ts       ← React Hook Form + Zod resolver
│   │   │   └── signup.schema.ts
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── api/
│   │       └── authApi.ts
│   │
│   ├── home/
│   │   ├── components/
│   │   │   ├── HomePage.tsx          ← 페이지 루트 컴포넌트 (/home)
│   │   │   ├── ModeSelectSection.tsx
│   │   │   ├── MyPageBar.tsx
│   │   │   └── modals/
│   │   │       ├── SettingsModal.tsx
│   │   │       └── LogoutModal.tsx
│   │   ├── hooks/
│   │   │   └── useHome.ts
│   │   └── types/
│   │       └── home.types.ts
│   │
│   ├── mypage/
│   │   ├── components/
│   │   │   ├── MyPageModal.tsx
│   │   │   ├── EditProfileModal.tsx
│   │   │   ├── EditCharacterModal.tsx
│   │   │   └── WithdrawModal.tsx
│   │   ├── hooks/
│   │   │   └── useMyPage.ts
│   │   ├── store/
│   │   │   └── myPageStore.ts
│   │   ├── types/
│   │   │   └── mypage.types.ts
│   │   └── api/
│   │       └── myPageApi.ts
│   │
│   ├── ranking/
│   │   ├── components/
│   │   │   ├── RankingModal.tsx
│   │   │   ├── RankingList.tsx
│   │   │   └── HallOfFame.tsx
│   │   ├── hooks/
│   │   │   └── useRanking.ts
│   │   ├── types/
│   │   │   └── ranking.types.ts
│   │   └── api/
│   │       └── rankingApi.ts
│   │
│   ├── dictionary/
│   │   ├── components/
│   │   │   ├── DictionaryModal.tsx
│   │   │   └── CommandDetail.tsx
│   │   ├── hooks/
│   │   │   └── useDictionary.ts
│   │   ├── types/
│   │   │   └── dictionary.types.ts
│   │   └── api/
│   │       └── dictionaryApi.ts
│   │
│   ├── single/
│   │   ├── scenes/
│   │   │   ├── SingleScene.ts
│   │   │   └── MiniGameScene.ts
│   │   ├── components/
│   │   │   ├── SinglePage.tsx        ← 페이지 루트 컴포넌트 (/single)
│   │   │   ├── SingleHUD.tsx
│   │   │   ├── PauseModal.tsx
│   │   │   └── ResultModal.tsx
│   │   ├── hooks/
│   │   │   └── useSingleGame.ts
│   │   ├── store/
│   │   │   └── singleStore.ts
│   │   ├── types/
│   │   │   └── single.types.ts
│   │   └── api/
│   │       └── singleApi.ts
│   │
│   ├── multi/
│   │   ├── components/
│   │   │   ├── MultiPage.tsx         ← 페이지 루트 컴포넌트 (/multi, 방 목록)
│   │   │   ├── WaitingRoomPage.tsx   ← 페이지 루트 컴포넌트 (/multi/$roomId, 대기방)
│   │   │   ├── RoomList.tsx
│   │   │   └── ChatBox.tsx
│   │   ├── hooks/
│   │   │   └── useRoom.ts
│   │   ├── store/
│   │   │   └── roomStore.ts
│   │   └── types/
│   │       └── room.types.ts
│   │
│   ├── contribution/
│   │   ├── scenes/
│   │   │   └── ContributionScene.ts
│   │   ├── components/
│   │   │   ├── ContributionPage.tsx  ← 페이지 루트 컴포넌트 (/contribution)
│   │   │   ├── ContributionHUD.tsx
│   │   │   └── ResultModal.tsx
│   │   ├── schemas/
│   │   │   └── contribution.schema.ts  ← WebSocket 패킷 Zod 스키마
│   │   ├── hooks/
│   │   │   └── useContribution.ts
│   │   ├── store/
│   │   │   └── contributionStore.ts
│   │   └── types/
│   │       └── contribution.types.ts
│   │
│   ├── timeattack/
│   │   ├── scenes/
│   │   │   ├── TimeAttackScene.ts
│   │   │   └── MiniGameScene.ts
│   │   ├── components/
│   │   │   ├── TimeAttackPage.tsx    ← 페이지 루트 컴포넌트 (/timeattack)
│   │   │   ├── TimeAttackHUD.tsx
│   │   │   └── ResultModal.tsx
│   │   ├── schemas/
│   │   │   └── timeattack.schema.ts  ← WebSocket 패킷 Zod 스키마
│   │   ├── hooks/
│   │   │   └── useTimeAttack.ts
│   │   ├── store/
│   │   │   └── timeAttackStore.ts
│   │   └── types/
│   │       └── timeattack.types.ts
│   │
│   └── coop/
│       ├── scenes/
│       │   └── CoopScene.ts
│       ├── components/
│       │   ├── CoopPage.tsx          ← 페이지 루트 컴포넌트 (/coop)
│       │   ├── CoopHUD.tsx
│       │   └── ResultModal.tsx
│       ├── schemas/
│       │   └── coop.schema.ts        ← WebSocket 패킷 Zod 스키마
│       ├── hooks/
│       │   └── useCoop.ts
│       ├── store/
│       │   └── coopStore.ts
│       └── types/
│           └── coop.types.ts
│
├── game/
│   ├── config.ts
│   ├── SceneManager.ts
│   └── scenes/
│       ├── BootScene.ts
│       └── TransitionScene.ts
│
├── core/
│   ├── bridge/
│   │   ├── TypedEventBus.ts          ← 도메인별 이벤트 버스 제네릭 클래스
│   │   ├── EventBus.ts               ← TypedEventBus 진입점 re-export
│   │   └── GameBridge.ts
│   └── socket/
│       └── SocketManager.ts
│
└── routes/
    ├── __root.tsx               ← 루트 레이아웃 (공통 Provider)
    ├── index.tsx                ← / → LandingPage
    ├── home.tsx                 ← /home → HomePage
    ├── single.tsx               ← /single → SinglePage
    ├── multi.tsx                ← /multi → MultiPage (방 목록)
    ├── multi.$roomId.tsx        ← /multi/$roomId → WaitingRoomPage (대기방)
    ├── contribution.tsx         ← /contribution → ContributionPage
    ├── timeattack.tsx           ← /timeattack → TimeAttackPage
    ├── coop.tsx                 ← /coop → CoopPage
    ├── ranking.tsx              ← /ranking
    ├── dictionary.tsx           ← /dictionary
    └── mypage.tsx               ← /mypage
```

---

## 📌 파일별 생성 기준

### config/env.ts

```ts
// TODO: 환경변수 추가
// import.meta.env 직접 접근 금지 — 반드시 이 파일에서만 참조
export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  WS_URL: import.meta.env.VITE_WS_URL as string,
} as const;
```

### shared/components/\*.tsx

```tsx
// TODO: 구현 필요
interface Props {}

export function ComponentName({}: Props) {
  return <div />;
}
```

### features/_/store/_.ts

```ts
// TODO: 구현 필요
// Zustand store (유저 정보 등 변동성 낮은 전역 상태)
// Jotai atom (점수/콤보 등 인게임 잦은 업데이트 상태)
```

### features/_/api/_.ts

```ts
// TODO: 구현 필요
// REST API 호출 함수
// ⚠️ single/api/ 는 REST API만 — WebSocket 절대 추가 금지
```

### features/_/scenes/_.ts

```ts
// TODO: 구현 필요
// Phaser 4 Scene 클래스
// React 코드 import 금지 — 도메인 버스(features/{domain}/bridge/{domain}Bus.ts) 경유만 허용
```

### schemas/\*.schema.ts

```ts
// TODO: 구현 필요
// Zod 스키마 — safeParse만 사용할 것 (parse 금지)
import { z } from "zod";
```

### routes/\*.tsx

```tsx
// TODO: 구현 필요
import { createFileRoute } from "@tanstack/react-router";
// import { XxxPage } from '@/features/xxx/components/XxxPage'

export const Route = createFileRoute("/xxx")({
  // beforeLoad: 권한 가드
  // validateSearch: Zod search params 검증
  // loader: 데이터 패칭
  // component: XxxPage,
  // errorComponent: RouteErrorFallback,
  // pendingComponent: LoadingSpinner,
});
```

> routes/ 파일은 path 정의, loader, beforeLoad, validateSearch, errorComponent/pendingComponent만 담당한다.
> UI 로직과 상태는 반드시 `features/{domain}/`으로 분리한다.

### features/\*/components/XxxPage.tsx

```tsx
// TODO: 구현 필요
// 페이지 루트 컴포넌트 — Page 접미사 필수
// routes/ 에서 component 속성으로 주입받는 진입점
export function XxxPage() {
  return <div />;
}
```

---

## 🚫 절대 하면 안 되는 것 (CLI도 동일 적용)

| 금지 사항                                                           | 이유                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| `features/single/` 안에 소켓 파일 추가                              | 싱글은 REST API만, WebSocket 미사용 확정              |
| `core/` 안에 도메인(게임 모드) 이름 사용                            | core는 인프라만, 도메인 개념 없음                     |
| `routes/` 안에 UI 로직·상태 관리 작성                               | routes는 라우팅 컨트롤러만, 화면과 로직은 features/로 |
| `features/{domain}/components/` 안에 `XxxPage.tsx` 없이 페이지 조립 | Page 접미사 없으면 페이지 루트 컴포넌트 식별 불가     |
| `pages/` 폴더 생성                                                  | Feature-Driven 아키텍처에서 폐기된 구조               |
| `components/common/` 폴더 생성                                      | 공통 컴포넌트는 `shared/components/`로 일원화         |
| 최상위 `schemas/` 폴더에 스키마 추가                                | 스키마는 사용하는 feature 안 `schemas/`에 위치        |
| `import.meta.env` 직접 접근                                         | 반드시 `config/env.ts`를 통해서만 참조                |
| Phaser Scene에서 React import                                       | 도메인 버스(singleBus 등) 경유만 허용                 |
| WebSocket 패킷에 `.parse()` 사용                                    | 게임 중 터짐 — `.safeParse()` 만 허용                 |
| `assets/character/` 네이밍 임의 변경                                | BE 합의 기준 그대로 사용                              |
| 서버 데이터를 Zustand/Jotai에 중복 저장                             | TanStack Query가 관리 — store에 넣지 말 것            |

---

## 🔖 상태 관리 도구 선택 기준 (헷갈릴 때 참고)

```
이 상태의 출처가 서버인가?
  → Yes → TanStack Query

게임 중 매 이벤트마다 바뀌는가? (점수, 콤보, 타이머, 목숨)
  → Yes → Jotai atom

그 외 전역 상태인가? (유저 정보, 방 코드, 설정)
  → Yes → Zustand
```

---

## 🔖 새 파일 추가할 때 판단 순서

```
1. 어떤 도메인인가?
   특정 모드/기능에만 속함  → features/{domain}/
   2개 이상 도메인에서 씀   → shared/
   도메인 개념 없는 인프라  → core/
   Phaser 공통 씬/설정      → game/
   URL 라우트 정의          → routes/
   환경변수 접근            → config/env.ts

2. 같은 폴더 안에서 무슨 역할인가?
   페이지 진입점 (routes/component 주입) → components/XxxPage.tsx (Page 접미사 필수)
   화면 조각 렌더링                      → components/XxxYyy.tsx
   상태 구독/이벤트                      → hooks/
   상태 저장                             → store/
   타입 정의                             → types/
   서버 통신                             → api/
   Zod 스키마 (폼 검증 / WS 패킷)       → schemas/
   Phaser 씬                             → scenes/

3. 이 파일이 삭제될 때 같이 삭제될 파일이 같은 폴더에 있는가?
   Yes → 잘 배치된 것
   No  → 폴더 위치 재검토
```

---

## 🔖 모드별 점수 방식 확정 (개발 시 참고)

| 모드        | 점수 기준                | 비고                     |
| ----------- | ------------------------ | ------------------------ |
| 싱글        | 시간/목숨/콤보/오타 기반 | 프론트 계산 후 서버 전송 |
| 기여도 뺏기 | 기여도 % 기반            | BE에서 계산 후 전달      |
| 타임어택    | commit 수 기반           | `totalCount` 필드 사용   |
| 협력        | 소요 시간 기반 (팀 단위) | `elapsedTime` 필드 사용  |

---

## 🔖 협력 GAME_END rankings 필드 확정

팀 단위로 보여주기로 확정. BE 임시안 그대로 사용.

```ts
interface CoopRankingEntry {
  rank: number;
  roomId: string;
  elapsedTime: number; // 소요 시간 (초)
  completedAt: number; // 완료 타임스탬프 (Long)
}
```
