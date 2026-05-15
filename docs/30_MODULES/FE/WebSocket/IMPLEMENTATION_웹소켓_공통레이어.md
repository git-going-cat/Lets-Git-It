# 웹소켓 공통 레이어 구현

## Background / Context

- `FE/src/core/socket/SocketManager.ts`, `FE/src/shared/types/socket.types.ts`가 TODO 상태였음
- FE WebSocket 구현 기준 문서가 없었음
- 기존 `FE_CONVENTION.md`에 `emit/on`, SockJS, Socket.IO 방식 표현이 남아있었음
- 팀원이 WebSocket 작업 시 참고할 기준이 없는 상태였음

## Decision

- STOMP + 순수 WebSocket 기반으로 `SocketManager` 구현 (SockJS 미사용)
- `emit/on` 대신 `publish/subscribe` 메서드명 사용 (STOMP 프로토콜 용어 일치)
- 토큰은 `connect(token)` 시점에 외부 주입 방식으로 분리
  - `SocketManager` 내부에서 `useAuthStore` 직접 import 금지
- `brokerURL: env.WS_URL` 직접 사용
- 개인 구독 경로를 `/user/queue/private`로 통일
- 연결 전 `subscribe` 호출 시 pending queue(`pendingSubscriptions`)에 적재 후 `onConnect` 시 자동 flush
- `docs/30_MODULES/FE/WEBSOCKET_GUIDE.md` 신규 작성 (15챕터 구조)
- `FE_CONVENTION.md` 13장 WebSocket 섹션 업데이트

## Why

- SockJS 미사용: BE가 순수 WebSocket 방식으로 구현하기로 확정
- 토큰 외부 주입: `core` 레이어가 `features/auth`에 의존하지 않도록 레이어 분리
  - `core/http.ts`는 기존 패턴(직접 import)을 유지하지만, WebSocket은 새로 구축하는 만큼 더 나은 구조로 시작
- `publish/subscribe`: STOMP 공식 용어와 일치시켜 혼란 방지
  - 기존 `emit/on`은 Socket.IO 용어라 이 프로젝트에 맞지 않음
- pending queue 패턴: 구독 등록 순서와 연결 완료 순서가 다를 수 있어 연결 전 `subscribe` 호출도 안전하게 처리

## Caution

- `SocketManager` 내부에 도메인명(`coop`, `contribution` 등) 등장 금지
- 컴포넌트에서 `socketManager` 직접 접근 금지, 반드시 feature hook 경유
- `publish` 호출 전 `connected` 상태 확인 필요
- `VITE_WS_URL`은 `.env`에 직접 설정하며 git에 커밋하지 않음
- WebSocket 패킷 검증은 반드시 `.safeParse()` 사용 (`.parse()` 금지)

## Test Plan

- `npm run build`
- `npm run lint`
- 변경 파일 단독 Prettier check
- SockJS, `emit/on`, `/queue/private`, Socket.IO 잔여 표현 검색
