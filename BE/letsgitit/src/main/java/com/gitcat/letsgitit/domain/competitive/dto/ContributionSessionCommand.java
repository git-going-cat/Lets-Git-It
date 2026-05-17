package com.gitcat.letsgitit.domain.competitive.dto;

public record ContributionSessionCommand(
	int commandSequence,
	String text,
	String branchName) {
}
