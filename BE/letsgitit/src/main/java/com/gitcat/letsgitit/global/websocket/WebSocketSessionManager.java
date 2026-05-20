package com.gitcat.letsgitit.global.websocket;

import org.slf4j.MDC;
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

	public void notifyDisconnectByLogout(String memberId, String nickname) {
		if (!sessionRegistry.hasActiveSessions(memberId)) {
			return;
		}

		String prevNickname = MDC.get("nickname");
		MDC.put("nickname", nickname != null ? nickname : "");
		try {
			log.info("WebSocket force disconnect. memberId={}, reason=LOGOUT", memberId);
		} finally {
			if (prevNickname != null) {
				MDC.put("nickname", prevNickname);
			} else {
				MDC.remove("nickname");
			}
		}
		messageSender.sendToUser(memberId, ForceDisconnectResponse.loggedOut());
	}

	public void notifyDisconnectByNewLogin(String memberId, String nickname) {
		if (!sessionRegistry.hasActiveSessions(memberId)) {
			return;
		}

		String prevNickname = MDC.get("nickname");
		MDC.put("nickname", nickname != null ? nickname : "");
		try {
			log.info("WebSocket force disconnect. memberId={}, reason=NEW_LOGIN", memberId);
		} finally {
			if (prevNickname != null) {
				MDC.put("nickname", prevNickname);
			} else {
				MDC.remove("nickname");
			}
		}
		messageSender.sendToUser(memberId, ForceDisconnectResponse.replacedByNewLogin());
	}
}
