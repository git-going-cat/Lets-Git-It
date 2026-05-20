package com.gitcat.letsgitit.domain.competitive.repository;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.competitive.constants.ContributionRedisKeys;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionRankingCache;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
public class ContributionGameRedisRepositoryImpl implements ContributionGameRedisRepository {

	private static final String CAT_SCORE_FIELD = "CAT";
	private static final String COMMAND_STATUS_CLEARED = "CLEARED";
	private static final String SESSION_STATUS_IN_PROGRESS = "IN_PROGRESS";
	private static final String SESSION_STATUS_ENDED = "ENDED";
	private static final Duration SESSION_TTL = Duration.ofHours(2);
	private static final RedisScript<Long> MARK_ENDED_IF_IN_PROGRESS_SCRIPT = RedisScript.of("""
		local value = redis.call('GET', KEYS[1])
		if not value then
			return 0
		end
		local session = cjson.decode(value)
		if session['status'] ~= ARGV[1] then
			return 0
		end
		session['status'] = ARGV[2]
		redis.call('SET', KEYS[1], cjson.encode(session), 'PX', ARGV[3])
		return 1
		""", Long.class);

	private final StringRedisTemplate gameStringRedisTemplate;
	private final ObjectMapper objectMapper;

	public ContributionGameRedisRepositoryImpl(
		@Qualifier("gameStringRedisTemplate")
		StringRedisTemplate gameStringRedisTemplate,
		ObjectMapper objectMapper) {
		this.gameStringRedisTemplate = gameStringRedisTemplate;
		this.objectMapper = objectMapper;
	}

	@Override
	public void initializeSession(ContributionGameSessionCache session) {
		UUID gameSessionId = session.gameSessionId();
		gameStringRedisTemplate.opsForValue().set(ContributionRedisKeys.meta(gameSessionId), toJson(session));

		for (ContributionCommandCache command : session.commands()) {
			gameStringRedisTemplate.opsForHash().put(
				ContributionRedisKeys.commands(gameSessionId),
				String.valueOf(command.commandSequence()),
				toJson(command));
		}

		for (ContributionPlayerCache player : session.players()) {
			String playerId = player.playerId().toString();
			gameStringRedisTemplate.opsForHash().put(
				ContributionRedisKeys.players(gameSessionId),
				playerId,
				toJson(player));
			gameStringRedisTemplate.opsForHash().put(ContributionRedisKeys.scores(gameSessionId), playerId, "0");
			gameStringRedisTemplate.opsForHash().put(
				ContributionRedisKeys.positions(gameSessionId),
				playerId,
				session.initialBranch());
		}

		gameStringRedisTemplate.opsForHash().put(ContributionRedisKeys.scores(gameSessionId), CAT_SCORE_FIELD, "0");
		expireSessionKeys(gameSessionId);
	}

	private void expireSessionKeys(UUID gameSessionId) {
		for (String key : sessionKeys(gameSessionId)) {
			gameStringRedisTemplate.expire(key, SESSION_TTL);
		}
	}

	@Override
	public void deleteSession(UUID gameSessionId) {
		gameStringRedisTemplate.delete(sessionKeys(gameSessionId));
	}

	private List<String> sessionKeys(UUID gameSessionId) {
		return List.of(
			ContributionRedisKeys.meta(gameSessionId),
			ContributionRedisKeys.commands(gameSessionId),
			ContributionRedisKeys.players(gameSessionId),
			ContributionRedisKeys.scores(gameSessionId),
			ContributionRedisKeys.positions(gameSessionId),
			ContributionRedisKeys.rankings(gameSessionId),
			ContributionRedisKeys.disconnectedPlayers(gameSessionId));
	}

	@Override
	public Optional<ContributionGameSessionCache> findSession(UUID gameSessionId) {
		String value = gameStringRedisTemplate.opsForValue().get(ContributionRedisKeys.meta(gameSessionId));
		if (value == null) {
			return Optional.empty();
		}
		return Optional.of(fromJson(value, ContributionGameSessionCache.class));
	}

	@Override
	public Optional<ContributionCommandCache> findCommand(UUID gameSessionId, int commandSequence) {
		Object value = gameStringRedisTemplate.opsForHash()
			.get(ContributionRedisKeys.commands(gameSessionId), String.valueOf(commandSequence));
		if (value == null) {
			return Optional.empty();
		}
		return Optional.of(fromJson(value.toString(), ContributionCommandCache.class));
	}

	@Override
	public List<ContributionCommandCache> findCommands(UUID gameSessionId) {
		Map<Object, Object> commands = gameStringRedisTemplate.opsForHash()
			.entries(ContributionRedisKeys.commands(gameSessionId));
		return commands.values().stream()
			.map(value -> fromJson(value.toString(), ContributionCommandCache.class))
			.toList();
	}

	@Override
	public void saveCommand(UUID gameSessionId, ContributionCommandCache command) {
		gameStringRedisTemplate.opsForHash().put(
			ContributionRedisKeys.commands(gameSessionId),
			String.valueOf(command.commandSequence()),
			toJson(command));
	}

	@Override
	public void markSessionEnded(UUID gameSessionId) {
		findSession(gameSessionId)
			.ifPresent(session -> gameStringRedisTemplate.opsForValue()
				.set(ContributionRedisKeys.meta(gameSessionId), toJson(session.ended()), SESSION_TTL));
	}

	@Override
	public boolean markSessionEndedIfInProgress(UUID gameSessionId) {
		Long result = gameStringRedisTemplate.execute(
			MARK_ENDED_IF_IN_PROGRESS_SCRIPT,
			List.of(ContributionRedisKeys.meta(gameSessionId)),
			SESSION_STATUS_IN_PROGRESS,
			SESSION_STATUS_ENDED,
			String.valueOf(SESSION_TTL.toMillis()));
		return Long.valueOf(1L).equals(result);
	}

	@Override
	public boolean existsPlayer(UUID gameSessionId, UUID playerId) {
		return Boolean.TRUE.equals(gameStringRedisTemplate.opsForHash()
			.hasKey(ContributionRedisKeys.players(gameSessionId), playerId.toString()));
	}

	@Override
	public List<ContributionPlayerCache> findPlayers(UUID gameSessionId) {
		Map<Object, Object> players = gameStringRedisTemplate.opsForHash()
			.entries(ContributionRedisKeys.players(gameSessionId));
		return players.values().stream()
			.map(value -> fromJson(value.toString(), ContributionPlayerCache.class))
			.toList();
	}

	@Override
	public boolean existsBranch(UUID gameSessionId, String branch) {
		return findSession(gameSessionId)
			.map(session -> session.initialBranch().equals(branch)
				|| session.commands().stream().anyMatch(command -> branch.equals(command.branchName())))
			.orElse(false);
	}

	@Override
	public Optional<String> findPosition(UUID gameSessionId, UUID playerId) {
		Object branch = gameStringRedisTemplate.opsForHash().get(
			ContributionRedisKeys.positions(gameSessionId),
			playerId.toString());
		return Optional.ofNullable(branch).map(Object::toString);
	}

	@Override
	public void updatePosition(UUID gameSessionId, UUID playerId, String branch) {
		gameStringRedisTemplate.opsForHash().put(
			ContributionRedisKeys.positions(gameSessionId),
			playerId.toString(),
			branch);
	}

	@Override
	public long incrementSuccessCount(UUID gameSessionId, UUID playerId) {
		Long count = gameStringRedisTemplate.opsForHash()
			.increment(ContributionRedisKeys.scores(gameSessionId), playerId.toString(), 1);
		return count == null ? 0 : count;
	}

	@Override
	public long incrementCatExpiredCount(UUID gameSessionId) {
		Long count = gameStringRedisTemplate.opsForHash()
			.increment(ContributionRedisKeys.scores(gameSessionId), CAT_SCORE_FIELD, 1);
		return count == null ? 0 : count;
	}

	@Override
	public int findSuccessCount(UUID gameSessionId, UUID playerId) {
		Object value = gameStringRedisTemplate.opsForHash()
			.get(ContributionRedisKeys.scores(gameSessionId), playerId.toString());
		return parseInt(value);
	}

	@Override
	public int findCatExpiredCount(UUID gameSessionId) {
		Object value = gameStringRedisTemplate.opsForHash()
			.get(ContributionRedisKeys.scores(gameSessionId), CAT_SCORE_FIELD);
		return parseInt(value);
	}

	@Override
	public int countScoredClearedCommands(UUID gameSessionId) {
		Map<Object, Object> commands = gameStringRedisTemplate.opsForHash()
			.entries(ContributionRedisKeys.commands(gameSessionId));
		return (int)commands.values().stream()
			.map(value -> fromJson(value.toString(), ContributionCommandCache.class))
			.filter(command -> COMMAND_STATUS_CLEARED.equals(command.status()))
			.count();
	}

	@Override
	public void saveFinalRankings(UUID gameSessionId, List<ContributionRankingCache> rankings) {
		gameStringRedisTemplate.opsForValue().set(
			ContributionRedisKeys.rankings(gameSessionId),
			toJson(rankings),
			SESSION_TTL);
	}

	@Override
	public boolean markPlayerDisconnected(UUID gameSessionId, UUID playerId) {
		String key = ContributionRedisKeys.disconnectedPlayers(gameSessionId);
		Long added = gameStringRedisTemplate.opsForSet().add(key, playerId.toString());
		gameStringRedisTemplate.expire(key, SESSION_TTL);
		return Long.valueOf(1L).equals(added);
	}

	@Override
	public boolean isPlayerDisconnected(UUID gameSessionId, UUID playerId) {
		return Boolean.TRUE.equals(gameStringRedisTemplate.opsForSet()
			.isMember(ContributionRedisKeys.disconnectedPlayers(gameSessionId), playerId.toString()));
	}

	@Override
	public List<ContributionRankingCache> findFinalRankings(UUID gameSessionId) {
		String value = gameStringRedisTemplate.opsForValue().get(ContributionRedisKeys.rankings(gameSessionId));
		if (value == null) {
			return List.of();
		}
		try {
			return objectMapper.readValue(
				value,
				objectMapper.getTypeFactory().constructCollectionType(List.class, ContributionRankingCache.class));
		} catch (JsonProcessingException e) {
			log.error("[contribution][redis] final ranking deserialization failed. gameSessionId={}", gameSessionId, e);
			throw new IllegalStateException("기여도 게임 최종 랭킹 Redis 역직렬화에 실패했습니다.", e);
		}
	}

	private int parseInt(Object value) {
		if (value == null) {
			return 0;
		}
		return Integer.parseInt(value.toString());
	}

	private String toJson(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("기여도 게임 Redis 직렬화에 실패했습니다.", e);
		}
	}

	private <T> T fromJson(String value, Class<T> type) {
		try {
			return objectMapper.readValue(value, type);
		} catch (JsonProcessingException e) {
			log.error("[contribution][redis] deserialization failed. type={}", type.getSimpleName(), e);
			throw new IllegalStateException("기여도 게임 Redis 역직렬화에 실패했습니다.", e);
		}
	}
}
