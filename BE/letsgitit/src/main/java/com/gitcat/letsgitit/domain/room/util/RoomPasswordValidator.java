package com.gitcat.letsgitit.domain.room.util;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import com.gitcat.letsgitit.global.exception.BusinessException;

public final class RoomPasswordValidator {

	private static final String ROOM_PASSWORD_REGEX = "^\\d{4}$";

	private RoomPasswordValidator() {}

	public static void validate(Boolean hasPassword, String password) {
		if (Boolean.TRUE.equals(hasPassword) && (password == null || password.isBlank())) {
			throw new BusinessException(PASSWORD_REQUIRED);
		}
		if (Boolean.TRUE.equals(hasPassword) && !password.matches(ROOM_PASSWORD_REGEX)) {
			throw new BusinessException(ROOM_PASSWORD_INVALID_FORMAT);
		}
	}

	/**
	 * 방 정보 수정 시 비밀번호 검증.
	 * - hasPassword=true + password=null/blank → 기존 비밀번호 유지 (서비스 레이어에서 처리)
	 * - hasPassword=true + password 존재 → 형식 검증 후 새 비밀번호로 변경
	 */
	public static void validateForUpdate(Boolean hasPassword, String password) {
		if (Boolean.TRUE.equals(hasPassword) && password != null && !password.isBlank()
			&& !password.matches(ROOM_PASSWORD_REGEX)) {
			throw new BusinessException(ROOM_PASSWORD_INVALID_FORMAT);
		}
	}
}
