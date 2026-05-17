package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.UpdateContributionRankingResult;

public interface ContributionRankingService {

	ContributionRankingInitialResponse getContributionRanking(int size, UUID memberId);

	ContributionRankingScrollResponse getContributionRankingScrollAfter(int afterRank, int size, UUID memberId);

	ContributionRankingScrollResponse getContributionRankingScrollBefore(int beforeRank, int size, UUID memberId);

	UpdateContributionRankingResult updateContributionScore(UUID memberId, int deltaContribution);
}
