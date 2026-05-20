package com.gitcat.letsgitit.global.websocket;

import java.nio.charset.StandardCharsets;

import org.springframework.context.annotation.Profile;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Profile("dev")
@Component
public class WebSocketOutboundLoggingInterceptor implements ChannelInterceptor {

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);

		if (!SimpMessageType.MESSAGE.equals(accessor.getMessageType())) {
			return message;
		}

		String payload = resolvePayload(message.getPayload());
		log.debug("[websocket][preSend] outbound websocket message sent. destination={}, sessionId={}, payload={}",
			accessor.getDestination(),
			accessor.getSessionId(),
			payload);

		return message;
	}

	private String resolvePayload(Object payload) {
		if (payload == null) {
			return "null";
		}
		if (payload instanceof byte[] bytes) {
			return new String(bytes, StandardCharsets.UTF_8);
		}
		return String.valueOf(payload);
	}
}
