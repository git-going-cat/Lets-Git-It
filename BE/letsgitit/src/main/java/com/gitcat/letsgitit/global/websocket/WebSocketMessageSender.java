package com.gitcat.letsgitit.global.websocket;

import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class WebSocketMessageSender {

	private final SimpMessagingTemplate messagingTemplate;

	public void send(String destination, Object payload) {
		messagingTemplate.convertAndSend(destination, payload);
	}

	public void sendToUser(String memberId, Object payload) {
		messagingTemplate.convertAndSendToUser(
			memberId,
			"/queue/private",
			payload);
	}

	public void sendToSession(String sessionId, Object payload) {
		SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
		headerAccessor.setSessionId(sessionId);
		headerAccessor.setLeaveMutable(true);
		messagingTemplate.convertAndSendToUser(
			sessionId,
			"/queue/private",
			payload,
			headerAccessor.getMessageHeaders());
	}
}
