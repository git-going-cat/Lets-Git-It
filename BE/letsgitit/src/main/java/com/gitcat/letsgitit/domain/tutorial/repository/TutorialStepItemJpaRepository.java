package com.gitcat.letsgitit.domain.tutorial.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;

public interface TutorialStepItemJpaRepository extends JpaRepository<TutorialStepItem, UUID> {
	List<TutorialStepItem> findAllByTutorialStepIdInOrderBySequenceAsc(Collection<UUID> tutorialStepIds);
}
