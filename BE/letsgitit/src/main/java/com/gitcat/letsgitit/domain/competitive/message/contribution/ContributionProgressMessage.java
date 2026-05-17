package com.gitcat.letsgitit.domain.competitive.message.contribution;

public record ContributionProgressMessage(
	int current,
	int total,
	int percent) {
}
