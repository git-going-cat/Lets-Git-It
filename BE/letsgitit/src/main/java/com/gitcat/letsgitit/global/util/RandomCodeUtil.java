package com.gitcat.letsgitit.global.util;

import java.security.SecureRandom;

public class RandomCodeUtil {

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private RandomCodeUtil() {}

	public static String generate(int length, String charset) {
		StringBuilder code = new StringBuilder(length);
		for (int i = 0; i < length; i++) {
			int index = SECURE_RANDOM.nextInt(charset.length());
			code.append(charset.charAt(index));
		}
		return code.toString();
	}
}
