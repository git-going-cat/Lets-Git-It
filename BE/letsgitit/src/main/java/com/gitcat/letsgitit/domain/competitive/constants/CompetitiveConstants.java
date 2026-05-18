package com.gitcat.letsgitit.domain.competitive.constants;

import java.util.regex.Pattern;

public final class CompetitiveConstants {

	private CompetitiveConstants() {}

	public static final Pattern SWITCH_PATTERN =
		Pattern.compile("^git\\s+(switch|checkout)\\s+(\\S+)\\s*$");
}
