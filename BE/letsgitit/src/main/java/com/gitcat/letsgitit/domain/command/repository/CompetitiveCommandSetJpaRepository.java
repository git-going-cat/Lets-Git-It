package com.gitcat.letsgitit.domain.command.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSet;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

public interface CompetitiveCommandSetJpaRepository extends JpaRepository<CompetitiveCommandSet, UUID> {
	List<CompetitiveCommandSet> findAllByMode(CompetitiveMode mode);

	List<CompetitiveCommandSet> findAllByModeAndPlayerCount(CompetitiveMode mode, Integer playerCount);
}
