package com.gitcat.letsgitit.global.websocket.auth;

import org.slf4j.MDC;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.websocket.WebSocketSessionRegistry;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * STOMP CONNECT 요청 시 Authorization 헤더의 JWT를 검증하고,
 * 토큰에서 식별한 회원 정보를 기반으로 StompPrincipal을 생성해 WebSocket 세션에 등록한다.
 *
 * 이후 SEND나 SUBSCRIBE 요청에서는 CONNECT 시점에 등록된 Principal을 사용한다.
 *
 * 1. STOMP CONNECT 요청 가로채기
 * 2. Authorization 헤더에서 JWT 추출
 * 3. JWT 검증 및 사용자 식별
 * 4. StompPrincipal 생성
 * 5. websocket 세션에 사용자 등록
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

	private static final String BEARER_PREFIX = "Bearer ";
	private static final String AUTHORIZATION = "Authorization";

	private final WebSocketPrincipalResolver webSocketPrincipalResolver;
	private final WebSocketSessionRegistry webSocketSessionRegistry;

	/**
	 * STOMP 메시지가 서버로 들어오기 직전에 호출됨
	 * (CONNECT / SEND / SUBSCRIBE / DISCONNECT)
	 *
	 * @param message
	 * @param channel
	 * @return
	 */
	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {

		// STOMP command(CONNECT/SEND/SUBSCRIBE 등)와 헤더 접근용 객체
		StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
			message,
			StompHeaderAccessor.class);

		// non-STOMP 시스템 메시지는 그대로 통과시킨다.
		if (accessor == null) {
			return message;
		}

		// STOMP CONNECT 요청일 때만 인증 수행
		// (SEND, SUBSCRIBE는 이미 세션에 Principal이 등록되어 있어서 패스)
		if (!StompCommand.CONNECT.equals(accessor.getCommand())) {
			return message;
		}

		MDC.put("requestId", "ws-" + accessor.getSessionId());
		try {
			String authorization = accessor.getFirstNativeHeader(AUTHORIZATION);

			if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
				log.warn("WebSocket CONNECT rejected - missing or invalid Authorization header. sessionId={}",
					accessor.getSessionId());
				throw new BusinessException(ErrorCode.INVALID_TOKEN);
			}

			String token = authorization.substring(BEARER_PREFIX.length());
			StompPrincipal principal;
			try {
				principal = webSocketPrincipalResolver.resolve(token);
			} catch (BusinessException e) {
				log.warn("WebSocket CONNECT rejected - token validation failed. sessionId={}, errorCode={}",
					accessor.getSessionId(), e.getErrorCode().getCode());
				throw e;
			}

			// WebSocket 세션에 사용자 등록
			// 이후 @MessageMapping 에서 Principal로 현재 사용자 식별 가능
			accessor.setUser(principal);
			webSocketSessionRegistry.register(principal.getName(), accessor.getSessionId());

			log.info("WebSocket CONNECT success. memberId={}, sessionId={}",
				principal.getName(), accessor.getSessionId());

			return message;
		} finally {
			MDC.clear();
		}
	}
}
