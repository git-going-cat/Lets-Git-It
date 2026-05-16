package com.gitcat.letsgitit.domain.room.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.domain.room.dto.response.HostTransferredResponse;
import com.gitcat.letsgitit.domain.room.dto.response.KickMemberResultResponse;
import com.gitcat.letsgitit.domain.room.dto.response.KickedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerKickedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ReadyChangedResponse;
import com.gitcat.letsgitit.domain.room.dto.websocket.response.PlayerJoinedResponse;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoomWebSocketEventPublisher {

	private static final String ROOM_TOPIC_PREFIX = "/topic/room/";

	private final WebSocketMessageSender webSocketMessageSender;

	public void publishPlayerJoined(Long roomId, RoomState roomState, UUID joinedPlayerId,
		List<PlayerInfoDto> allMembers) {
		try {
			PlayerInfoDto joinedPlayer = allMembers.stream()
				.filter(player -> player.playerId().equals(joinedPlayerId))
				.findFirst()
				.orElseThrow(() -> new IllegalStateException("Joined player not found in room members"));

			webSocketMessageSender.send(
				ROOM_TOPIC_PREFIX + roomId,
				PlayerJoinedResponse.of(roomState, joinedPlayer, allMembers));
		} catch (RuntimeException e) {
			log.warn(
				"[room][publishPlayerJoined] PLAYER_JOINED publish failed. roomId={}, joinedPlayerId={}, reason={}",
				roomId, joinedPlayerId, e.getClass().getSimpleName(), e);
		}
	}

	public void publishPlayerKicked(Long roomId, String kickedPlayerId, KickMemberResultResponse result) {
		// 유니캐스트와 브로드캐스트를 별도 try-catch로 분리하여 한쪽 실패가 다른 전송을 막지 않도록 함
		// 최종 상태 정합성은 room state fallback API 기준으로 복구
		publishKickedToPlayer(roomId, kickedPlayerId, result);
		publishPlayerKickedToRoom(roomId, kickedPlayerId, result);
	}

	private void publishKickedToPlayer(Long roomId, String kickedPlayerId, KickMemberResultResponse result) {
		try {
			webSocketMessageSender.sendToUser(
				kickedPlayerId,
				KickedResponse.of(result.kickedPlayerId(), roomId));

			log.info("[room][publishKickedToPlayer] KICKED unicast sent. roomId={}, kickedPlayerId={}",
				roomId, kickedPlayerId);
		} catch (RuntimeException e) {
			log.warn(
				"[room][publishKickedToPlayer] KICKED unicast failed. roomId={}, kickedPlayerId={}, reason={}",
				roomId, kickedPlayerId, e.getClass().getSimpleName(), e);
		}
	}

	private void publishPlayerKickedToRoom(Long roomId, String kickedPlayerId, KickMemberResultResponse result) {
		try {
			webSocketMessageSender.send(
				ROOM_TOPIC_PREFIX + roomId,
				PlayerKickedResponse.of(result.kickedPlayerId(), result.kickedNickname(), result.remainMembers()));

			log.info("[room][publishPlayerKickedToRoom] PLAYER_KICKED broadcast sent. roomId={}, kickedPlayerId={}",
				roomId, kickedPlayerId);
		} catch (RuntimeException e) {
			log.warn(
				"[room][publishPlayerKickedToRoom] PLAYER_KICKED broadcast failed. roomId={}, kickedPlayerId={}, reason={}",
				roomId, kickedPlayerId, e.getClass().getSimpleName(), e);
		}
	}

	public void publishHostTransferred(Long roomId, HostTransferredResponse response) {
		try {
			webSocketMessageSender.send(ROOM_TOPIC_PREFIX + roomId, response);

			log.info("[room][publishHostTransferred] HOST_TRANSFERRED published. roomId={}, newHostId={}",
				roomId, response.newHostId());
		} catch (RuntimeException e) {
			log.warn(
				"[room][publishHostTransferred] HOST_TRANSFERRED publish failed. roomId={}, newHostId={}, reason={}",
				roomId, response.newHostId(), e.getClass().getSimpleName(), e);
		}
	}

	public void publishReadyChanged(Long roomId, ReadyChangedResponse response) {
		try {
			webSocketMessageSender.send(ROOM_TOPIC_PREFIX + roomId, response);

			log.info("[room][publishReadyChanged] READY_CHANGED published. roomId={}, playerId={}, isReady={}",
				roomId, response.playerId(), response.isReady());
		} catch (RuntimeException e) {
			log.warn(
				"[room][publishReadyChanged] READY_CHANGED publish failed. roomId={}, playerId={}, reason={}",
				roomId, response.playerId(), e.getClass().getSimpleName(), e);
		}
	}
}
