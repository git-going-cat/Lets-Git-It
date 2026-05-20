package com.gitcat.letsgitit.domain.competitive.repository;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.competitive.entity.ContributionResult;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ContributionResultRepositoryImpl implements ContributionResultRepository {

	private final ContributionResultJpaRepository contributionResultJpaRepository;

	@Override
	public boolean existsBySessionId(String sessionId) {
		return contributionResultJpaRepository.existsBySessionId(sessionId);
	}

	@Override
	public ContributionResult save(ContributionResult contributionResult) {
		return contributionResultJpaRepository.saveAndFlush(contributionResult);
	}
}
