package com.gitcat.letsgitit.global.websocket;

import java.security.Principal;

import org.slf4j.MDC;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@lombok.RequiredArgsConstructor
public class WebSocketEventListener {

	private final WebSocketSessionRegistry webSocketSessionRegistry;

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
			if (principal == null) {
				log.debug(
					"WebSocket Disconnected without authenticated principal. sessionId={}, removedMemberId={}, closeStatus={}",
					sessionId,
					removedMemberId,
					event.getCloseStatus());
				return;
			}

			String memberId = principal.getName();

			log.info(
				"WebSocket Disconnected. memberId={}, sessionId={}, closeStatus={}",
				memberId,
				sessionId,
				event.getCloseStatus());
		} finally {
			MDC.clear();
		}

		// TODO:
		// memberId + sessionId로 어떤 room에 속해 있었는지 찾을 수 있는
		// 세션-방 매핑 저장소/리포지토리가 먼저 필요함
		// 방 퇴장 처리 및 HOST_DELEGATED 브로드캐스트 연결 예정
		// 게임 중 disconnect 처리 (예: COOP_GAME_END 실패 처리) 연결 예정
	}
}
