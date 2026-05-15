package com.gitcat.letsgitit.domain.room.service;

import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.global.util.RandomCodeUtil;

@Component
public class RoomCodeGenerator {

	public static final int ROOM_CODE_LENGTH = 6;
	public static final int ROOM_CODE_MAX_RETRY = 20;

	// O/0 혼동 방지를 위해 제외
	private static final String ROOM_CODE_CHARS = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";

	public String generate() {
		return RandomCodeUtil.generate(ROOM_CODE_LENGTH, ROOM_CODE_CHARS);
	}
}
