package com.gitcat.letsgitit.domain.room.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.gitcat.letsgitit.domain.room.util.RoomPasswordValidator;

public record CreateCoopRoomRequest(

	@NotBlank(message = "방 제목은 필수입니다") @Size(min = 2, max = 12, message = "방 제목은 2자 이상 12자 이하여야 합니다") @Pattern(regexp = "^[가-힣a-zA-Z0-9 _-]+$", message = "방 제목은 한글, 영문, 숫자, 공백, _, -만 사용할 수 있습니다")
	String title,

	@NotBlank(message = "팀 이름은 필수입니다") @Size(min = 2, max = 12, message = "팀 이름은 2자 이상 12자 이하여야 합니다") @Pattern(regexp = "^[가-힣a-zA-Z0-9 _-]+$", message = "팀 이름은 한글, 영문, 숫자, 공백, _, -만 사용할 수 있습니다")
	String teamName,

	@NotNull(message = "비밀번호 설정 여부는 필수입니다")
	Boolean hasPassword,

	// hasPassword=true일 때 compact constructor에서 RoomPasswordValidator로 형식 검증
	String password,

	@NotNull(message = "선택한 맵 ID는 필수입니다")
	UUID selectedMapId

) {
	public CreateCoopRoomRequest {
		RoomPasswordValidator.validate(hasPassword, password);
	}
}
