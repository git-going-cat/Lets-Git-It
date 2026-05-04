package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.UUID;

public interface SingleRankingRedisRepository {

	record RankEntry(String memberId, double score) {
	}

	// ZSet에 점수 저장 (기존 점수보다 높은 경우에만 갱신)
	void saveScore(String key, UUID memberId, double score);

	// 상위 count명 내림차순 조회
	List<RankEntry> getTopEntries(String key, int count);

	// 특정 멤버의 0-based 역순 순위 (없으면 null)
	Long getRankZeroBased(String key, UUID memberId);

	// 특정 멤버의 점수 (없으면 null)
	Double getScore(String key, UUID memberId);

	// 0-based [start, end] 범위 내림차순 조회
	List<RankEntry> getRangeByRank(String key, long start, long end);

	// 전체 등록 인원 수
	long getTotalCount(String key);
}
