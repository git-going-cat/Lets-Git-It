package com.gitcat.letsgitit.domain.tutorial.dto.response;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStep;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;

public record TutorialResponse(
	List<TutorialStepResponse> steps) {
	public static TutorialResponse from(List<TutorialStep> steps, Map<UUID, List<TutorialStepItem>> itemsByStepId) {
		return new TutorialResponse(
			steps.stream()
				.map(step -> TutorialStepResponse.from(step, itemsByStepId.getOrDefault(step.getId(), List.of())))
				.toList());
	}
}
