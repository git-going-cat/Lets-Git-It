package com.gitcat.letsgitit.domain.room.service;

import java.security.Principal;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.context.ApplicationListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoomStateSubscribeEventListener implements ApplicationListener<SessionSubscribeEvent> {

	private static final Pattern ROOM_TOPIC_PATTERN = Pattern.compile("^/topic/room/(\\d+)$");

	private final RoomService roomService;
	private final WebSocketMessageSender webSocketMessageSender;

	@Override
	public void onApplicationEvent(SessionSubscribeEvent event) {
		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
		String destination = accessor.getDestination();
		if (destination == null) {
			return;
		}

		Matcher matcher = ROOM_TOPIC_PATTERN.matcher(destination);
		if (!matcher.matches()) {
			return;
		}

		Principal principal = accessor.getUser();
		if (principal == null) {
			log.warn("[room][ROOM_STATE] SUBSCRIBE skipped: missing principal. destination={}", destination);
			return;
		}

		Long roomId = Long.valueOf(matcher.group(1));
		UUID memberId = UUID.fromString(principal.getName());
		try {
			BaseWebSocketResponse response = roomService.getRoomState(memberId, roomId);
			webSocketMessageSender.sendToUser(principal.getName(), response);
			log.info("[room][ROOM_STATE] state sent to subscribed user. roomId={}, memberId={}, type={}",
				roomId, memberId, response.type());
		} catch (BusinessException e) {
			webSocketMessageSender.sendToUser(
				principal.getName(),
				WebSocketErrorResponse.of(e.getErrorCode().getCode(), e.getErrorCode().getMessage()));
			log.warn("[room][ROOM_STATE] business error sent to user. roomId={}, memberId={}, errorCode={}",
				roomId, memberId, e.getErrorCode().getCode());
		} catch (RuntimeException e) {
			webSocketMessageSender.sendToUser(
				principal.getName(),
				WebSocketErrorResponse.of(
					ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
					ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
			log.warn("[room][ROOM_STATE] internal error sent to user. roomId={}, memberId={}, reason={}",
				roomId, memberId, e.getClass().getSimpleName(), e);
		}
	}
}
