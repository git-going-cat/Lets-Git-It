package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
public class CoopRankingRedisRepositoryImpl implements CoopRankingRedisRepository {

	private final StringRedisTemplate rankingStringRedisTemplate;
	private final ObjectMapper objectMapper;

	public CoopRankingRedisRepositoryImpl(
		@Qualifier("rankingStringRedisTemplate")
		StringRedisTemplate rankingStringRedisTemplate,
		ObjectMapper objectMapper) {
		this.rankingStringRedisTemplate = rankingStringRedisTemplate;
		this.objectMapper = objectMapper;
	}

	// ── 등록 ────────────────────────────────────────────────────────────────────

	@Override
	public void register(String week, CoopRankingData data) {
		String zsetKey = RankingKeyUtil.coopRankingKey(week);
		String dataKey = RankingKeyUtil.coopRankingDataKey(week);
		String lookupKey = RankingKeyUtil.coopRankingLookupKey(week);
		String memberKeysKey = RankingKeyUtil.coopRankingMemberKeysKey(week);

		String lexString = RankingKeyUtil.formatCoopLexString(
			data.elapsedTime(),
			data.totalWrongOrderCount(),
			data.totalWrongTypeCount(),
			data.registeredAt(),
			data.coopResultId());

		String json;
		try {
			json = objectMapper.writeValueAsString(data);
		} catch (JsonProcessingException e) {
			log.error("[coop-ranking][register] JSON serialization failed. coopResultId={}", data.coopResultId(), e);
			throw new IllegalStateException("CoopRankingData JSON 직렬화 실패", e);
		}

		// ZADD, HSET, SADD를 한 커넥션에서 파이프라인으로 전송
		// 단일 커맨드 4회 전송 대비 커넥션 순단 시 부분 기록 가능성을 줄임
		rankingStringRedisTemplate.executePipelined(new SessionCallback<Object>() {
			@Override
			@SuppressWarnings("unchecked")
			public Object execute(RedisOperations operations) throws DataAccessException {
				operations.opsForZSet().add(zsetKey, lexString, 0.0);
				operations.opsForHash().put(dataKey, data.coopResultId(), json);
				operations.opsForHash().put(lookupKey, data.coopResultId(), lexString);
				for (String memberId : data.memberIds()) {
					String membersKey = RankingKeyUtil.coopRankingMembersKey(week, memberId);
					operations.opsForSet().add(membersKey, data.coopResultId());
					operations.opsForSet().add(memberKeysKey, memberId);
				}
				return null;
			}
		});

		log.info("[coop-ranking][register] week={}, coopResultId={}, lexString={}",
			week, data.coopResultId(), lexString);
	}

	// ── ZSet 조회 ───────────────────────────────────────────────────────────────

	@Override
	public List<String> getTopEntries(String week, int count) {
		String zsetKey = RankingKeyUtil.coopRankingKey(week);
		Set<String> result = rankingStringRedisTemplate.opsForZSet().range(zsetKey, 0, (long)count - 1);
		return result != null ? new ArrayList<>(result) : List.of();
	}

	@Override
	public List<String> getRangeByRank(String week, long start, long end) {
		String zsetKey = RankingKeyUtil.coopRankingKey(week);
		Set<String> result = rankingStringRedisTemplate.opsForZSet().range(zsetKey, start, end);
		return result != null ? new ArrayList<>(result) : List.of();
	}

	@Override
	public Long getRankByLexString(String week, String lexString) {
		String zsetKey = RankingKeyUtil.coopRankingKey(week);
		return rankingStringRedisTemplate.opsForZSet().rank(zsetKey, lexString);
	}

	@Override
	public long getTotalCount(String week) {
		String zsetKey = RankingKeyUtil.coopRankingKey(week);
		Long count = rankingStringRedisTemplate.opsForZSet().zCard(zsetKey);
		return count != null ? count : 0L;
	}

	// ── Hash 조회 ───────────────────────────────────────────────────────────────

	@Override
	public CoopRankingData getData(String week, String coopResultId) {
		String dataKey = RankingKeyUtil.coopRankingDataKey(week);
		Object json = rankingStringRedisTemplate.opsForHash().get(dataKey, coopResultId);
		if (json == null) {
			return null;
		}
		try {
			return objectMapper.readValue((String)json, CoopRankingData.class);
		} catch (JsonProcessingException e) {
			log.error("[coop-ranking][getData] JSON deserialization failed. coopResultId={}", coopResultId, e);
			return null;
		}
	}

	@Override
	public List<CoopRankingData> getDataBatch(String week, List<String> coopResultIds) {
		if (coopResultIds.isEmpty()) {
			return List.of();
		}

		String dataKey = RankingKeyUtil.coopRankingDataKey(week);
		List<Object> fields = new ArrayList<>(coopResultIds);
		List<Object> jsonList = rankingStringRedisTemplate.opsForHash().multiGet(dataKey, fields);

		// null을 포함한 채로 반환하여 호출자가 ZSet 인덱스와 결과 인덱스를 1:1 매핑할 수 있도록 보존
		List<CoopRankingData> result = new ArrayList<>(coopResultIds.size());
		for (int i = 0; i < coopResultIds.size(); i++) {
			Object json = jsonList.get(i);
			if (json != null) {
				try {
					result.add(objectMapper.readValue((String)json, CoopRankingData.class));
				} catch (JsonProcessingException e) {
					log.error("[coop-ranking][getDataBatch] JSON deserialization failed. coopResultId={}",
						coopResultIds.get(i), e);
					result.add(null);
				}
			} else {
				log.warn("[coop-ranking][getDataBatch] Hash miss. coopResultId={}", coopResultIds.get(i));
				result.add(null);
			}
		}
		return result;
	}

	@Override
	public String getLexString(String week, String coopResultId) {
		String lookupKey = RankingKeyUtil.coopRankingLookupKey(week);
		Object lexString = rankingStringRedisTemplate.opsForHash().get(lookupKey, coopResultId);
		return lexString != null ? (String)lexString : null;
	}

	// ── Set 조회 ────────────────────────────────────────────────────────────────

	@Override
	public Set<String> getMemberCoopResultIds(String week, UUID memberId) {
		String membersKey = RankingKeyUtil.coopRankingMembersKey(week, memberId.toString());
		Set<String> result = rankingStringRedisTemplate.opsForSet().members(membersKey);
		return result != null ? result : Set.of();
	}

	// ── 정산용 ──────────────────────────────────────────────────────────────────

	@Override
	public Set<String> getAllMemberKeys(String week) {
		String memberKeysKey = RankingKeyUtil.coopRankingMemberKeysKey(week);
		Set<String> result = rankingStringRedisTemplate.opsForSet().members(memberKeysKey);
		return result != null ? result : Set.of();
	}

	@Override
	public void deleteKeys(String... keys) {
		Long deleted = rankingStringRedisTemplate.delete(List.of(keys));
		log.info("[coop-ranking][delete] keyCount={}, deletedCount={}", keys.length, deleted);
	}
}
