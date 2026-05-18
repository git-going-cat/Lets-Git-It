package com.gitcat.letsgitit.domain.room.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.gitcat.letsgitit.domain.room.dto.response.KickMemberResultResponse;
import com.gitcat.letsgitit.domain.room.dto.response.KickedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerKickedResponse;
import com.gitcat.letsgitit.domain.room.dto.websocket.response.HostDelegatedResponse;
import com.gitcat.letsgitit.domain.room.dto.websocket.response.PlayerJoinedResponse;
import com.gitcat.letsgitit.domain.room.dto.websocket.response.PlayerLeftResponse;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

class RoomWebSocketEventPublisherTest {

	private final WebSocketMessageSender webSocketMessageSender = mock(WebSocketMessageSender.class);
	private final RoomWebSocketEventPublisher publisher = new RoomWebSocketEventPublisher(webSocketMessageSender);

	@Test
	void PLAYER_JOINED_이벤트를_roomTopic으로_전송한다() {
		Long roomId = 1L;
		UUID hostId = UUID.randomUUID();
		UUID joinedPlayerId = UUID.randomUUID();
		PlayerInfoDto host = player(hostId, true, true);
		PlayerInfoDto joinedPlayer = player(joinedPlayerId, false, false);
		List<PlayerInfoDto> allMembers = List.of(host, joinedPlayer);

		publisher.publishPlayerJoined(roomId, RoomState.WAITING, joinedPlayerId, allMembers);

		ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
		verify(webSocketMessageSender).send(eq("/topic/room/1"), payloadCaptor.capture());

		PlayerJoinedResponse payload = (PlayerJoinedResponse)payloadCaptor.getValue();
		assertThat(payload.type()).isEqualTo("PLAYER_JOINED");
		assertThat(payload.roomState()).isEqualTo(RoomState.WAITING);
		assertThat(payload.joinedPlayer()).isEqualTo(joinedPlayer);
		assertThat(payload.allMembers()).containsExactly(host, joinedPlayer);
	}

	@Test
	void joinedPlayer가_allMembers에_없으면_이벤트_발행을_생략한다() {
		Long roomId = 1L;
		UUID joinedPlayerId = UUID.randomUUID();
		List<PlayerInfoDto> allMembers = List.of(player(UUID.randomUUID(), true, true));

		assertThatCode(() -> publisher.publishPlayerJoined(roomId, RoomState.WAITING, joinedPlayerId, allMembers))
			.doesNotThrowAnyException();

		verify(webSocketMessageSender, never()).send(anyString(), any());
	}

	@Test
	void PLAYER_LEFT_이벤트를_roomTopic으로_전송한다() {
		Long roomId = 1L;
		UUID leftPlayerId = UUID.randomUUID();
		PlayerInfoDto remainPlayer = player(UUID.randomUUID(), true, true);
		List<PlayerInfoDto> remainMembers = List.of(remainPlayer);

		publisher.publishPlayerLeft(roomId, leftPlayerId, "dobby", remainMembers, "WAITING");

		ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
		verify(webSocketMessageSender).send(eq("/topic/room/1"), payloadCaptor.capture());

		PlayerLeftResponse payload = (PlayerLeftResponse)payloadCaptor.getValue();
		assertThat(payload.type()).isEqualTo("PLAYER_LEFT");
		assertThat(payload.leftPlayerId()).isEqualTo(leftPlayerId);
		assertThat(payload.leftPlayerNickname()).isEqualTo("dobby");
		assertThat(payload.remainMembers()).containsExactly(remainPlayer);
		assertThat(payload.roomState()).isEqualTo("WAITING");
	}

	@Test
	void HOST_DELEGATED_이벤트를_roomTopic으로_전송한다() {
		Long roomId = 1L;
		UUID newHostId = UUID.randomUUID();
		PlayerInfoDto newHost = player(newHostId, false, true);
		List<PlayerInfoDto> remainMembers = List.of(newHost);

		publisher.publishHostDelegated(roomId, newHostId, remainMembers);

		ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
		verify(webSocketMessageSender).send(eq("/topic/room/1"), payloadCaptor.capture());

		HostDelegatedResponse payload = (HostDelegatedResponse)payloadCaptor.getValue();
		assertThat(payload.type()).isEqualTo("HOST_DELEGATED");
		assertThat(payload.newHostId()).isEqualTo(newHostId);
		assertThat(payload.newHostNickname()).isEqualTo("nickname");
		assertThat(payload.remainMembers()).containsExactly(newHost);
	}

	@Test
	void WebSocket_전송_실패가_예외를_전파하지_않는다() {
		Long roomId = 1L;
		UUID joinedPlayerId = UUID.randomUUID();
		List<PlayerInfoDto> allMembers = List.of(player(joinedPlayerId, false, false));
		doThrow(new IllegalStateException("send failed")).when(webSocketMessageSender).send(anyString(), any());

		assertThatCode(() -> publisher.publishPlayerJoined(roomId, RoomState.WAITING, joinedPlayerId, allMembers))
			.doesNotThrowAnyException();
	}

	@Nested
	class PublishPlayerKicked {

		@Test
		void KICKED_유니캐스트와_PLAYER_KICKED_브로드캐스트를_모두_전송한다() {
			Long roomId = 1L;
			UUID kickedPlayerId = UUID.randomUUID();
			List<PlayerInfoDto> remainMembers = List.of(player(UUID.randomUUID(), true, true));
			KickMemberResultResponse result = new KickMemberResultResponse(kickedPlayerId, "kicked", remainMembers);

			publisher.publishPlayerKicked(roomId, kickedPlayerId.toString(), result);

			// 유니캐스트 검증
			ArgumentCaptor<KickedResponse> unicastCaptor = ArgumentCaptor.forClass(KickedResponse.class);
			verify(webSocketMessageSender).sendToUser(eq(kickedPlayerId.toString()), unicastCaptor.capture());
			assertThat(unicastCaptor.getValue().type()).isEqualTo("KICKED");
			assertThat(unicastCaptor.getValue().playerId()).isEqualTo(kickedPlayerId);

			// 브로드캐스트 검증
			ArgumentCaptor<PlayerKickedResponse> broadcastCaptor = ArgumentCaptor.forClass(PlayerKickedResponse.class);
			verify(webSocketMessageSender).send(eq("/topic/room/1"), broadcastCaptor.capture());
			assertThat(broadcastCaptor.getValue().type()).isEqualTo("PLAYER_KICKED");
			assertThat(broadcastCaptor.getValue().playerId()).isEqualTo(kickedPlayerId);
		}

		@Test
		void 유니캐스트_실패해도_브로드캐스트는_전송된다() {
			Long roomId = 1L;
			UUID kickedPlayerId = UUID.randomUUID();
			List<PlayerInfoDto> remainMembers = List.of(player(UUID.randomUUID(), true, true));
			KickMemberResultResponse result = new KickMemberResultResponse(kickedPlayerId, "kicked", remainMembers);

			doThrow(new IllegalStateException("unicast failed"))
				.when(webSocketMessageSender).sendToUser(anyString(), any());

			assertThatCode(() -> publisher.publishPlayerKicked(roomId, kickedPlayerId.toString(), result))
				.doesNotThrowAnyException();

			// 유니캐스트 실패 후에도 브로드캐스트 호출 검증
			verify(webSocketMessageSender).send(eq("/topic/room/1"), any(PlayerKickedResponse.class));
		}

		@Test
		void 브로드캐스트_실패해도_예외를_전파하지_않는다() {
			Long roomId = 1L;
			UUID kickedPlayerId = UUID.randomUUID();
			List<PlayerInfoDto> remainMembers = List.of(player(UUID.randomUUID(), true, true));
			KickMemberResultResponse result = new KickMemberResultResponse(kickedPlayerId, "kicked", remainMembers);

			doThrow(new IllegalStateException("broadcast failed"))
				.when(webSocketMessageSender).send(anyString(), any());

			assertThatCode(() -> publisher.publishPlayerKicked(roomId, kickedPlayerId.toString(), result))
				.doesNotThrowAnyException();

			// 유니캐스트는 정상 호출됨
			verify(webSocketMessageSender).sendToUser(eq(kickedPlayerId.toString()), any(KickedResponse.class));
		}

		@Test
		void 유니캐스트와_브로드캐스트_모두_실패해도_예외를_전파하지_않는다() {
			Long roomId = 1L;
			UUID kickedPlayerId = UUID.randomUUID();
			List<PlayerInfoDto> remainMembers = List.of(player(UUID.randomUUID(), true, true));
			KickMemberResultResponse result = new KickMemberResultResponse(kickedPlayerId, "kicked", remainMembers);

			doThrow(new IllegalStateException("unicast failed"))
				.when(webSocketMessageSender).sendToUser(anyString(), any());
			doThrow(new IllegalStateException("broadcast failed"))
				.when(webSocketMessageSender).send(anyString(), any());

			assertThatCode(() -> publisher.publishPlayerKicked(roomId, kickedPlayerId.toString(), result))
				.doesNotThrowAnyException();
		}
	}

	private PlayerInfoDto player(UUID playerId, boolean isReady, boolean isHost) {
		return new PlayerInfoDto(
			playerId,
			"nickname",
			"Hair_01",
			"Hair-color_01",
			"Body_01",
			"Eye_01",
			"Outfit_01",
			"Outfit-color_01",
			isReady,
			isHost);
	}
}
