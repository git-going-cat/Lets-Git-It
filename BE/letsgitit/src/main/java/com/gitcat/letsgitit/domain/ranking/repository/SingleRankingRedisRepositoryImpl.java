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
	public boolean saveScoreAndGrade(String scoreKey, String gradeKey, UUID memberId, double score, String grade) {
		Double currentScore = rankingStringRedisTemplate.opsForZSet()
			.score(scoreKey, memberId.toString());

		if (currentScore == null || score > currentScore) {
			rankingStringRedisTemplate.opsForZSet().add(scoreKey, memberId.toString(), score);
			rankingStringRedisTemplate.opsForHash().put(gradeKey, memberId.toString(), grade);
			return true;
		}
		return false;
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
	public String getGrade(String gradeKey, UUID memberId) {
		Object value = rankingStringRedisTemplate.opsForHash()
			.get(gradeKey, memberId.toString());
		return value != null ? (String)value : null;
	}

	@Override
	public Map<UUID, String> getGrades(String gradeKey, List<UUID> memberIds) {
		if (memberIds.isEmpty()) {
			return Map.of();
		}
		List<Object> fields = memberIds.stream().map(UUID::toString).collect(java.util.stream.Collectors.toList());
		List<Object> values = rankingStringRedisTemplate.opsForHash().multiGet(gradeKey, fields);

		Map<UUID, String> result = new HashMap<>(memberIds.size());
		for (int i = 0; i < memberIds.size(); i++) {
			Object val = values.get(i);
			if (val != null) {
				result.put(memberIds.get(i), (String)val);
			}
		}
		return result;
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
