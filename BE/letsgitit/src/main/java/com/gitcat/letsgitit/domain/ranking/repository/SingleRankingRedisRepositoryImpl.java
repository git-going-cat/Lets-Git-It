package com.gitcat.letsgitit.domain.ranking.repository;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.connection.ReturnType;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Repository;

@Repository
public class SingleRankingRedisRepositoryImpl implements SingleRankingRedisRepository {

	private static final String SAVE_SCORE_GRADE_PLAY_TIME_SCRIPT = """
		local current = redis.call('ZSCORE', KEYS[1], ARGV[1])
		local nextScore = tonumber(ARGV[2])

		if current == false or nextScore > tonumber(current) then
		  redis.call('ZADD', KEYS[1], nextScore, ARGV[1])
		  redis.call('HSET', KEYS[2], ARGV[1], ARGV[3])
		  redis.call('HSET', KEYS[3], ARGV[1], ARGV[4])
		  return 1
		end

		return 0
		""";

	private final StringRedisTemplate rankingStringRedisTemplate;

	public SingleRankingRedisRepositoryImpl(
		@Qualifier("rankingStringRedisTemplate")
		StringRedisTemplate rankingStringRedisTemplate) {
		this.rankingStringRedisTemplate = rankingStringRedisTemplate;
	}

	@Override
	public boolean saveScoreGradeAndPlayTime(String scoreKey, String gradeKey, String playTimeKey,
		UUID memberId, double compositeScore, String grade, int playTimeMs) {
		String memberIdValue = memberId.toString();
		String compositeScoreValue = Double.toString(compositeScore);
		String playTimeValue = String.valueOf(playTimeMs);

		Long updated = rankingStringRedisTemplate
			.execute((RedisCallback<Long>)connection -> connection.scriptingCommands()
				.eval(
					bytes(SAVE_SCORE_GRADE_PLAY_TIME_SCRIPT),
					ReturnType.INTEGER,
					3,
					bytes(scoreKey),
					bytes(gradeKey),
					bytes(playTimeKey),
					bytes(memberIdValue),
					bytes(compositeScoreValue),
					bytes(grade),
					bytes(playTimeValue)));

		return updated != null && updated == 1L;
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
		List<Object> fields = memberIds.stream().map(UUID::toString).collect(Collectors.toList());
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
	public Integer getPlayTime(String playTimeKey, UUID memberId) {
		Object value = rankingStringRedisTemplate.opsForHash()
			.get(playTimeKey, memberId.toString());
		return value != null ? Integer.parseInt((String)value) : null;
	}

	@Override
	public Map<UUID, Integer> getPlayTimes(String playTimeKey, List<UUID> memberIds) {
		if (memberIds.isEmpty()) {
			return Map.of();
		}
		List<Object> fields = memberIds.stream().map(UUID::toString).collect(Collectors.toList());
		List<Object> values = rankingStringRedisTemplate.opsForHash().multiGet(playTimeKey, fields);

		Map<UUID, Integer> result = new HashMap<>(memberIds.size());
		for (int i = 0; i < memberIds.size(); i++) {
			Object val = values.get(i);
			if (val != null) {
				result.put(memberIds.get(i), Integer.parseInt((String)val));
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

	private static byte[] bytes(String value) {
		return value.getBytes(StandardCharsets.UTF_8);
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
