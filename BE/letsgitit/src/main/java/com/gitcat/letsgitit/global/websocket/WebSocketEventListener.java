package com.gitcat.letsgitit.global.websocket;

import java.security.Principal;

import org.slf4j.MDC;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import com.gitcat.letsgitit.domain.room.service.RoomService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@lombok.RequiredArgsConstructor
public class WebSocketEventListener {

	private final WebSocketSessionRegistry webSocketSessionRegistry;
	private final RoomService roomService;

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
		String removedMemberId = webSocketSessionRegistry.unregisterBySessionId(sessionId);

		MDC.put("requestId", "ws-" + sessionId);
		try {
			String memberId = principal != null ? principal.getName() : removedMemberId;
			if (memberId == null) {
				log.debug(
					"WebSocket Disconnected without authenticated principal. sessionId={}, removedMemberId={}, closeStatus={}",
					sessionId,
					removedMemberId,
					event.getCloseStatus());
				return;
			}

			log.info(
				"WebSocket Disconnected. memberId={}, sessionId={}, closeStatus={}",
				memberId,
				sessionId,
				event.getCloseStatus());

			if (!webSocketSessionRegistry.hasActiveSessions(memberId)) {
				roomService.leaveGameIfDisconnected(memberId);
			}
		} finally {
			MDC.clear();
		}
	}
}
