# IMPLEMENTATION_ROOM_LEAVE_HOST_DELEGATED

## Background / Context

방 나가기 명세는 V3 기준으로 클라이언트가 WebSocket `LEAVE` 메시지를 발행하지 않고,
기존 REST API `DELETE /api/v1/rooms/{roomId}/leave` 호출로 정상 퇴장을 처리하도록 정리되어 있다.

기존 `RoomService.leaveRoom()`은 Redis에서 멤버를 제거하고, 방장이 나간 경우 `hostMemberId`를 갱신하거나 방을 해산하는 처리만 수행했다.
따라서 대기실을 구독 중인 클라이언트가 퇴장 사실과 방장 변경을 실시간으로 동기화할 수 없었다.

또한 방장 위임 시 `room:{roomId}:info.hostMemberId`만 갱신하면
`room:{roomId}:members`에 저장된 Player JSON의 `isHost` 값이 이전 상태로 남아
`remainMembers` 응답과 실제 방장 상태가 불일치할 수 있었다.

## Decision

기존 REST API URL은 유지하고, `RoomService.leaveRoom()`의 Redis 락 구간에서 퇴장 후 상태를 확정한다.

- 일반 멤버 퇴장:
  - `removeMember`
  - 퇴장 후 `remainMembers` 조회
  - `/topic/room/{roomId}`로 `PLAYER_LEFT` 발행
- 방장 퇴장 + 남은 인원 있음:
  - `removeMember`
  - 남은 멤버 중 새 방장을 랜덤 선정
  - `hostMemberId` 갱신
  - `room:{roomId}:members`의 `isHost` 플래그를 새 방장 기준으로 갱신
  - `/topic/room/{roomId}`로 `PLAYER_LEFT` 발행 후 `HOST_DELEGATED` 발행
- 마지막 인원 퇴장:
  - `removeMember`
  - `dissolveRoom`
  - 수신 대상이 없으므로 `PLAYER_LEFT`, `HOST_DELEGATED` 모두 발행하지 않음

이벤트 전송은 Redis 상태 변경이 끝난 뒤 수행한다.
단, 이벤트 페이로드는 락 안에서 확정된 퇴장 후 `remainMembers` 스냅샷을 사용한다.

## Why

퇴장, 방장 선정, Player JSON의 `isHost` 갱신을 같은 방 락 안에서 처리해야 동시 퇴장 상황에서 방장 위임이 중복 발생할 가능성을 줄일 수 있다.

`HOST_DELEGATED`의 `remainMembers`는 새 방장 `isHost=true`가 반영되어야 하므로,
Redis의 `hostMemberId`와 멤버 JSON을 함께 갱신한 뒤 같은 목록을 `PLAYER_LEFT`와 `HOST_DELEGATED`에 사용했다.
이렇게 하면 두 이벤트 모두 퇴장 후 실제 방장 상태와 같은 멤버 목록을 전달한다.

## Caution

- 마지막 인원이 나간 경우에는 이벤트를 발행하지 않는다.
- WebSocket 전송 실패는 REST 퇴장 성공을 되돌리지 않는다. `RoomWebSocketEventPublisher`에서 경고 로그만 남긴다.
- `member:{memberId}:room`만 남아 있고 members Hash에 멤버가 없는 복구 상황에서는 닉네임을 DB 기준으로 조회한다.
- 현재 구현은 정상 REST 퇴장 흐름에 적용된다. 비정상 disconnect 처리에서 같은 서비스를 호출하면 동일 이벤트가 발행된다.

## Test Plan

- 일반 멤버 퇴장 시 `PLAYER_LEFT`만 발행되는지 확인
- 방장 퇴장 시 `PLAYER_LEFT` 후 `HOST_DELEGATED` 순서로 발행되는지 확인
- 마지막 인원 퇴장 시 방이 해산되고 이벤트가 발행되지 않는지 확인
- 방장 위임 시 `room:{roomId}:members`의 `isHost` 값이 새 방장 기준으로 갱신되는지 확인
- 이벤트 destination이 `/topic/room/{roomId}`인지 확인
