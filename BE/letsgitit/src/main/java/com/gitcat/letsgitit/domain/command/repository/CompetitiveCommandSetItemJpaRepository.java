package com.gitcat.letsgitit.domain.command.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSetItem;

public interface CompetitiveCommandSetItemJpaRepository extends JpaRepository<CompetitiveCommandSetItem, UUID> {
	List<CompetitiveCommandSetItem> findAllByCompetitiveCommandSetIdOrderBySequenceAsc(UUID competitiveCommandSetId);
}
