package com.gitcat.letsgitit.domain.room.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.gitcat.letsgitit.domain.room.util.RoomPasswordValidator;

public record UpdateContributionRoomRequest(

	@NotBlank(message = "방 제목은 필수입니다") @Size(min = 2, max = 12, message = "방 제목은 2자 이상 12자 이하여야 합니다") @Pattern(regexp = "^[가-힣a-zA-Z0-9 _-]+$", message = "방 제목은 한글, 영문, 숫자, 공백, _, -만 사용할 수 있습니다")
	String title,

	@NotNull(message = "팀 최대 인원 수는 필수입니다") @Min(value = 2, message = "최대 인원 수는 2명 이상이어야 합니다") @Max(value = 4, message = "최대 인원 수는 4명 이하여야 합니다")
	Integer maxPlayers,

	@NotNull(message = "비밀번호 설정 여부는 필수입니다")
	Boolean hasPassword,

	// hasPassword=true일 때 compact constructor에서 RoomPasswordValidator로 형식 검증
	// null/blank인 경우 기존 비밀번호 유지 (서비스 레이어에서 처리)
	String password

) {
	public UpdateContributionRoomRequest {
		RoomPasswordValidator.validateForUpdate(hasPassword, password);
	}
}
