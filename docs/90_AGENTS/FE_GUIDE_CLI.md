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
├── components/
│   └── common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Input.tsx
│       ├── GlassCard.tsx
│       ├── Win11Window.tsx
│       ├── PixelLogo.tsx
│       └── Avatar.tsx
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── NicknameSetup.tsx
│   │   │   └── CharacterSetup.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── api/
│   │       └── authApi.ts
│   │
│   ├── home/
│   │   ├── components/
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
│   │   │   ├── RoomList.tsx
│   │   │   ├── WaitingRoom.tsx
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
│   │   │   ├── ContributionHUD.tsx
│   │   │   └── ResultModal.tsx
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
│   │   │   ├── TimeAttackHUD.tsx
│   │   │   └── ResultModal.tsx
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
│       │   ├── CoopHUD.tsx
│       │   └── ResultModal.tsx
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
│   │   ├── EventBus.ts
│   │   └── GameBridge.ts
│   └── socket/
│       └── SocketManager.ts
│
├── shared/
│   ├── types/
│   │   ├── game.types.ts
│   │   ├── user.types.ts
│   │   ├── socket.types.ts
│   │   └── ranking.types.ts
│   └── utils/
│       └── scoreCalculator.ts
│
├── schemas/
│   ├── contribution.schema.ts
│   ├── timeattack.schema.ts
│   └── coop.schema.ts
│
├── routes/
│   ├── index.tsx
│   └── paths.ts
│
└── pages/
    ├── landing/
    │   └── index.tsx
    ├── home/
    │   └── index.tsx
    ├── single/
    │   └── index.tsx
    ├── multi/
    │   └── index.tsx
    ├── ranking/
    │   └── index.tsx
    ├── dictionary/
    │   └── index.tsx
    └── mypage/
        └── index.tsx
```

---

## 📌 파일별 생성 기준

### components/common/*.tsx
```tsx
// TODO: 구현 필요
interface Props {}

export default function ComponentName({}: Props) {
  return <div />
}
```

### features/*/store/*.ts
```ts
// TODO: 구현 필요
// Zustand store (유저 정보 등 변동성 낮은 전역 상태)
// Jotai atom (점수/콤보 등 인게임 잦은 업데이트 상태)
```

### features/*/api/*.ts
```ts
// TODO: 구현 필요
// REST API 호출 함수
// ⚠️ single/api/ 는 REST API만 — WebSocket 절대 추가 금지
```

### features/*/scenes/*.ts
```ts
// TODO: 구현 필요
// Phaser 4 Scene 클래스
// React 코드 import 금지 — EventBus 경유만 허용
```

### schemas/*.schema.ts
```ts
// TODO: 구현 필요
// Zod 스키마 — safeParse만 사용할 것 (parse 금지)
import { z } from 'zod'
```

### routes/paths.ts
```ts
// TODO: 경로 상수 추가
// 경로 문자열 직접 사용 금지 — 반드시 이 파일에서 import
export const PATHS = {
  HOME: '/',
  SINGLE: '/single',
  MULTI: '/multi',
  RANKING: '/ranking',
  DICTIONARY: '/dictionary',
  MYPAGE: '/mypage',
} as const
```

---

## 🚫 절대 하면 안 되는 것 (CLI도 동일 적용)

| 금지 사항 | 이유 |
|---|---|
| `features/single/` 안에 소켓 파일 추가 | 싱글은 REST API만, WebSocket 미사용 확정 |
| `core/` 안에 도메인(게임 모드) 이름 사용 | core는 인프라만, 도메인 개념 없음 |
| `pages/` 안에 API 호출 또는 상태 관리 | pages는 조립만, 로직은 features 안에 |
| Phaser Scene에서 React import | EventBus 경유만 허용 |
| WebSocket 패킷에 `.parse()` 사용 | 게임 중 터짐 — `.safeParse()` 만 허용 |
| `assets/character/` 네이밍 임의 변경 | BE 합의 기준 그대로 사용 |
| 서버 데이터를 Zustand/Jotai에 중복 저장 | TanStack Query가 관리 — store에 넣지 말 것 |

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

2. 같은 폴더 안에서 무슨 역할인가?
   화면 렌더링      → components/
   상태 구독/이벤트 → hooks/
   상태 저장        → store/
   타입 정의        → types/
   서버 통신        → api/
   Phaser 씬        → scenes/

3. 이 파일이 삭제될 때 같이 삭제될 파일이 같은 폴더에 있는가?
   Yes → 잘 배치된 것
   No  → 폴더 위치 재검토
```

---

## 🔖 모드별 점수 방식 확정 (개발 시 참고)

| 모드 | 점수 기준 | 비고 |
|---|---|---|
| 싱글 | 시간/목숨/콤보/오타 기반 | 프론트 계산 후 서버 전송 |
| 기여도 뺏기 | 기여도 % 기반 | BE에서 계산 후 전달 |
| 타임어택 | commit 수 기반 | `totalCount` 필드 사용 |
| 협력 | 소요 시간 기반 (팀 단위) | `elapsedTime` 필드 사용 |

---

## 🔖 협력 GAME_END rankings 필드 확정

팀 단위로 보여주기로 확정. BE 임시안 그대로 사용.

```ts
interface CoopRankingEntry {
  rank: number
  roomId: string
  elapsedTime: number   // 소요 시간 (초)
  completedAt: number   // 완료 타임스탬프 (Long)
}
```
