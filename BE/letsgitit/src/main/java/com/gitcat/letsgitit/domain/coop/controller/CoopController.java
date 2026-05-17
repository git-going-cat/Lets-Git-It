package com.gitcat.letsgitit.domain.coop.controller;

import java.security.Principal;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

import com.gitcat.letsgitit.domain.coop.dto.request.CoopInputRequest;
import com.gitcat.letsgitit.domain.coop.dto.request.CoopResetRequest;
import com.gitcat.letsgitit.domain.coop.service.CoopGameService;

import lombok.RequiredArgsConstructor;

// @Controller — REST가 아닌 WebSocket 메시지를 처리하는 컨트롤러
//               @RestController 쓰면 안 됨 (HTTP 응답 바디로 나가버림)
@Controller
@Validated
@RequiredArgsConstructor
public class CoopController {

	private final CoopGameService coopGameService;

	// 클라이언트가 /app/room/{roomId}/coop/input 으로 발행하면 실행
	// 자신의 차례라고 판단한 플레이어가 명령어를 입력
	// 검증 결과:
	//   - 차단 상태   → INPUT_BLOCKED 에러 (본인에게)
	//   - 순서 오입력 → COOP_ORDER_WRONG 브로드캐스트 (전체) + 입력 차단
	//   - 오타        → COOP_INPUT_WRONG 유니캐스트 (본인에게)
	//   - 정답        → COOP_INPUT_CORRECT 브로드캐스트 (전체)
	@MessageMapping("/room/{roomId}/coop/input")
	public void input(
		@DestinationVariable
		Long roomId,
		@Payload
		CoopInputRequest request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		try {
			UUID memberId = UUID.fromString(principal.getName());
			coopGameService.processInput(roomId, memberId, request);
		} finally {
			MDC.clear();
		}
	}

	// 클라이언트가 /app/room/{roomId}/coop/reset 으로 발행하면 실행
	// COOP_ORDER_WRONG 수신 후 해당 플레이어(resetTargetPlayerId)만 전송 가능
	// 검증 결과:
	//   - 리셋 불필요 상태 → RESET_NOT_REQUIRED 에러 (본인에게)
	//   - 리셋 대상 아님   → NOT_RESET_PLAYER 에러 (본인에게)
	//   - 오타             → COOP_RESET_WRONG 유니캐스트 (본인에게)
	//   - 성공             → COOP_ROUND_REVEAL (isReset: true) + COOP_ROUND_ASSIGN 재전송
	@MessageMapping("/room/{roomId}/coop/reset")
	public void reset(
		@DestinationVariable
		Long roomId,
		@Payload
		CoopResetRequest request,
		Principal principal,
		SimpMessageHeaderAccessor headerAccessor) {
		MDC.put("requestId", "ws-" + headerAccessor.getSessionId());
		try {
			UUID memberId = UUID.fromString(principal.getName());
			coopGameService.processReset(roomId, memberId, request);
		} finally {
			MDC.clear();
		}
	}
}
