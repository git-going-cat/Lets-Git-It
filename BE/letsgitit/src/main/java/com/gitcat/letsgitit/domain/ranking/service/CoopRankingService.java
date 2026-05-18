package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingScrollResponse;

public interface CoopRankingService {

	/**
	 * 초기 조회 (top3 + myRank + around ±2 고정)
	 */
	CoopRankingInitialResponse getCoopRanking(UUID memberId);

	/**
	 * 아래 방향 스크롤 (afterRank 다음부터)
	 */
	CoopRankingScrollResponse getCoopRankingScrollAfter(int afterRank, int size, UUID memberId);

	/**
	 * 위 방향 스크롤 (beforeRank 이전까지)
	 */
	CoopRankingScrollResponse getCoopRankingScrollBefore(int beforeRank, int size, UUID memberId);

	/**
	 * 협력 랭킹 등록 (게임 종료 시 호출)
	 */
	void registerCoopRanking(CoopRankingData data);
}
