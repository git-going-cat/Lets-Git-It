package com.gitcat.letsgitit.domain.competitive.controller;

import java.security.Principal;
import java.util.UUID;

import jakarta.validation.Valid;

import org.slf4j.MDC;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionExpireRequestMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionGameEndMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputMessage;
import com.gitcat.letsgitit.domain.competitive.service.ContributionGameService;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;
import com.gitcat.letsgitit.global.websocket.auth.StompPrincipal;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ContributionHandler {

	private final ContributionGameService contributionGameService;
	private final RoomService roomService;
	private final WebSocketMessageSender messageSender;

	@MessageMapping("/room/{roomId}/contribution/commands")
	public void inputCommand(
		@DestinationVariable
		Long roomId,
		@Valid @Payload
		ContributionInputMessage request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		MDC.put("nickname", principal instanceof StompPrincipal sp ? sp.nickname() : "");
		try {
			log.info("[CONTRIBUTION] WebSocket SEND. destination=/room/{}/contribution/commands", roomId);
			if (principal == null) {
				log.warn("[CONTRIBUTION] missing principal. roomId={}, sessionId={}",
					roomId, headerAccessor.getSessionId());
				if (headerAccessor.getSessionId() != null) {
					messageSender.sendToSession(
						headerAccessor.getSessionId(),
						WebSocketErrorResponse.of(
							ErrorCode.AUTHENTICATION_REQUIRED.getCode(),
							ErrorCode.AUTHENTICATION_REQUIRED.getMessage()));
				}
				return;
			}
			UUID memberId = UUID.fromString(principal.getName());
			ContributionInputResult result = contributionGameService.processInput(roomId, memberId, request);
			sendResult(roomId, memberId, result);
		} finally {
			MDC.clear();
		}
	}

	@MessageMapping("/room/{roomId}/contribution/commands/expire")
	public void expireCommand(
		@DestinationVariable
		Long roomId,
		@Valid @Payload
		ContributionExpireRequestMessage request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		MDC.put("nickname", principal instanceof StompPrincipal sp ? sp.nickname() : "");
		try {
			log.info("[CONTRIBUTION] WebSocket SEND. destination=/room/{}/contribution/commands/expire", roomId);
			if (principal == null) {
				log.warn("[CONTRIBUTION] missing principal. roomId={}, sessionId={}",
					roomId, headerAccessor.getSessionId());
				if (headerAccessor.getSessionId() != null) {
					messageSender.sendToSession(
						headerAccessor.getSessionId(),
						WebSocketErrorResponse.of(
							ErrorCode.AUTHENTICATION_REQUIRED.getCode(),
							ErrorCode.AUTHENTICATION_REQUIRED.getMessage()));
				}
				return;
			}
			UUID memberId = UUID.fromString(principal.getName());
			ContributionInputResult result = contributionGameService.processExpireRequest(roomId, memberId, request);
			sendResult(roomId, memberId, result);
		} finally {
			MDC.clear();
		}
	}

	private void sendResult(Long roomId, UUID memberId, ContributionInputResult result) {
		if (result == null || result.payload() == null) {
			return;
		}
		if (result.broadcast()) {
			resetRoomIfGameCompleted(roomId, result);
			for (Object payload : result.payloads()) {
				messageSender.send("/topic/room/" + roomId + "/contribution", payload);
			}
			return;
		}
		messageSender.sendToUser(memberId.toString(), result.payload());
	}

	private void resetRoomIfGameCompleted(Long roomId, ContributionInputResult result) {
		result.payloads().stream()
			.filter(ContributionGameEndMessage.class::isInstance)
			.map(ContributionGameEndMessage.class::cast)
			.filter(ContributionGameEndMessage::isSuccess)
			.findFirst()
			.ifPresent(gameEnd -> {
				roomService.resetRoomAfterGame(roomId);
				contributionGameService.deleteSession(gameEnd.gameSessionId());
			});
	}
}
