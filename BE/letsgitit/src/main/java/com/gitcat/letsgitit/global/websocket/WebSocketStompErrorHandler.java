package com.gitcat.letsgitit.global.websocket;

import java.nio.charset.StandardCharsets;

import org.slf4j.MDC;
import org.springframework.lang.Nullable;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketStompErrorHandler extends StompSubProtocolErrorHandler {

	private final ObjectMapper objectMapper;

	@Override
	public Message<byte[]> handleClientMessageProcessingError(@Nullable
	Message<byte[]> clientMessage, Throwable ex) {
		BusinessException businessException = extractBusinessException(ex);
		ErrorCode errorCode;
		if (businessException != null) {
			errorCode = businessException.getErrorCode();
		} else if (isInvalidRequestException(ex)) {
			errorCode = ErrorCode.INVALID_REQUEST;
		} else {
			errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
		}

		StompHeaderAccessor clientHeaderAccessor = null;
		if (clientMessage != null) {
			clientHeaderAccessor = MessageHeaderAccessor.getAccessor(clientMessage, StompHeaderAccessor.class);
		}

		String sessionId = clientHeaderAccessor != null ? clientHeaderAccessor.getSessionId() : null;
		MDC.put("requestId", "ws-" + (sessionId != null ? sessionId : "unknown"));
		try {
			log.debug("WebSocket message processing error. errorCode={}, message={}", errorCode.getCode(),
				errorCode.getMessage());

			byte[] payload = serialize(errorCode);
			StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.ERROR);
			accessor.setMessage(errorCode.getMessage());
			accessor.setContentType(MimeTypeUtils.APPLICATION_JSON);
			accessor.setContentLength(payload.length);
			accessor.setLeaveMutable(true);

			if (clientHeaderAccessor != null && clientHeaderAccessor.getReceipt() != null) {
				accessor.setReceiptId(clientHeaderAccessor.getReceipt());
			}

			return handleInternal(accessor, payload, ex, clientHeaderAccessor);
		} finally {
			MDC.clear();
		}
	}

	private BusinessException extractBusinessException(Throwable ex) {
		Throwable current = ex;
		while (current != null) {
			if (current instanceof BusinessException businessException) {
				return businessException;
			}
			current = current.getCause();
		}
		return null;
	}

	private boolean isInvalidRequestException(Throwable ex) {
		Throwable current = ex;
		while (current != null) {
			if (current instanceof org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException
				|| current instanceof org.springframework.web.bind.MethodArgumentNotValidException
				|| current instanceof org.springframework.messaging.converter.MessageConversionException) {
				return true;
			}
			current = current.getCause();
		}
		return false;
	}

	private byte[] serialize(ErrorCode errorCode) {
		try {
			return objectMapper.writeValueAsBytes(
				WebSocketErrorResponse.of(errorCode.getCode(), errorCode.getMessage()));
		} catch (JsonProcessingException e) {
			return "{\"type\":\"ERROR\",\"code\":\"INTERNAL_SERVER_ERROR\",\"message\":\"서버 내부 오류가 발생했습니다.\"}"
				.getBytes(StandardCharsets.UTF_8);
		}
	}
}
