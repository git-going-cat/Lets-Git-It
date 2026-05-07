package com.gitcat.letsgitit.domain.tutorial.dto.response;

import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;

public record TutorialCommandResponse(
	int sequence,
	String command,
	String explanation) {
	public static TutorialCommandResponse from(TutorialStepItem item) {
		return new TutorialCommandResponse(
			item.getSequence(),
			item.getContent(),
			item.getExplanation());
	}
}
