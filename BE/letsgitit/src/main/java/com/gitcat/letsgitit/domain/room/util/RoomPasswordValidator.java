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
}
