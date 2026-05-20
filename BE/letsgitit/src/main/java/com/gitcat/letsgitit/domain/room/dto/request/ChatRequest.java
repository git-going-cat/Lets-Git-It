package com.gitcat.letsgitit.domain.room.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// 클라이언트가 /app/room/{roomId}/chat 으로 발행할 때 보내는 메시지 구조
public record ChatRequest(

	@NotBlank(message = "type은 필수입니다.")
	String type,

	// 제어 문자(\p{Cntrl}: U+0000~U+001F, U+007F)와 제로폭 문자(ZWSP, ZWNJ, ZWJ, BOM) 차단
	@NotBlank(message = "채팅 값은 필수입니다.") @Size(min = 1, max = 150, message = "채팅은 1자 이상 150자 이하여야 합니다.") @Pattern(regexp = "^[^\\p{Cntrl}\\u200B-\\u200D\\uFEFF]*$", message = "사용할 수 없는 문자가 포함되어 있습니다.")
	String message

) {
}
