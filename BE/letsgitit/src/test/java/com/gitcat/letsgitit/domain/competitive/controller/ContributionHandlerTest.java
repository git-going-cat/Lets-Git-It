package com.gitcat.letsgitit.domain.competitive.controller;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionExpireRequestMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionGameEndMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputMessage;
import com.gitcat.letsgitit.domain.competitive.service.ContributionGameService;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

class ContributionHandlerTest {

	private ContributionGameService contributionGameService;
	private RoomService roomService;
	private WebSocketMessageSender messageSender;
	private ContributionHandler handler;

	@BeforeEach
	void setUp() {
		contributionGameService = mock(ContributionGameService.class);
		roomService = mock(RoomService.class);
		messageSender = mock(WebSocketMessageSender.class);
		handler = new ContributionHandler(contributionGameService, roomService, messageSender);
	}

	@Test
	void Principal이_없으면_인증_에러를_반환하고_게임_로직을_호출하지_않는다() {
		// given
		SimpMessageHeaderAccessor headerAccessor = mock(SimpMessageHeaderAccessor.class);
		when(headerAccessor.getSessionId()).thenReturn("session-1");
		ContributionInputMessage request = new ContributionInputMessage(
			"CONTRIBUTION_INPUT",
			UUID.randomUUID(),
			UUID.randomUUID(),
			0,
			"git add .");

		// when
		handler.inputCommand(1L, request, null, headerAccessor);

		// then
		verify(messageSender).sendToSession(
			org.mockito.ArgumentMatchers.eq("session-1"),
			argThat(payload -> {
				WebSocketErrorResponse response = (WebSocketErrorResponse)payload;
				return ErrorCode.AUTHENTICATION_REQUIRED.getCode().equals(response.code());
			}));
		verify(contributionGameService, never()).processInput(
			org.mockito.ArgumentMatchers.any(),
			org.mockito.ArgumentMatchers.any(),
			org.mockito.ArgumentMatchers.any());
	}

	@Test
	void 만료요청_Principal이_없으면_인증_에러를_반환하고_게임_로직을_호출하지_않는다() {
		// given
		SimpMessageHeaderAccessor headerAccessor = mock(SimpMessageHeaderAccessor.class);
		when(headerAccessor.getSessionId()).thenReturn("session-1");
		ContributionExpireRequestMessage request = new ContributionExpireRequestMessage(
			"COMMAND_EXPIRE_REQUEST",
			UUID.randomUUID(),
			UUID.randomUUID(),
			0);

		// when
		handler.expireCommand(1L, request, null, headerAccessor);

		// then
		verify(messageSender).sendToSession(
			org.mockito.ArgumentMatchers.eq("session-1"),
			argThat(payload -> {
				WebSocketErrorResponse response = (WebSocketErrorResponse)payload;
				return ErrorCode.AUTHENTICATION_REQUIRED.getCode().equals(response.code());
			}));
		verify(contributionGameService, never()).processExpireRequest(
			org.mockito.ArgumentMatchers.any(),
			org.mockito.ArgumentMatchers.any(),
			org.mockito.ArgumentMatchers.any());
	}

	@Test
	void 정상_게임종료_브로드캐스트_전_방을_대기상태로_복구하고_세션을_삭제한다() {
		// given
		Long roomId = 1L;
		UUID memberId = UUID.randomUUID();
		UUID gameSessionId = UUID.randomUUID();
		Principal principal = () -> memberId.toString();
		SimpMessageHeaderAccessor headerAccessor = mock(SimpMessageHeaderAccessor.class);
		when(headerAccessor.getSessionId()).thenReturn("session-1");
		ContributionInputMessage request = new ContributionInputMessage(
			"CONTRIBUTION_INPUT",
			gameSessionId,
			UUID.randomUUID(),
			0,
			"git add .");
		ContributionGameEndMessage gameEnd = ContributionGameEndMessage.completed(gameSessionId, List.of(), null);
		when(contributionGameService.processInput(roomId, memberId, request))
			.thenReturn(ContributionInputResult.broadcasts(List.of("SCORE_UPDATE", gameEnd)));

		// when
		handler.inputCommand(roomId, request, principal, headerAccessor);

		// then
		InOrder inOrder = inOrder(roomService, contributionGameService, messageSender);
		inOrder.verify(roomService).resetRoomAfterGame(roomId);
		inOrder.verify(contributionGameService).deleteSession(gameSessionId);
		inOrder.verify(messageSender).send(eq("/topic/room/1/contribution"), eq("SCORE_UPDATE"));
		inOrder.verify(messageSender).send(eq("/topic/room/1/contribution"), eq(gameEnd));
	}
}
