package com.gitcat.letsgitit.domain.tutorial.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStep;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;

public record TutorialStepResponse(
	int order,
	String title,
	String description,
	List<TutorialCommandResponse> commands) {
	public static TutorialStepResponse from(TutorialStep step, List<TutorialStepItem> items) {
		return new TutorialStepResponse(
			step.getStepOrder(),
			step.getTitle(),
			step.getDescription(),
			items.stream()
				.map(TutorialCommandResponse::from)
				.toList());
	}
}
