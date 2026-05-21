package com.gitcat.letsgitit.domain.competitive.repository;

import com.gitcat.letsgitit.domain.competitive.entity.ContributionResult;

public interface ContributionResultRepository {

	boolean existsBySessionId(String sessionId);

	ContributionResult save(ContributionResult contributionResult);
}
