package com.gitcat.letsgitit.domain.single.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.domain.single.entity.enums.SingleResultStatus;

public record SingleResultSaveRequest(
	@NotNull(message = "상태를 입력해주세요.")
	SingleResultStatus status,

	@NotNull(message = "점수를 입력해주세요.") @PositiveOrZero(message = "점수는 0 이상이어야 합니다.")
	Integer score,

	@NotNull(message = "플레이 시간은 필수입니다.") @Positive(message = "플레이 시간은 0보다 커야 합니다.")
	Integer playTime,

	@NotNull(message = "등급은 필수입니다.")
	Grade grade) {
}
