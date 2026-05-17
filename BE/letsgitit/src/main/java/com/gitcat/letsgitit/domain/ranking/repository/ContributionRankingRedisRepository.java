package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.response.UpdateContributionRankingResult;

public interface ContributionRankingRedisRepository {

	record RankEntry(String memberId, double score) {
	}

	/**
	 * 점수 업데이트 (Lua script 원자 처리)
	 * - contribution 누적
	 * - playCount +1
	 * - 최초 등록 시각 저장 (없을 때만)
	 * - composite score 계산 후 저장
	 */
	UpdateContributionRankingResult updateScore(
		String scoreKey, String contributionKey, String playCountKey, String registeredAtKey,
		UUID memberId, int deltaContribution, long currentDeciseconds);

	// ZSet 조회
	List<RankEntry> getTopEntries(String key, int count);

	List<RankEntry> getRangeByRank(String key, long start, long end);

	Long getRankZeroBased(String key, UUID memberId);

	long getTotalCount(String key);

	// Hash 조회
	Integer getContribution(String contributionKey, UUID memberId);

	Map<UUID, Integer> getContributions(String contributionKey, List<UUID> memberIds);

	Integer getPlayCount(String playCountKey, UUID memberId);

	Map<UUID, Integer> getPlayCounts(String playCountKey, List<UUID> memberIds);

	// 정산용
	void deleteKeys(String... keys);
}
