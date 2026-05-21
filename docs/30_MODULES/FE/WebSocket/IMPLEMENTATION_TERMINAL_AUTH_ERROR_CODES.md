# Terminal Auth Error Codes

### Background / Context

WebSocket 연결 종료를 유발하는 인증 에러 코드는 STOMP error frame과 application-level `FORCE_DISCONNECT` 메시지 양쪽에서 처리된다.

기존에는 `TOKEN_BLACKLISTED`, `LOGGED_OUT`, `REPLACED_BY_NEW_LOGIN` 같은 종료성 에러 코드 Set이 `SocketManager`, 협력 모드, 대기실, 기여 모드, private channel hook에 각각 정의되어 있었다. 일부 경로에는 `TOKEN_BLACKLISTED`가 빠져 있어 서버가 같은 코드를 `FORCE_DISCONNECT`로 내려보낼 경우 화면별 처리가 달라질 수 있었다.

### Decision

`core/socket/SocketManager.ts`에서 `TERMINAL_AUTH_ERROR_CODES`를 export하고, WebSocket 인증 종료 여부를 판단하는 FE 경로가 모두 이 상수를 import해 사용하도록 통합했다.

적용 범위:

- `SocketManager` STOMP error frame 처리
- `features/coop/hooks/useCoopGame`
- `features/multi/hooks/useRoomSocket`
- `features/multi/hooks/useSocketPrivateChannel`
- `features/contribution/handlers/contributionSocketHandlers`

이렇게 하면 서버가 종료성 인증 에러를 STOMP error frame으로 보내든 `FORCE_DISCONNECT` 메시지로 보내든 FE 처리 기준이 일관된다.

### Test Plan

- `npm run format`
- `npm run lint`
- `npm run build`
- `FORCE_DISCONNECT` 코드가 `TOKEN_BLACKLISTED`, `LOGGED_OUT`, `REPLACED_BY_NEW_LOGIN` 중 하나일 때 각 화면에서 연결 종료 처리되는지 확인
