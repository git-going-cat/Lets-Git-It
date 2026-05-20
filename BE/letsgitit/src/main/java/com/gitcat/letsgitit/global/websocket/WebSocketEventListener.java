package com.gitcat.letsgitit.global.websocket;

import java.security.Principal;
import java.util.Set;

import org.slf4j.MDC;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.global.websocket.auth.StompPrincipal;
import com.gitcat.letsgitit.global.websocket.dto.ForceDisconnectResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@lombok.RequiredArgsConstructor
public class WebSocketEventListener {

	private final WebSocketSessionRegistry webSocketSessionRegistry;
	private final WebSocketMessageSender messageSender;
	private final RoomService roomService;

	@EventListener
	public void handleSessionConnected(SessionConnectedEvent event) {
		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
		String newSessionId = accessor.getSessionId();
		String memberId = accessor.getUser() != null ? accessor.getUser().getName() : null;

		if (memberId == null) {
			return;
		}

		Set<String> oldSessions = webSocketSessionRegistry.getSessionIds(memberId).stream()
			.filter(s -> !s.equals(newSessionId))
			.collect(java.util.stream.Collectors.toSet());

		if (oldSessions.isEmpty()) {
			return;
		}

		MDC.put("requestId", "ws-" + newSessionId);
		MDC.put("nickname", accessor.getUser() instanceof StompPrincipal sp ? sp.nickname() : "");
		try {
			log.info(
				"WebSocket duplicate connection detected, sending force disconnect to old sessions. memberId={}, oldSessions={}",
				memberId, oldSessions);
			oldSessions.forEach(oldSessionId -> {
				messageSender.sendToSession(oldSessionId, ForceDisconnectResponse.replacedByNewLogin());
				webSocketSessionRegistry.unregisterBySessionId(oldSessionId);
			});
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
		MDC.put("nickname", principal instanceof StompPrincipal sp ? sp.nickname() : "");
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
