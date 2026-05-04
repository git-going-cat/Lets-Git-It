package com.gitcat.letsgitit.domain.tutorial.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStep;

public interface TutorialStepJpaRepository extends JpaRepository<TutorialStep, UUID> {

	List<TutorialStep> findAllByOrderByStepOrderAsc();
}
