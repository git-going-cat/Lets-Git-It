package com.gitcat.letsgitit.domain.competitive.dto;

public record ContributionInputResult(
	boolean broadcast,
	Object payload) {

	public static ContributionInputResult broadcast(Object payload) {
		return new ContributionInputResult(true, payload);
	}

	public static ContributionInputResult privateMessage(Object payload) {
		return new ContributionInputResult(false, payload);
	}
}
