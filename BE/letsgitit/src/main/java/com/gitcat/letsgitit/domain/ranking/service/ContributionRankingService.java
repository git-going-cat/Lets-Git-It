package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.UpdateContributionRankingResult;

public interface ContributionRankingService {
	// ** 이번주 **
	ContributionRankingInitialResponse getContributionRanking(int size, UUID memberId);

	ContributionRankingScrollResponse getContributionRankingScrollAfter(int afterRank, int size, UUID memberId);

	ContributionRankingScrollResponse getContributionRankingScrollBefore(int beforeRank, int size, UUID memberId);

	UpdateContributionRankingResult updateContributionScore(UUID memberId, int deltaContribution);

	// ** 과거주 **
	// 초기 진입: top3 고정 + myRank + around(내 순위 ±2) 반환
	ContributionRankingInitialResponse getContributionRankingHistory(int year, int month, int week, int size,
		UUID memberId);

	// 아래 방향 스크롤: afterRank 초과 데이터 조회
	ContributionRankingScrollResponse getContributionRankingHistoryScrollAfter(int year, int month, int week,
		int afterRank, int size, UUID memberId);

	// 위 방향 스크롤: beforeRank 미만 데이터 조회
	ContributionRankingScrollResponse getContributionRankingHistoryScrollBefore(int year, int month, int week,
		int beforeRank, int size, UUID memberId);
}
