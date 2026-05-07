package com.gitcat.letsgitit.domain.tutorial.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStep;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class TutorialRepositoryImpl implements TutorialRepository {

	private final TutorialStepJpaRepository tutorialStepJpaRepository;
	private final TutorialStepItemJpaRepository tutorialStepItemJpaRepository;

	@Override
	public List<TutorialStep> findAllByStepOrderAsc() {
		return tutorialStepJpaRepository.findAllByOrderByStepOrderAsc();
	}

	@Override
	public Map<UUID, List<TutorialStepItem>> findItemsGroupByStepId(List<UUID> tutorialStepIds) {
		if (tutorialStepIds.isEmpty()) {
			return Map.of();
		}

		return tutorialStepItemJpaRepository.findAllByTutorialStepIdInOrderBySequenceAsc(tutorialStepIds)
			.stream()
			.collect(Collectors.groupingBy(TutorialStepItem::getTutorialStepId));
	}
}
