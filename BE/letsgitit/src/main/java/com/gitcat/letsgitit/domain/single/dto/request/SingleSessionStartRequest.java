package com.gitcat.letsgitit.domain.single.dto.request;

import jakarta.validation.constraints.NotNull;

import com.gitcat.letsgitit.global.enums.Difficulty;

public record SingleSessionStartRequest(
	@NotNull(message = "난이도를 입력해주세요.")
	Difficulty difficulty) {
}
