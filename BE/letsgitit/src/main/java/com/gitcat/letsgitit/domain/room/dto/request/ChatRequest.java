package com.gitcat.letsgitit.domain.room.dto.request;

// 클라이언트가 /app/room/{roomId}/chat 으로 발행할 때 보내는 메시지 구조
public record ChatRequest(
	String type, // "CHAT_REQUEST" 고정값 (서버에서 사용하지 않지만 명세에 포함)
	String nickname, // 채팅 보낸 플레이어 닉네임
	String message // 채팅 내용
) {
}
