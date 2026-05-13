package com.gitcat.letsgitit.global.websocket;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;

class WebSocketStompErrorHandlerTest {

	private ObjectMapper objectMapper;
	private WebSocketStompErrorHandler handler;

	@BeforeEach
	void setUp() {
		objectMapper = new ObjectMapper();
		handler = new WebSocketStompErrorHandler(objectMapper);
	}

	@Test
	void BusinessException을_ERROR_프레임의_JSON_payload로_변환한다() throws Exception {
		Message<byte[]> clientMessage = createConnectMessage("receipt-1");

		Message<byte[]> errorMessage = handler.handleClientMessageProcessingError(
			clientMessage,
			new BusinessException(ErrorCode.INVALID_TOKEN));

		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(errorMessage);
		JsonNode body = objectMapper.readTree(errorMessage.getPayload());

		assertThat(accessor.getCommand()).isEqualTo(StompCommand.ERROR);
		assertThat(accessor.getReceiptId()).isEqualTo("receipt-1");
		assertThat(accessor.getContentType()).isEqualTo(MimeTypeUtils.APPLICATION_JSON);
		assertThat(body.get("type").asText()).isEqualTo("ERROR");
		assertThat(body.get("code").asText()).isEqualTo(ErrorCode.INVALID_TOKEN.getCode());
		assertThat(body.get("message").asText()).isEqualTo(ErrorCode.INVALID_TOKEN.getMessage());
	}

	@Test
	void 일반_예외는_INTERNAL_SERVER_ERROR로_변환한다() throws Exception {
		Message<byte[]> errorMessage = handler.handleClientMessageProcessingError(
			null,
			new IllegalStateException("unexpected"));

		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(errorMessage);
		JsonNode body = objectMapper.readTree(errorMessage.getPayload());

		assertThat(accessor.getCommand()).isEqualTo(StompCommand.ERROR);
		assertThat(body.get("code").asText()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.getCode());
		assertThat(body.get("message").asText()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.getMessage());
	}

	@Test
	void 중첩된_BusinessException도_추출한다() throws Exception {
		Message<byte[]> errorMessage = handler.handleClientMessageProcessingError(
			null,
			new RuntimeException(new BusinessException(ErrorCode.TOKEN_EXPIRED)));

		JsonNode body = objectMapper.readTree(errorMessage.getPayload());

		assertThat(body.get("code").asText()).isEqualTo(ErrorCode.TOKEN_EXPIRED.getCode());
		assertThat(body.get("message").asText()).isEqualTo(ErrorCode.TOKEN_EXPIRED.getMessage());
	}

	private Message<byte[]> createConnectMessage(String receipt) {
		StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
		accessor.setReceipt(receipt);
		accessor.setLeaveMutable(true);
		return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
	}
}
