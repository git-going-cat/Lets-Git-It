package com.gitcat.letsgitit.domain.competitive.service;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionRankingCache;

public interface ContributionResultSaveService {

	void saveCompletedResult(Long roomId, UUID gameSessionId, List<ContributionRankingCache> rankings);
}
