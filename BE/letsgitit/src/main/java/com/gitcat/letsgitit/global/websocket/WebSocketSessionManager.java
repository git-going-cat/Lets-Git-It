package com.gitcat.letsgitit.global.websocket;

import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.global.websocket.dto.ForceDisconnectResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketSessionManager {

	private final WebSocketSessionRegistry sessionRegistry;
	private final WebSocketMessageSender messageSender;

	public void notifyDisconnectByLogout(String memberId) {
		if (!sessionRegistry.hasActiveSessions(memberId)) {
			return;
		}

		log.info("WebSocket 강제 연결 종료 알림. memberId={}, reason=LOGOUT", memberId);
		messageSender.sendToUser(memberId, ForceDisconnectResponse.loggedOut());
	}

	public void notifyDisconnectByNewLogin(String memberId) {
		if (!sessionRegistry.hasActiveSessions(memberId)) {
			return;
		}

		log.info("WebSocket 강제 연결 종료 알림. memberId={}, reason=NEW_LOGIN", memberId);
		messageSender.sendToUser(memberId, ForceDisconnectResponse.replacedByNewLogin());
	}
}
