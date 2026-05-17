package com.gitcat.letsgitit.domain.competitive.repository;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.competitive.constants.ContributionRedisKeys;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
public class ContributionGameRedisRepositoryImpl implements ContributionGameRedisRepository {

	private static final String CAT_SCORE_FIELD = "CAT";
	private static final String COMMAND_STATUS_CLEARED = "CLEARED";
	private static final Duration SESSION_TTL = Duration.ofHours(2);

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
			ContributionRedisKeys.positions(gameSessionId));
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
	public void saveCommand(UUID gameSessionId, ContributionCommandCache command) {
		gameStringRedisTemplate.opsForHash().put(
			ContributionRedisKeys.commands(gameSessionId),
			String.valueOf(command.commandSequence()),
			toJson(command));
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
			log.error("[contribution][redis] 역직렬화 실패. type={}", type.getSimpleName(), e);
			throw new IllegalStateException("기여도 게임 Redis 역직렬화에 실패했습니다.", e);
		}
	}
}
