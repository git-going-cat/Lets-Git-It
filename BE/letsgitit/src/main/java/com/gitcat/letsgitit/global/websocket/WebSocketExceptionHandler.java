package com.gitcat.letsgitit.global.websocket;

import java.security.Principal;

import org.slf4j.MDC;
import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.web.bind.annotation.ControllerAdvice;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.dto.WebSocketErrorResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class WebSocketExceptionHandler {

	private final WebSocketMessageSender messageSender;

	@MessageExceptionHandler(BusinessException.class)
	public void handleBusinessException(BusinessException e, Principal principal, SimpMessageHeaderAccessor accessor) {
		if (principal == null) {
			return;
		}

		MDC.put("requestId", "ws-" + (accessor.getSessionId() != null ? accessor.getSessionId() : "unknown"));
		try {
			log.warn("WebSocket 비즈니스 예외. memberId={}, errorCode={}", principal.getName(), e.getErrorCode().getCode());
		} finally {
			MDC.clear();
		}
		messageSender.sendToUser(
			principal.getName(),
			WebSocketErrorResponse.of(
				e.getErrorCode().getCode(),
				e.getErrorCode().getMessage()));
	}

	@MessageExceptionHandler({MethodArgumentNotValidException.class, MessageConversionException.class})
	public void handleInvalidRequest(Exception e, Principal principal, SimpMessageHeaderAccessor accessor) {
		if (principal == null) {
			return;
		}

		MDC.put("requestId", "ws-" + (accessor.getSessionId() != null ? accessor.getSessionId() : "unknown"));
		try {
			log.warn("WebSocket 요청 검증 실패. memberId={}, errorCode={}", principal.getName(),
				ErrorCode.INVALID_REQUEST.getCode());
		} finally {
			MDC.clear();
		}
		messageSender.sendToUser(
			principal.getName(),
			WebSocketErrorResponse.of(
				ErrorCode.INVALID_REQUEST.getCode(),
				ErrorCode.INVALID_REQUEST.getMessage()));
	}

	@MessageExceptionHandler(Exception.class)
	public void handleException(Exception e, Principal principal, SimpMessageHeaderAccessor accessor) {
		if (principal == null) {
			return;
		}

		MDC.put("requestId", "ws-" + (accessor.getSessionId() != null ? accessor.getSessionId() : "unknown"));
		try {
			log.error("WebSocket 예상치 못한 오류. memberId={}", principal.getName(), e);
		} finally {
			MDC.clear();
		}
		messageSender.sendToUser(
			principal.getName(),
			WebSocketErrorResponse.of(
				ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
				ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
	}
}
