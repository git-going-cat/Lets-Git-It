package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.*;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Repository;

@Repository
public class SingleRankingRedisRepositoryImpl implements SingleRankingRedisRepository {

	private final StringRedisTemplate rankingStringRedisTemplate;

	public SingleRankingRedisRepositoryImpl(
		@Qualifier("rankingStringRedisTemplate")
		StringRedisTemplate rankingStringRedisTemplate) {
		this.rankingStringRedisTemplate = rankingStringRedisTemplate;
	}

	@Override
	public void saveScore(String key, UUID memberId, double score) {
		Double currentScore = rankingStringRedisTemplate.opsForZSet()
			.score(key, memberId.toString());

		if (currentScore == null || score > currentScore) {
			rankingStringRedisTemplate.opsForZSet().add(key, memberId.toString(), score);
		}
	}

	@Override
	public List<RankEntry> getTopEntries(String key, int count) {
		Set<ZSetOperations.TypedTuple<String>> tuples = rankingStringRedisTemplate.opsForZSet()
			.reverseRangeWithScores(key, 0, (long)count - 1);
		return toRankEntries(tuples);
	}

	@Override
	public Long getRankZeroBased(String key, UUID memberId) {
		return rankingStringRedisTemplate.opsForZSet()
			.reverseRank(key, memberId.toString());
	}

	@Override
	public Double getScore(String key, UUID memberId) {
		return rankingStringRedisTemplate.opsForZSet()
			.score(key, memberId.toString());
	}

	@Override
	public List<RankEntry> getRangeByRank(String key, long start, long end) {
		Set<ZSetOperations.TypedTuple<String>> tuples = rankingStringRedisTemplate.opsForZSet()
			.reverseRangeWithScores(key, start, end);
		return toRankEntries(tuples);
	}

	@Override
	public long getTotalCount(String key) {
		Long count = rankingStringRedisTemplate.opsForZSet().zCard(key);
		return count != null ? count : 0L;
	}

	@Override
	public void deleteKey(String key) {
		rankingStringRedisTemplate.delete(key);
	}

	private List<RankEntry> toRankEntries(Set<ZSetOperations.TypedTuple<String>> tuples) {
		if (tuples == null || tuples.isEmpty())
			return List.of();

		List<RankEntry> result = new ArrayList<>(tuples.size());
		for (ZSetOperations.TypedTuple<String> t : tuples) {
			result.add(new RankEntry(t.getValue(), t.getScore()));
		}
		return result;
	}
}
