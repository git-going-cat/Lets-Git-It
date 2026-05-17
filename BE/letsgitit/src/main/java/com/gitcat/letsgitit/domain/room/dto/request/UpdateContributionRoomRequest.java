package com.gitcat.letsgitit.domain.room.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.gitcat.letsgitit.domain.room.util.RoomPasswordValidator;

public record UpdateContributionRoomRequest(
	@NotBlank(message = "방 제목은 필수입니다")
	String title,

	@NotNull(message = "팀 최대 인원 수는 필수입니다") @Min(value = 2, message = "최대 인원 수는 2명 이상이어야 합니다") @Max(value = 4, message = "최대 인원 수는 4명 이하여야 합니다")
	Integer maxPlayers,

	@NotNull(message = "비밀번호 설정 여부는 필수입니다")
	Boolean hasPassword,

	String password) {
	public UpdateContributionRoomRequest {
		RoomPasswordValidator.validateForUpdate(hasPassword, password);
	}
}
