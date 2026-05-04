package com.gitcat.letsgitit.domain.single.dto.response;

public record SingleResultResponse(
	Boolean isNewRecord) {
	public static SingleResultResponse of(Boolean isNewRecord) {
		return new SingleResultResponse(isNewRecord);
	}
}
