package com.gitcat.letsgitit.domain.room.controller;

import java.security.Principal;
import java.util.UUID;

import jakarta.validation.Valid;

import org.slf4j.MDC;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.gitcat.letsgitit.domain.room.dto.request.HostTransferRequest;
import com.gitcat.letsgitit.domain.room.dto.request.ReadyUpdateRequest;
import com.gitcat.letsgitit.domain.room.dto.response.HostTransferredResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ReadyChangedResponse;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.domain.room.service.RoomWebSocketEventPublisher;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;
import com.gitcat.letsgitit.global.websocket.auth.StompPrincipal;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequiredArgsConstructor
public class RoomHandler {

	private final RoomService roomService;
	private final RoomWebSocketEventPublisher roomWebSocketEventPublisher;
	private final WebSocketMessageSender messageSender;

	@MessageMapping("/room/{roomId}/ready")
	public void handleReady(
		@DestinationVariable
		Long roomId,
		@Valid @Payload
		ReadyUpdateRequest request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		MDC.put("nickname", principal instanceof StompPrincipal sp ? sp.nickname() : "");
		try {
			log.info("[ROOM] WebSocket SEND. destination=/room/{}/ready", roomId);
			if (principal == null) {
				log.warn("[ROOM] missing principal. roomId={}, sessionId={}", roomId, headerAccessor.getSessionId());
				if (headerAccessor.getSessionId() != null) {
					messageSender.sendToSession(headerAccessor.getSessionId(),
						WebSocketErrorResponse.of(ErrorCode.AUTHENTICATION_REQUIRED.getCode(),
							ErrorCode.AUTHENTICATION_REQUIRED.getMessage()));
				}
				return;
			}
			UUID memberId = UUID.fromString(principal.getName());
			ReadyChangedResponse response = roomService.updateReadyStatus(memberId, roomId, request);
			roomWebSocketEventPublisher.publishReadyChanged(roomId, response);
		} finally {
			MDC.clear();
		}
	}

	@MessageMapping("/room/{roomId}/transfer-host")
	public void handleTransferHost(
		@DestinationVariable
		Long roomId,
		@Valid @Payload
		HostTransferRequest request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		MDC.put("nickname", principal instanceof StompPrincipal sp ? sp.nickname() : "");
		try {
			log.info("[ROOM] WebSocket SEND. destination=/room/{}/transfer-host", roomId);
			if (principal == null) {
				log.warn("[ROOM] missing principal. roomId={}, sessionId={}", roomId, headerAccessor.getSessionId());
				if (headerAccessor.getSessionId() != null) {
					messageSender.sendToSession(headerAccessor.getSessionId(),
						WebSocketErrorResponse.of(ErrorCode.AUTHENTICATION_REQUIRED.getCode(),
							ErrorCode.AUTHENTICATION_REQUIRED.getMessage()));
				}
				return;
			}
			UUID memberId = UUID.fromString(principal.getName());
			HostTransferredResponse response = roomService.transferHost(roomId, memberId, request.nextHostId());
			roomWebSocketEventPublisher.publishHostTransferred(roomId, response);
		} finally {
			MDC.clear();
		}
	}
}
