package com.gitcat.letsgitit.domain.room.util;

import static org.assertj.core.api.Assertions.*;

import java.util.Map;

import org.junit.jupiter.api.Test;

class RoomRedisReaderTest {

	@Test
	void 문자열_필드가_누락되면_즉시_예외를_던진다() {
		Map<String, Object> source = Map.of();

		assertThatThrownBy(() -> RoomRedisReader.readString(source, "selectedMapId"))
			.isInstanceOf(IllegalStateException.class)
			.hasMessage("Missing required room redis field: selectedMapId");
	}

	@Test
	void 숫자_필드가_누락되면_즉시_예외를_던진다() {
		Map<String, Object> source = Map.of();

		assertThatThrownBy(() -> RoomRedisReader.readInt(source, "maxPlayers"))
			.isInstanceOf(IllegalStateException.class)
			.hasMessage("Missing required room redis field: maxPlayers");
	}

	@Test
	void 불리언_필드가_누락되면_즉시_예외를_던진다() {
		Map<String, Object> source = Map.of();

		assertThatThrownBy(() -> RoomRedisReader.readBoolean(source, "hasPassword"))
			.isInstanceOf(IllegalStateException.class)
			.hasMessage("Missing required room redis field: hasPassword");
	}
}
