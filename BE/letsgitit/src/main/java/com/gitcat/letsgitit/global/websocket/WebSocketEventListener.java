package com.gitcat.letsgitit.global.websocket;

import static com.gitcat.letsgitit.domain.room.constants.RoomConstants.ROOM_STATE_IN_GAME;

import java.security.Principal;

import org.slf4j.MDC;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import com.gitcat.letsgitit.domain.coop.service.CoopGameService;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.global.enums.RoomMode;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@lombok.RequiredArgsConstructor
public class WebSocketEventListener {

	private final WebSocketSessionRegistry webSocketSessionRegistry;
	private final RoomRedisRepository roomRedisRepository;
	private final CoopGameService coopGameService;

	@EventListener
	public void handleSessionSubscribe(SessionSubscribeEvent event) {
		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
		String sessionId = accessor.getSessionId();
		String memberId = accessor.getUser() != null ? accessor.getUser().getName() : "unauthenticated";
		MDC.put("requestId", "ws-" + sessionId);
		try {
			log.debug("WebSocket SUBSCRIBE. memberId={}, destination={}, sessionId={}",
				memberId, accessor.getDestination(), sessionId);
		} finally {
			MDC.clear();
		}
	}

	@EventListener
	public void handleSessionDisconnect(SessionDisconnectEvent event) {
		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

		Principal principal = accessor.getUser();
		String sessionId = accessor.getSessionId();
		String memberId = principal != null ? principal.getName() : null;
		webSocketSessionRegistry.unregisterBySessionId(sessionId);

		MDC.put("requestId", "ws-" + sessionId);
		try {
			if (memberId == null) {
				log.debug("WebSocket Disconnected without authenticated principal. sessionId={}, closeStatus={}",
					sessionId, event.getCloseStatus());
				return;
			}

			log.info("WebSocket Disconnected. memberId={}, sessionId={}, closeStatus={}",
				memberId, sessionId, event.getCloseStatus());

			// Comment 5: COOP 게임 중 disconnect → handlePlayerDisconnect 호출
			roomRedisRepository.findJoinedRoomId(memberId).ifPresent(roomId -> {
				String mode = roomRedisRepository.findModeById(roomId);
				String roomState = roomRedisRepository.findRoomStateById(roomId);
				if (RoomMode.COOP.name().equals(mode) && ROOM_STATE_IN_GAME.equals(roomState)) {
					coopGameService.handlePlayerDisconnect(roomId);
				}
			});
		} finally {
			MDC.clear();
		}
	}
}
