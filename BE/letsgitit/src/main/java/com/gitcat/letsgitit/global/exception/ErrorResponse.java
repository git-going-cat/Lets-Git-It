package com.gitcat.letsgitit.global.exception;

import java.util.List;

public record ErrorResponse(
	int status, String code, String message, List<ErrorDetailResponse> errors) {

	public static ErrorResponse of(ErrorCode errorCode) {
		return new ErrorResponse(
			errorCode.getStatus(), errorCode.getCode(), errorCode.getMessage(), List.of());
	}

	public static ErrorResponse of(ErrorCode errorCode, List<ErrorDetailResponse> errors) {
		return new ErrorResponse(
			errorCode.getStatus(), errorCode.getCode(), errorCode.getMessage(), errors);
	}

	public record ErrorDetailResponse(String field, String value, String reason) {
		public static ErrorDetailResponse of(String field, String value, String reason) {
			return new ErrorDetailResponse(field, value, reason);
		}
	}
}
