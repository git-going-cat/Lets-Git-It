package com.gitcat.letsgitit.domain.ranking.repository;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.connection.ReturnType;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.response.UpdateContributionRankingResult;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
public class ContributionRankingRedisRepositoryImpl implements ContributionRankingRedisRepository {

	private static final String UPDATE_SCORE_SCRIPT = """
		local memberId = ARGV[1]
		local delta = tonumber(ARGV[2])
		local currentDs = tonumber(ARGV[3])
		local CONTRIBUTION_UNIT = tonumber(ARGV[4])
		local PLAY_COUNT_UNIT = tonumber(ARGV[5])
		local MAX_CONTRIBUTION = tonumber(ARGV[6])
		local MAX_PLAY_COUNT = tonumber(ARGV[7])
		local DECISECONDS_IN_WEEK = tonumber(ARGV[8])

		local oldContribution = tonumber(redis.call('HGET', KEYS[2], memberId)) or 0
		local oldPlayCount = tonumber(redis.call('HGET', KEYS[3], memberId)) or 0
		local registeredAt = tonumber(redis.call('HGET', KEYS[4], memberId))

		if registeredAt == nil then
		    registeredAt = currentDs
		    redis.call('HSET', KEYS[4], memberId, registeredAt)
		end

		local newContribution = oldContribution + delta
		local newPlayCount = oldPlayCount + 1

		local contributionOverflow = 0
		local playCountOverflow = 0
		if newContribution > MAX_CONTRIBUTION then contributionOverflow = 1 end
		if newPlayCount > MAX_PLAY_COUNT then playCountOverflow = 1 end

		local clampedContribution = math.min(newContribution, MAX_CONTRIBUTION)
		local clampedPlayCount = math.min(newPlayCount, MAX_PLAY_COUNT)
		local playCountComponent = (MAX_PLAY_COUNT - clampedPlayCount) * PLAY_COUNT_UNIT
		local timeComponent = math.max(0, DECISECONDS_IN_WEEK - registeredAt)
		local composite = (clampedContribution + 1) * CONTRIBUTION_UNIT + playCountComponent + timeComponent

		redis.call('ZADD', KEYS[1], composite, memberId)
		redis.call('HSET', KEYS[2], memberId, newContribution)
		redis.call('HSET', KEYS[3], memberId, newPlayCount)

		local rank = redis.call('ZREVRANK', KEYS[1], memberId)

		return {newContribution, newPlayCount, rank + 1, contributionOverflow, playCountOverflow}
		""";

	private final StringRedisTemplate rankingStringRedisTemplate;

	public ContributionRankingRedisRepositoryImpl(
		@Qualifier("rankingStringRedisTemplate")
		StringRedisTemplate rankingStringRedisTemplate) {
		this.rankingStringRedisTemplate = rankingStringRedisTemplate;
	}

	@Override
	public UpdateContributionRankingResult updateScore(
		String scoreKey, String contributionKey, String playCountKey, String registeredAtKey,
		UUID memberId, int deltaContribution, long currentDeciseconds) {

		String memberIdValue = memberId.toString();

		List<Long> result = rankingStringRedisTemplate
			.execute((RedisCallback<List<Long>>)connection -> connection.scriptingCommands()
				.eval(
					bytes(UPDATE_SCORE_SCRIPT),
					ReturnType.MULTI,
					4,
					bytes(scoreKey),
					bytes(contributionKey),
					bytes(playCountKey),
					bytes(registeredAtKey),
					bytes(memberIdValue),
					bytes(String.valueOf(deltaContribution)),
					bytes(String.valueOf(currentDeciseconds)),
					bytes(String.valueOf(RankingKeyUtil.CONTRIBUTION_UNIT)),
					bytes(String.valueOf(RankingKeyUtil.PLAY_COUNT_UNIT)),
					bytes(String.valueOf(RankingKeyUtil.MAX_CONTRIBUTION)),
					bytes(String.valueOf(RankingKeyUtil.MAX_PLAY_COUNT)),
					bytes(String.valueOf(RankingKeyUtil.DECISECONDS_IN_WEEK))));

		if (result == null || result.size() < 5) {
			throw new IllegalStateException("Lua script returned unexpected result");
		}

		int newContribution = result.get(0).intValue();
		int newPlayCount = result.get(1).intValue();
		int rank = result.get(2).intValue();
		boolean contributionOverflow = result.get(3) == 1L;
		boolean playCountOverflow = result.get(4) == 1L;

		log.info(
			"[ranking][contribution][update] memberId={}, delta={}, newContribution={}, newPlayCount={}, rank={}, contributionOverflow={}, playCountOverflow={}",
			memberId, deltaContribution, newContribution, newPlayCount, rank, contributionOverflow, playCountOverflow);

		return new UpdateContributionRankingResult(
			newContribution, newPlayCount, rank, contributionOverflow, playCountOverflow);
	}

	@Override
	public List<RankEntry> getTopEntries(String key, int count) {
		Set<ZSetOperations.TypedTuple<String>> tuples = rankingStringRedisTemplate.opsForZSet()
			.reverseRangeWithScores(key, 0, (long)count - 1);
		return toRankEntries(tuples);
	}

	@Override
	public List<RankEntry> getRangeByRank(String key, long start, long end) {
		Set<ZSetOperations.TypedTuple<String>> tuples = rankingStringRedisTemplate.opsForZSet()
			.reverseRangeWithScores(key, start, end);
		return toRankEntries(tuples);
	}

	@Override
	public Long getRankZeroBased(String key, UUID memberId) {
		return rankingStringRedisTemplate.opsForZSet()
			.reverseRank(key, memberId.toString());
	}

	@Override
	public long getTotalCount(String key) {
		Long count = rankingStringRedisTemplate.opsForZSet().zCard(key);
		return count != null ? count : 0L;
	}

	@Override
	public Integer getContribution(String contributionKey, UUID memberId) {
		Object value = rankingStringRedisTemplate.opsForHash()
			.get(contributionKey, memberId.toString());
		return value != null ? Integer.parseInt((String)value) : null;
	}

	@Override
	public Map<UUID, Integer> getContributions(String contributionKey, List<UUID> memberIds) {
		if (memberIds.isEmpty()) {
			return Map.of();
		}
		List<Object> fields = memberIds.stream().map(UUID::toString).collect(Collectors.toList());
		List<Object> values = rankingStringRedisTemplate.opsForHash().multiGet(contributionKey, fields);

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
	public Integer getPlayCount(String playCountKey, UUID memberId) {
		Object value = rankingStringRedisTemplate.opsForHash()
			.get(playCountKey, memberId.toString());
		return value != null ? Integer.parseInt((String)value) : null;
	}

	@Override
	public Map<UUID, Integer> getPlayCounts(String playCountKey, List<UUID> memberIds) {
		if (memberIds.isEmpty()) {
			return Map.of();
		}
		List<Object> fields = memberIds.stream().map(UUID::toString).collect(Collectors.toList());
		List<Object> values = rankingStringRedisTemplate.opsForHash().multiGet(playCountKey, fields);

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
	public void deleteKeys(String... keys) {
		Long deleted = rankingStringRedisTemplate.delete(List.of(keys));
		log.info("[ranking][contribution][delete] keyCount={}, deletedCount={}", keys.length, deleted);
	}

	private static byte[] bytes(String value) {
		return value.getBytes(StandardCharsets.UTF_8);
	}

	private List<RankEntry> toRankEntries(Set<ZSetOperations.TypedTuple<String>> tuples) {
		if (tuples == null || tuples.isEmpty()) {
			return List.of();
		}

		List<RankEntry> result = new ArrayList<>(tuples.size());
		for (ZSetOperations.TypedTuple<String> t : tuples) {
			result.add(new RankEntry(t.getValue(), t.getScore()));
		}
		return result;
	}
}
