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

## 7. Import 순서

1. External (react, jotai, phaser 등)
2. Internal (@/ 절대 경로)
3. Relative (../, ./)
4. Types (import type)
5. Styles

## 8. 데이터 통신

- any 타입 사용 금지, 모든 API 응답은 Zod 스키마 검증 후 사용
- 컴포넌트 내부에서 직접 axios 호출 금지
- features/{domain}/api에 정의된 함수를 TanStack Query와 조합하여 호출

## 9. 경로 사용

- `../` 두 번 이상 → 절대경로
- `../` 한 번이면 → 상대경로
- ex) `features/game` 안의 파일들을 참조한느 경우 상대경로, `features/game` 안의 파일을 수정 중인데 `features/auth` 나 `shared/button` 과 같은 식으로 다른 폴더로 나가는 경우 절대경로
