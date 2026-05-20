package com.gitcat.letsgitit.domain.room.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.security.Principal;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomStateResponse;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

class RoomStateSubscribeEventListenerTest {

	private final RoomService roomService = mock(RoomService.class);
	private final WebSocketMessageSender webSocketMessageSender = mock(WebSocketMessageSender.class);
	private final RoomStateSubscribeEventListener listener = new RoomStateSubscribeEventListener(roomService,
		webSocketMessageSender);

	@Test
	void roomTopic을_구독하면_ROOM_STATE를_구독자에게_유니캐스트한다() {
		UUID memberId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
		ContributionRoomStateResponse response = new ContributionRoomStateResponse(
			"CONTRIBUTION_ROOM_STATE",
			1L,
			"ABC123",
			"방 제목",
			null,
			null,
			1,
			4,
			false,
			null);
		when(roomService.getRoomState(memberId, 1L)).thenReturn(response);

		listener.onApplicationEvent(subscribeEvent("/topic/room/1", memberId));

		verify(roomService).getRoomState(memberId, 1L);
		verify(webSocketMessageSender).sendToUser(memberId.toString(), response);
	}

	@Test
	void roomTopic이_아닌_구독은_무시한다() {
		UUID memberId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");

		listener.onApplicationEvent(subscribeEvent("/topic/room/1/coop", memberId));

		verify(roomService, never()).getRoomState(any(), anyLong());
		verify(webSocketMessageSender, never()).send(anyString(), any());
		verify(webSocketMessageSender, never()).sendToUser(anyString(), any());
	}

	@Test
	void principal이_null이면_getRoomState를_호출하지_않는다() {
		StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
		accessor.setDestination("/topic/room/1");
		Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

		listener.onApplicationEvent(new SessionSubscribeEvent(this, message));

		verify(roomService, never()).getRoomState(any(), anyLong());
		verify(webSocketMessageSender, never()).sendToUser(anyString(), any());
	}

	@Test
	void ROOM_STATE_조회_비즈니스_예외는_ERROR로_유니캐스트한다() {
		UUID memberId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
		when(roomService.getRoomState(memberId, 1L))
			.thenThrow(new BusinessException(ErrorCode.PLAYER_NOT_IN_ROOM));

		assertThatNoException()
			.isThrownBy(() -> listener.onApplicationEvent(subscribeEvent("/topic/room/1", memberId)));

		verify(webSocketMessageSender).sendToUser(
			eq(memberId.toString()),
			eq(WebSocketErrorResponse.of("PLAYER_NOT_IN_ROOM", "해당 방에 참여하지 않은 플레이어입니다.")));
	}

	@Test
	void ROOM_STATE_조회_예상치_못한_예외는_INTERNAL_SERVER_ERROR로_유니캐스트한다() {
		UUID memberId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
		when(roomService.getRoomState(memberId, 1L))
			.thenThrow(new IllegalStateException("broken room state"));

		assertThatNoException()
			.isThrownBy(() -> listener.onApplicationEvent(subscribeEvent("/topic/room/1", memberId)));

		verify(webSocketMessageSender).sendToUser(
			eq(memberId.toString()),
			eq(WebSocketErrorResponse.of("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.")));
	}

	private SessionSubscribeEvent subscribeEvent(String destination, UUID memberId) {
		StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
		accessor.setDestination(destination);
		accessor.setUser((Principal)() -> memberId.toString());
		Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
		return new SessionSubscribeEvent(this, message);
	}
}
