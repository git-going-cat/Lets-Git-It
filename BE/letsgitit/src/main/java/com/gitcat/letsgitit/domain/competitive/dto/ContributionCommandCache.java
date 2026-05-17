package com.gitcat.letsgitit.domain.competitive.dto;

import java.util.UUID;

public record ContributionCommandCache(
	int commandSequence,
	String text,
	String branchName,
	String status,
	UUID winnerId) {

	public static ContributionCommandCache ready(int commandSequence, String text, String branchName) {
		return new ContributionCommandCache(commandSequence, text, branchName, "READY", null);
	}

	public ContributionCommandCache cleared(UUID winnerId) {
		return new ContributionCommandCache(commandSequence, text, branchName, "CLEARED", winnerId);
	}

	public ContributionCommandCache switched(UUID winnerId) {
		return new ContributionCommandCache(commandSequence, text, branchName, "SWITCHED", winnerId);
	}
}
