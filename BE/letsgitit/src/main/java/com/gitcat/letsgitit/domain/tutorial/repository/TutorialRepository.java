package com.gitcat.letsgitit.domain.tutorial.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStep;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;

public interface TutorialRepository {
	List<TutorialStep> findAllByStepOrderAsc();

	Map<UUID, List<TutorialStepItem>> findItemsGroupByStepId(List<UUID> tutorialStepIds);
}
