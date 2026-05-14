# 웹소켓 예외 처리 및 강퇴 구현

## Background / Context

- `/user/queue/private`에서 오는 `FORCE_DISCONNECT`, `KICKED`, `ERROR`는 어떤 도메인 화면에서든 동일하게 처리해야 하는 공통 이벤트
- `SocketManager`는 core 레이어라 도메인 개념을 모르므로 이 처리를 `SocketManager` 안에 넣을 수 없었음
- 각 도메인 훅마다 중복 구현하면 누락 위험이 있고 일관성이 깨짐

## Decision

- `features/multi/hooks/useSocketPrivateChannel.ts` 공통 훅으로 구현
- `/user/queue/private` 구독, `BaseMessageSchema`로 type 분기, 각 케이스별 Zod 스키마 추가 검증 후 처리
- `FORCE_DISCONNECT` 수신 시: `socketManager.disconnect()` 즉시 호출 후 `onForceDisconnect` 콜백 실행
  - 라우팅 처리는 호출하는 쪽에서 담당
- `KICKED` 수신 시: `socketManager.disconnect()` 즉시 호출 후 `onKicked(roomId)` 콜백 실행
- `ERROR` 수신 시: `console.error` 후 `onError` 콜백 실행 (optional)
- `safeParse` 실패 시 `console.error` 후 폐기, UI 중단 없음
- 언마운트 시 구독 해제 (`useEffect` cleanup)

## Why

- 공통 훅으로 분리
  - 대기실/게임 어느 화면에서든 이 훅 하나만 마운트하면 `FORCE_DISCONNECT`, `KICKED` 공통 처리가 보장됨
  - 누락 위험 제거
- 콜백 주입 방식
  - 실제 라우팅이나 UI 처리는 호출하는 쪽에서 결정
  - 훅 자체는 소켓 이벤트 감지와 disconnect만 담당해 관심사 분리

## Caution

- 이 훅은 `/user/queue/private` 구독을 담당하므로 다른 훅에서 같은 경로를 중복 구독하면 안 됨
  - `SocketManager`의 key 기반 중복 구독 방지로 두 번째 구독은 무시됨
- `FORCE_DISCONNECT`, `KICKED` 수신 시 `socketManager.disconnect()`를 훅 내부에서 즉시 호출하므로 호출하는 쪽에서 별도로 disconnect 호출 불필요
- 콜백은 `useEffect` 의존성에 포함되므로 호출하는 쪽에서 필요하면 `useCallback`으로 안정화하는 것을 권장

## Test Plan

- `npm run build`
- `npm run lint`
- 훅 파일 단독 Prettier check
- `BaseMessageSchema.safeParse()` 이후 케이스별 스키마 검증 흐름 확인
