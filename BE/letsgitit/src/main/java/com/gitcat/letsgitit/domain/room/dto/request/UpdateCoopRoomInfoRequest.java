package com.gitcat.letsgitit.domain.room.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.gitcat.letsgitit.domain.room.util.RoomPasswordValidator;

public record UpdateCoopRoomInfoRequest(
	@NotBlank(message = "방 제목은 필수입니다")
	String title,

	@NotBlank(message = "팀 이름은 필수입니다")
	String teamName,

	@NotNull(message = "비밀번호 설정 여부는 필수입니다")
	Boolean hasPassword,

	String password,

	@NotNull(message = "선택한 맵 ID는 필수입니다")
	UUID selectedMapId) {
	public UpdateCoopRoomInfoRequest {
		RoomPasswordValidator.validate(hasPassword, password);
	}
}
