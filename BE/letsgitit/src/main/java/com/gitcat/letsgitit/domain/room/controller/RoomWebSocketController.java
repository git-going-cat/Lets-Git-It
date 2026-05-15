package com.gitcat.letsgitit.domain.room.controller;

import java.security.Principal;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.gitcat.letsgitit.domain.room.dto.request.ChatRequest;
import com.gitcat.letsgitit.domain.room.dto.request.GameStartRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ChatResponse;
import com.gitcat.letsgitit.domain.room.dto.response.GameStartResult;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

import lombok.RequiredArgsConstructor;

// @Controller — REST가 아닌 WebSocket 메시지를 처리하는 컨트롤러
//               @RestController 쓰면 안 됨 (HTTP 응답 바디로 나가버림)
@Controller
@RequiredArgsConstructor
public class RoomWebSocketController {

	private final RoomService roomService;
	private final WebSocketMessageSender messageSender;

	// @MessageMapping("/room/{roomId}/chat")
	// → 클라이언트가 /app/room/{roomId}/chat 으로 발행하면 이 메서드가 실행됨
	//   (/app 접두사는 WebSocketConfig에서 설정된 applicationDestinationPrefixes)
	//
	// @DestinationVariable Long roomId
	// → URL 경로의 {roomId} 값을 추출 (HTTP의 @PathVariable과 동일한 역할)
	//
	// @Payload ChatRequest request
	// → 클라이언트가 보낸 JSON 메시지 본문을 ChatRequest 객체로 역직렬화
	//
	// Principal principal
	// → WebSocketAuthChannelInterceptor가 CONNECT 시 JWT를 검증하고
	//   StompPrincipal(memberId)를 세션에 등록해둔 것 — principal.getName() = memberId(UUID 문자열)
	@MessageMapping("/room/{roomId}/chat")
	public void chat(
		@DestinationVariable
		Long roomId,
		@Payload
		ChatRequest request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		try {
			// JWT에서 꺼낸 memberId를 UUID로 변환
			UUID memberId = UUID.fromString(principal.getName());

			// 서비스에서 방 존재 확인 + 메시지 검증 → 통과 시 ChatResponse 반환
			// 검증 실패 시 BusinessException 발생 → WebSocketExceptionHandler가 자동으로 처리해서
			// 요청 보낸 사람의 /user/queue/private 로 에러 응답을 전송해줌
			ChatResponse response = roomService.processChat(roomId, memberId, request);

			// 방 전체 구독자에게 브로드캐스트
			// /topic/room/{roomId} 를 구독 중인 모든 클라이언트가 이 메시지를 받음
			messageSender.send("/topic/room/" + roomId, response);
		} finally {
			MDC.clear();
		}
	}

	// 클라이언트가 /app/room/{roomId}/start 로 GAME_START 메시지를 발행하면 실행
	// 방장만 호출 가능 — 서비스에서 NOT_HOST 검증
	// 검증 통과 시 모드별 구독 경로로 브로드캐스트:
	//   기여도 → /topic/room/{roomId}/contribution (CONTRIBUTION_STARTED)
	//   협력   → /topic/room/{roomId}/coop         (COOP_STARTED)
	@MessageMapping("/room/{roomId}/start")
	public void startGame(
		@DestinationVariable
		Long roomId,
		@Payload
		GameStartRequest request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		try {
			UUID memberId = UUID.fromString(principal.getName());
			// 서비스가 검증 + 응답 조립 후 { destination, payload } 를 묶어 반환
			GameStartResult result = roomService.startGame(roomId, memberId, request);
			// 모드별로 다른 토픽에 브로드캐스트
			messageSender.send(result.destination(), result.payload());
		} finally {
			MDC.clear();
		}
	}
}
