package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.UUID;

// /topic/room/{roomId} 구독자 전체에게 전달되는 채팅 응답 구조
public record ChatResponse(
	String type, // "CHAT_RESPONSE" 고정
	UUID playerId, // JWT에서 추출한 인증된 사용자 ID
	String nickname, // DB에서 조회한 닉네임 (위장 방지)
	String message, // 채팅 내용
	long sentAt // 서버 기준 전송 시각 (밀리초 타임스탬프)
) {
	// 정적 팩토리 메서드 — type과 sentAt은 항상 고정값이므로 외부에서 직접 생성하지 않도록 막음
	public static ChatResponse of(UUID playerId, String nickname, String message) {
		return new ChatResponse("CHAT_RESPONSE", playerId, nickname, message, System.currentTimeMillis());
	}
}
