package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingScrollResponse;

public interface CoopRankingService {
	// ** 이번주 (Redis) **

	// 초기 조회: top3 + myRank + around ±2 (mapName+difficulty 기준 맵별 순위)
	CoopRankingInitialResponse getCoopRanking(UUID memberId, String mapName, int difficulty);

	// 아래 방향 스크롤 (afterRank 다음부터)
	CoopRankingScrollResponse getCoopRankingScrollAfter(int afterRank, int size, UUID memberId, String mapName,
		int difficulty);

	// 위 방향 스크롤 (beforeRank 이전까지)
	CoopRankingScrollResponse getCoopRankingScrollBefore(int beforeRank, int size, UUID memberId, String mapName,
		int difficulty);

	// 협력 랭킹 등록 (게임 종료 시 호출)
	void registerCoopRanking(CoopRankingData data);

	// ** 과거주 (DB) **

	// 초기 진입: top3 + myRank + around ±2 (mapName+difficulty 기준 맵별 순위)
	CoopRankingInitialResponse getCoopRankingHistory(int year, int month, int week, int size, UUID memberId,
		String mapName, int difficulty);

	// 아래 방향 스크롤: afterRank 이후 데이터 조회
	CoopRankingScrollResponse getCoopRankingHistoryScrollAfter(int year, int month, int week, int afterRank, int size,
		UUID memberId, String mapName, int difficulty);

	// 위 방향 스크롤: beforeRank 이전 데이터 조회
	CoopRankingScrollResponse getCoopRankingHistoryScrollBefore(int year, int month, int week, int beforeRank, int size,
		UUID memberId, String mapName, int difficulty);
}
