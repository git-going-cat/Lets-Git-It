package com.gitcat.letsgitit.domain.room.util;

import java.util.Map;

public final class RoomRedisReader {

	private RoomRedisReader() {}

	public static String readString(Map<?, ?> source, String key) {
		Object value = requireValue(source, key);
		return String.valueOf(value);
	}

	public static int readInt(Map<?, ?> source, String key) {
		Object value = requireValue(source, key);

		if (value instanceof Number number) {
			return number.intValue();
		}

		return Integer.parseInt(String.valueOf(value));
	}

	public static boolean readBoolean(Map<?, ?> source, String key) {
		Object value = requireValue(source, key);

		if (value instanceof Boolean bool) {
			return bool;
		}

		return Boolean.parseBoolean(String.valueOf(value));
	}

	private static Object requireValue(Map<?, ?> source, String key) {
		Object value = source.get(key);

		if (value == null) {
			throw new IllegalStateException("Missing required room redis field: " + key);
		}

		return value;
	}
}
