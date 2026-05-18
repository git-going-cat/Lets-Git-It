# IMPLEMENTATION_PLAYER_JOINED_WEBSOCKET_EVENT

## Background / Context

방 입장 REST API가 Redis 검증과 멤버 저장을 완료해도 대기실 구독자는 신규 입장자를 실시간으로 알 수 없었다.
명세의 `PLAYER_JOINED` 이벤트는 입장 성공 이후 `/topic/room/{roomId}` 구독자에게 현재 방 멤버 상태를 브로드캐스트해야 한다.

기존 방 입장 API 경로와 검증 로직은 이미 구현되어 있으므로 새 REST API를 추가하지 않고, 성공 응답을 조립한 직후 WebSocket 이벤트 발행만 연결해야 했다.

## Decision

기여도 뺏기/협력 방 입장 서비스가 Redis join lock을 잡고 멤버 저장과 `members` 스냅샷 조회를 완료한 직후 `RoomWebSocketEventPublisher`를 호출한다.
이벤트 destination은 `/topic/room/{roomId}`로 고정하고, payload는 `PlayerJoinedResponse` record로 분리했다.

`joinedPlayer`와 `allMembers`는 기존 Join 응답의 `members` 목록을 재사용한다.
해당 목록은 Redis 멤버 Hash에 방금 입장한 사용자를 저장한 이후 조립되므로 입장 이후 전체 상태를 반영한다.

이벤트 발행을 `RoomController`가 아닌 join lock 임계 구역 안으로 옮겨, 동시 입장 시 오래된 `allMembers` 스냅샷 이벤트가 더 늦게 발행되는 순서 역전 가능성을 줄였다.

## Caution

- 입장 실패, 방 없음, 정원 초과, 비밀번호 미검증 등 기존 서비스 검증 로직은 변경하지 않았다.
- 입장 확정 이후 WebSocket 발행이 실패해도 REST 입장 성공 응답이 실패하지 않도록 발행 예외는 로그만 남긴다.
- `PLAYER_JOINED` 발행은 room join lock 안에서 수행한다. publisher는 예외를 삼키므로 WebSocket 장애가 락 해제와 REST 응답을 막지 않는다.
- `PlayerInfoDto`의 boolean 계열 필드는 명세 필드명 유지를 위해 `isReady`, `isHost`로 직렬화되도록 `@JsonProperty`를 명시했다.
- 캐릭터 색상 필드는 명세 기준인 `characterOutfitColor`를 사용한다.

## Test Plan

- `RoomWebSocketEventPublisherTest`로 `/topic/room/{roomId}` destination과 `PLAYER_JOINED` payload 구성을 검증한다.
- 기여도 뺏기/협력 방 입장 서비스 테스트에서 `PLAYER_JOINED` 발행이 lock 해제보다 먼저 수행되는지 검증한다.
- joinedPlayer 조회 또는 WebSocket send 실패가 REST 입장 흐름을 깨지 않는지 단위 테스트로 검증한다.
- 방 입장 API 성공 후 STOMP 구독 클라이언트에서 `roomState`, `joinedPlayer`, `allMembers` 수신 여부를 확인한다.
