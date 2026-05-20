package com.gitcat.letsgitit.domain.competitive.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.competitive.entity.ContributionResult;

public interface ContributionResultJpaRepository extends JpaRepository<ContributionResult, UUID> {

	boolean existsBySessionId(String sessionId);
}
