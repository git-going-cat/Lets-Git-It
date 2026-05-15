package com.gitcat.letsgitit.domain.room.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
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
}
