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
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputMessage;
import com.gitcat.letsgitit.domain.competitive.service.ContributionGameService;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ContributionHandler {

	private final ContributionGameService contributionGameService;
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
		try {
			if (principal == null) {
				log.warn("[contribution][input] missing principal. roomId={}, sessionId={}",
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
			if (result.broadcast()) {
				messageSender.send("/topic/room/" + roomId + "/contribution", result.payload());
				return;
			}
			messageSender.sendToUser(memberId.toString(), result.payload());
		} finally {
			MDC.clear();
		}
	}
}
