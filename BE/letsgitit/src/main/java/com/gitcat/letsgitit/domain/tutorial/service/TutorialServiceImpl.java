package com.gitcat.letsgitit.domain.tutorial.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.tutorial.dto.response.TutorialResponse;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStep;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;
import com.gitcat.letsgitit.domain.tutorial.repository.TutorialRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TutorialServiceImpl implements TutorialService {

	private final TutorialRepository tutorialRepository;

	@Override
	@Transactional(readOnly = true)
	public TutorialResponse getTutorial() {
		List<TutorialStep> steps = tutorialRepository.findAllByStepOrderAsc();
		List<UUID> stepIds = steps.stream()
			.map(TutorialStep::getId)
			.toList();
		Map<UUID, List<TutorialStepItem>> itemsByStepId = tutorialRepository.findItemsGroupByStepId(stepIds);

		return TutorialResponse.from(steps, itemsByStepId);
	}
}
