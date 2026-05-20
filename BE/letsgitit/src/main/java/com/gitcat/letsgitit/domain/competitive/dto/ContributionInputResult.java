package com.gitcat.letsgitit.domain.competitive.dto;

import java.util.List;

public record ContributionInputResult(
	boolean broadcast,
	Object payload) {

	public static ContributionInputResult broadcast(Object payload) {
		return new ContributionInputResult(true, payload);
	}

	public static ContributionInputResult privateMessage(Object payload) {
		return new ContributionInputResult(false, payload);
	}

	public static ContributionInputResult broadcasts(List<Object> payloads) {
		return new ContributionInputResult(true, payloads);
	}

	public List<Object> payloads() {
		if (payload instanceof List<?> payloadList) {
			return payloadList.stream().map(Object.class::cast).toList();
		}
		return List.of(payload);
	}
}
