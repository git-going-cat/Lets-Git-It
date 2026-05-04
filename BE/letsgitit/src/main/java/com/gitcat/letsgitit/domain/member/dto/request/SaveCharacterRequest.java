package com.gitcat.letsgitit.domain.member.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SaveCharacterRequest(

	@NotBlank(message = "헤어 스타일은 필수입니다.") @Pattern(regexp = "^Hairstyle_\\d+$", message = "헤어 스타일은 Hairstyle_01 형식이어야 합니다.")
	String characterHair,

	@NotBlank(message = "헤어 색상은 필수입니다.") @Pattern(regexp = "^Hairstyle-color_\\d+$", message = "헤어 색상은 Hairstyle-color_01 형식이어야 합니다.")
	String characterHairColor,

	@NotBlank(message = "바디는 필수입니다.") @Pattern(regexp = "^Body_\\d+$", message = "바디는 Body_01 형식이어야 합니다.")
	String characterBody,

	@NotBlank(message = "눈은 필수입니다.") @Pattern(regexp = "^Eyes_\\d+$", message = "눈은 Eyes_01 형식이어야 합니다.")
	String characterEye,

	@NotBlank(message = "의상은 필수입니다.") @Pattern(regexp = "^Outfit_\\d+$", message = "의상은 Outfit_01 형식이어야 합니다.")
	String characterOutfit,

	@NotBlank(message = "의상 색상은 필수입니다.") @Pattern(regexp = "^Outfit-color_\\d+$", message = "의상 색상은 Outfit-color_01 형식이어야 합니다.")
	String characterOutfitColor

) {
}
