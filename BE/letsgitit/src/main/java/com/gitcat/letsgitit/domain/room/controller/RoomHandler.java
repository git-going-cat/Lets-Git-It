package com.gitcat.letsgitit.domain.room.controller;

import java.security.Principal;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import com.gitcat.letsgitit.domain.room.dto.request.HostTransferRequest;
import com.gitcat.letsgitit.domain.room.dto.request.ReadyUpdateRequest;
import com.gitcat.letsgitit.domain.room.dto.response.HostTransferredResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ReadyChangedResponse;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.domain.room.service.RoomWebSocketEventPublisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequiredArgsConstructor
public class RoomHandler {

	private final RoomService roomService;
	private final RoomWebSocketEventPublisher roomWebSocketEventPublisher;

	@MessageMapping("/room/{roomId}/ready")
	public void handleReady(
		@DestinationVariable
		Long roomId,
		@Valid @Payload
		ReadyUpdateRequest request,
		Principal principal) {
		UUID memberId = UUID.fromString(principal.getName());
		ReadyChangedResponse response = roomService.updateReadyStatus(memberId, roomId, request);
		roomWebSocketEventPublisher.publishReadyChanged(roomId, response);
	}

	@MessageMapping("/room/{roomId}/transfer-host")
	public void handleTransferHost(
		@DestinationVariable
		Long roomId,
		@Valid @Payload
		HostTransferRequest request,
		Principal principal) {
		UUID memberId = UUID.fromString(principal.getName());
		HostTransferredResponse response = roomService.transferHost(roomId, memberId, request.nextHostId());
		roomWebSocketEventPublisher.publishHostTransferred(roomId, response);
	}
}
