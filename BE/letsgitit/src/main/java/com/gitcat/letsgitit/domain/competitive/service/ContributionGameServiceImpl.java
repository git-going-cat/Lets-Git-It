package com.gitcat.letsgitit.domain.competitive.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.COMMAND_ALREADY_CLEARED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.COMMAND_EXPIRED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.GAME_ALREADY_ENDED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.GAME_NOT_STARTED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.INVALID_COMMAND;
import static com.gitcat.letsgitit.global.exception.ErrorCode.LOCK_ACQUISITION_FAILED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.LOCK_INTERRUPTED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.PLAYER_NOT_IN_GAME;
import static com.gitcat.letsgitit.global.exception.ErrorCode.SESSION_MISMATCH;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.competitive.constants.ContributionRedisKeys;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionRankingCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionSessionCommand;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionSessionPlayer;
import com.gitcat.letsgitit.domain.competitive.message.contribution.CommandExpiredMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionExpireRequestMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionGameEndMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputFailedMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionProgressMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionRankingMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.PositionUpdateMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ScoreEntryMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ScoreUpdateMessage;
import com.gitcat.letsgitit.domain.competitive.repository.ContributionGameRedisRepository;
import com.gitcat.letsgitit.domain.ranking.service.ContributionRankingService;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContributionGameServiceImpl implements ContributionGameService {

	private static final String SESSION_STATUS_IN_PROGRESS = "IN_PROGRESS";
	private static final String SESSION_STATUS_ENDED = "ENDED";
	private static final String COMMAND_STATUS_READY = "READY";
	private static final String COMMAND_STATUS_CLEARED = "CLEARED";
	private static final String COMMAND_STATUS_EXPIRED = "EXPIRED";
	private static final String COMMAND_STATUS_SWITCHED = "SWITCHED";
	private static final String CAT_NICKNAME = "[CAT]";
	private static final long LOCK_WAIT_MS = 100;
	private static final long LOCK_LEASE_MS = 2000;
	private static final Pattern SWITCH_PATTERN = Pattern.compile("^git\\s+(switch|checkout)\\s+(.+)$");

	private final ContributionGameRedisRepository contributionGameRedisRepository;
	private final RedissonClient redissonClient;
	private final ContributionResultSaveService contributionResultSaveService;
	private final ContributionRankingService contributionRankingService;

	@Override
	public void initializeSession(
		Long roomId,
		UUID gameSessionId,
		long startAt,
		int commandSetId,
		String initialBranch,
		List<ContributionSessionCommand> commandSet,
		List<ContributionSessionPlayer> players) {
		ContributionGameSessionCache session = ContributionGameSessionCache.inProgress(
			roomId,
			gameSessionId,
			commandSetId,
			startAt,
			initialBranch,
			commandSet.stream()
				.map(command -> ContributionCommandCache.ready(
					command.commandSequence(),
					command.text(),
					command.branchName()))
				.toList(),
			players.stream()
				.map(player -> new ContributionPlayerCache(
					player.playerId(),
					player.nickname(),
					player.bestContribution()))
				.toList());
		contributionGameRedisRepository.initializeSession(session);
		log.info("[contribution][initializeSession] roomId={}, gameSessionId={}, commandSetId={}",
			roomId, gameSessionId, commandSetId);
	}

	@Override
	public void deleteSession(UUID gameSessionId) {
		contributionGameRedisRepository.deleteSession(gameSessionId);
		log.info("[contribution][deleteSession] gameSessionId={}", gameSessionId);
	}

	@Override
	public ContributionInputResult processInput(Long roomId, UUID memberId, ContributionInputMessage request) {
		ContributionGameSessionCache session = contributionGameRedisRepository.findSession(request.gameSessionId())
			.orElseThrow(() -> new BusinessException(GAME_NOT_STARTED));
		validateSession(roomId, memberId, request.gameSessionId(), session);

		if (isSwitchCommand(request.inputText())) {
			return processSwitchInput(memberId, request);
		}
		if (request.commandSequence() == null) {
			throw new BusinessException(INVALID_COMMAND);
		}

		RLock lock = redissonClient.getLock(
			ContributionRedisKeys.commandLock(request.gameSessionId(), request.commandSequence()));
		boolean locked = tryLock(lock);
		try {
			ContributionCommandCache command = contributionGameRedisRepository
				.findCommand(request.gameSessionId(), request.commandSequence())
				.orElseThrow(() -> new BusinessException(INVALID_COMMAND));
			validateCommandStatus(command);

			return processCommandInput(memberId, request, command, session);
		} finally {
			if (locked) {
				lock.unlock();
			}
		}
	}

	@Override
	public ContributionInputResult processExpireRequest(
		Long roomId,
		UUID memberId,
		ContributionExpireRequestMessage request) {
		ContributionGameSessionCache session = contributionGameRedisRepository.findSession(request.gameSessionId())
			.orElseThrow(() -> new BusinessException(GAME_NOT_STARTED));
		validateSession(roomId, memberId, request.gameSessionId(), session);

		RLock lock = redissonClient.getLock(
			ContributionRedisKeys.commandLock(request.gameSessionId(), request.commandSequence()));
		boolean locked = tryLock(lock);
		try {
			ContributionCommandCache command = contributionGameRedisRepository
				.findCommand(request.gameSessionId(), request.commandSequence())
				.orElseThrow(() -> new BusinessException(INVALID_COMMAND));
			if (!COMMAND_STATUS_READY.equals(command.status()) || isSwitchCommand(command.text())) {
				return null;
			}
			Object payload = expireReadyCommand(roomId, request.gameSessionId(), request.commandSequence(), command,
				session);
			return payload == null ? null : ContributionInputResult.broadcast(payload);
		} finally {
			if (locked) {
				lock.unlock();
			}
		}
	}

	private Object expireReadyCommand(
		Long roomId,
		UUID gameSessionId,
		int commandSequence,
		ContributionCommandCache command,
		ContributionGameSessionCache session) {
		contributionGameRedisRepository.saveCommand(gameSessionId, command.expired());
		contributionGameRedisRepository.incrementCatExpiredCount(gameSessionId);

		int clearedCommandCount = contributionGameRedisRepository.countScoredClearedCommands(gameSessionId);
		int catExpiredCount = contributionGameRedisRepository.findCatExpiredCount(gameSessionId);
		int processedCommandCount = clearedCommandCount + catExpiredCount;
		int totalCommands = countScorableCommands(session);
		List<ScoreEntryMessage> scores = buildScores(gameSessionId, clearedCommandCount, catExpiredCount);
		ContributionProgressMessage progress = buildProgress(processedCommandCount, totalCommands);

		log.info("[contribution][expireCommand] gameSessionId={}, commandSequence={}",
			gameSessionId, commandSequence);
		if (isCompleted(processedCommandCount, totalCommands)) {
			return completeGame(roomId, gameSessionId, scores, session.startAt());
		}
		return CommandExpiredMessage.of(gameSessionId, commandSequence, scores, progress);
	}

	@Override
	public ContributionGameEndMessage endByPlayerDisconnected(Long roomId, UUID gameSessionId) {
		Optional<ContributionGameSessionCache> sessionOptional = contributionGameRedisRepository.findSession(
			gameSessionId);
		if (sessionOptional.isEmpty()) {
			return ContributionGameEndMessage.playerDisconnected(gameSessionId);
		}
		ContributionGameSessionCache session = sessionOptional.get();
		if (!session.roomId().equals(roomId)) {
			throw new BusinessException(SESSION_MISMATCH);
		}
		if (!contributionGameRedisRepository.markSessionEndedIfInProgress(gameSessionId)) {
			return null;
		}
		log.info("[contribution][endByPlayerDisconnected] roomId={}, gameSessionId={}", roomId, gameSessionId);
		return ContributionGameEndMessage.playerDisconnected(gameSessionId);
	}

	private boolean tryLock(RLock lock) {
		try {
			boolean locked = lock.tryLock(LOCK_WAIT_MS, LOCK_LEASE_MS, TimeUnit.MILLISECONDS);
			if (!locked) {
				throw new BusinessException(LOCK_ACQUISITION_FAILED);
			}
			return true;
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new BusinessException(LOCK_INTERRUPTED);
		}
	}

	private void validateSession(
		Long roomId,
		UUID memberId,
		UUID gameSessionId,
		ContributionGameSessionCache session) {
		if (!session.roomId().equals(roomId)) {
			throw new BusinessException(SESSION_MISMATCH);
		}
		if (SESSION_STATUS_ENDED.equals(session.status())) {
			throw new BusinessException(GAME_ALREADY_ENDED);
		}
		if (!SESSION_STATUS_IN_PROGRESS.equals(session.status())) {
			throw new BusinessException(GAME_NOT_STARTED);
		}
		if (!contributionGameRedisRepository.existsPlayer(gameSessionId, memberId)) {
			throw new BusinessException(PLAYER_NOT_IN_GAME);
		}
	}

	private void validateCommandStatus(ContributionCommandCache command) {
		if (COMMAND_STATUS_CLEARED.equals(command.status()) || COMMAND_STATUS_SWITCHED.equals(command.status())) {
			throw new BusinessException(COMMAND_ALREADY_CLEARED);
		}
		if (COMMAND_STATUS_EXPIRED.equals(command.status())) {
			throw new BusinessException(COMMAND_EXPIRED);
		}
		if (!COMMAND_STATUS_READY.equals(command.status())) {
			throw new BusinessException(INVALID_COMMAND);
		}
	}

	private ContributionInputResult processSwitchInput(
		UUID memberId,
		ContributionInputMessage request) {
		RLock lock = redissonClient.getLock(
			ContributionRedisKeys.positionLock(request.gameSessionId(), memberId));
		boolean locked = tryLock(lock);
		try {
			String branch = parseSwitchBranch(request.inputText());
			if (!contributionGameRedisRepository.existsBranch(request.gameSessionId(), branch)) {
				return ContributionInputResult.privateMessage(
					ContributionInputFailedMessage.of(
						request.gameSessionId(),
						request.requestId(),
						memberId,
						"INVALID_BRANCH"));
			}
			contributionGameRedisRepository.updatePosition(request.gameSessionId(), memberId, branch);
			log.info("[contribution][input] switch success. memberId={}, gameSessionId={}, branch={}",
				memberId, request.gameSessionId(), branch);
			return ContributionInputResult.broadcast(
				PositionUpdateMessage.of(request.gameSessionId(), request.requestId(), memberId, branch));
		} finally {
			if (locked) {
				lock.unlock();
			}
		}
	}

	private ContributionInputResult processCommandInput(
		UUID memberId,
		ContributionInputMessage request,
		ContributionCommandCache command,
		ContributionGameSessionCache session) {
		if (!command.text().equals(request.inputText())) {
			return ContributionInputResult.privateMessage(
				ContributionInputFailedMessage.of(
					request.gameSessionId(),
					request.requestId(),
					memberId,
					"WRONG_COMMAND"));
		}
		String currentBranch = contributionGameRedisRepository.findPosition(request.gameSessionId(), memberId)
			.orElse(session.initialBranch());
		if (!command.branchName().equals(currentBranch)) {
			return ContributionInputResult.privateMessage(
				ContributionInputFailedMessage.of(
					request.gameSessionId(),
					request.requestId(),
					memberId,
					"INVALID_BRANCH"));
		}

		contributionGameRedisRepository.saveCommand(request.gameSessionId(), command.cleared(memberId));
		contributionGameRedisRepository.incrementSuccessCount(request.gameSessionId(), memberId);
		int clearedCommandCount = contributionGameRedisRepository.countScoredClearedCommands(request.gameSessionId());
		int catExpiredCount = contributionGameRedisRepository.findCatExpiredCount(request.gameSessionId());
		int processedCommandCount = clearedCommandCount + catExpiredCount;
		int totalCommands = countScorableCommands(session);
		List<ScoreEntryMessage> scores = buildScores(request.gameSessionId(), clearedCommandCount, catExpiredCount);
		ContributionProgressMessage progress = buildProgress(processedCommandCount, totalCommands);
		log.info("[contribution][input] command success. memberId={}, gameSessionId={}, commandSequence={}",
			memberId, request.gameSessionId(), request.commandSequence());
		ScoreUpdateMessage scoreUpdate = ScoreUpdateMessage.of(
			request.gameSessionId(),
			request.requestId(),
			request.commandSequence(),
			memberId,
			scores,
			progress);
		if (isCompleted(processedCommandCount, totalCommands)) {
			ContributionGameEndMessage gameEnd = completeGame(session.roomId(), request.gameSessionId(), scores,
				session.startAt());
			if (gameEnd == null) {
				return ContributionInputResult.broadcast(scoreUpdate);
			}
			return ContributionInputResult.broadcasts(List.of(scoreUpdate, gameEnd));
		}
		return ContributionInputResult.broadcast(scoreUpdate);
	}

	private List<ScoreEntryMessage> buildScores(UUID gameSessionId, int clearedCommandCount, int catExpiredCount) {
		int appearedCommands = clearedCommandCount + catExpiredCount;
		List<ScoreSeed> seeds = new ArrayList<>();
		for (ContributionPlayerCache player : contributionGameRedisRepository.findPlayers(gameSessionId)) {
			int successCount = contributionGameRedisRepository.findSuccessCount(gameSessionId, player.playerId());
			boolean disconnected = contributionGameRedisRepository.isPlayerDisconnected(gameSessionId,
				player.playerId());
			seeds.add(new ScoreSeed(player.playerId(), player.nickname(),
				contribution(successCount, appearedCommands), disconnected));
		}
		seeds.add(new ScoreSeed(null, CAT_NICKNAME, contribution(catExpiredCount, appearedCommands), false));

		seeds.sort(Comparator.comparingInt(ScoreSeed::contribution).reversed()
			.thenComparing(seed -> seed.nickname() == null ? "" : seed.nickname()));

		List<ScoreEntryMessage> scores = new ArrayList<>();
		int previousContribution = Integer.MIN_VALUE;
		int previousRank = 0;
		for (int i = 0; i < seeds.size(); i++) {
			ScoreSeed seed = seeds.get(i);
			int rank = seed.contribution() == previousContribution ? previousRank : i + 1;
			scores.add(new ScoreEntryMessage(seed.playerId(), seed.nickname(), seed.contribution(), rank,
				seed.disconnected()));
			previousContribution = seed.contribution();
			previousRank = rank;
		}
		return scores;
	}

	private ContributionProgressMessage buildProgress(int clearedCommandCount, int totalCommands) {
		int percent = totalCommands == 0 ? 0 : (int)Math.floor((clearedCommandCount * 100.0) / totalCommands);
		return new ContributionProgressMessage(clearedCommandCount, totalCommands, percent);
	}

	private boolean isCompleted(int processedCommandCount, int totalCommands) {
		return totalCommands > 0 && processedCommandCount >= totalCommands;
	}

	private ContributionGameEndMessage completeGame(Long roomId, UUID gameSessionId, List<ScoreEntryMessage> scores,
		long startAt) {
		if (!contributionGameRedisRepository.markSessionEndedIfInProgress(gameSessionId)) {
			log.info("[contribution][completeGame] already ended. roomId={}, gameSessionId={}", roomId, gameSessionId);
			return null;
		}
		List<ContributionRankingMessage> rankings = scores.stream()
			.map(score -> new ContributionRankingMessage(
				score.rank(),
				score.playerId(),
				score.nickname(),
				score.contribution(),
				score.disconnected()))
			.toList();
		List<ContributionRankingCache> finalRankings = toRankingCaches(rankings);
		contributionGameRedisRepository.saveFinalRankings(gameSessionId, finalRankings);
		boolean resultSaved = false;
		try {
			contributionResultSaveService.saveCompletedResult(
				roomId,
				gameSessionId,
				finalRankings,
				startAt);
			resultSaved = true;
		} catch (RuntimeException e) {
			log.error(
				"[contribution][completeGame] 결과 DB 저장 실패, 게임 종료는 정상 진행. roomId={}, gameSessionId={}",
				roomId, gameSessionId, e);
		}
		if (resultSaved) {
			updateContributionRankings(gameSessionId, finalRankings);
		}
		UUID winnerVideoTarget = rankings.stream()
			.anyMatch(ranking -> ranking.rank() == 1 && ranking.playerId() == null)
				? null
				: rankings.stream()
					.filter(ranking -> ranking.rank() == 1)
					.findFirst()
					.map(ContributionRankingMessage::playerId)
					.orElse(null);
		log.info("[contribution][completeGame] gameSessionId={}, winnerVideoTarget={}",
			gameSessionId, winnerVideoTarget);
		return ContributionGameEndMessage.completed(gameSessionId, rankings, winnerVideoTarget);
	}

	private void updateContributionRankings(UUID gameSessionId, List<ContributionRankingCache> finalRankings) {
		for (ContributionRankingCache ranking : finalRankings) {
			if (ranking.playerId() == null) {
				continue;
			}
			try {
				contributionRankingService.updateContributionScore(ranking.playerId(), ranking.contribution());
			} catch (RuntimeException e) {
				log.error(
					"[contribution][completeGame] 랭킹 Redis 갱신 실패. gameSessionId={}, memberId={}, contribution={}",
					gameSessionId, ranking.playerId(), ranking.contribution(), e);
			}
		}
	}

	@Override
	public void handlePlayerDisconnected(UUID gameSessionId, UUID disconnectedPlayerId) {
		contributionGameRedisRepository.markPlayerDisconnected(gameSessionId, disconnectedPlayerId);
		log.info("[contribution][handlePlayerDisconnected] gameSessionId={}, disconnectedPlayerId={}",
			gameSessionId, disconnectedPlayerId);
	}

	private List<ContributionRankingCache> toRankingCaches(List<ContributionRankingMessage> rankings) {
		return rankings.stream()
			.map(ranking -> new ContributionRankingCache(
				ranking.rank(),
				ranking.playerId(),
				ranking.nickname(),
				ranking.contribution(),
				ranking.disconnected()))
			.toList();
	}

	private int countScorableCommands(ContributionGameSessionCache session) {
		return (int)session.commands().stream()
			.filter(command -> !isSwitchCommand(command.text()))
			.count();
	}

	private int contribution(int count, int totalCommands) {
		if (totalCommands == 0) {
			return 0;
		}
		return (int)Math.floor((count * 100.0) / totalCommands);
	}

	private boolean isSwitchCommand(String commandText) {
		return commandText != null && SWITCH_PATTERN.matcher(commandText.trim()).matches();
	}

	private String parseSwitchBranch(String inputText) {
		Matcher matcher = SWITCH_PATTERN.matcher(inputText.trim());
		if (!matcher.matches()) {
			throw new BusinessException(ErrorCode.INVALID_COMMAND);
		}
		return matcher.group(2).trim();
	}

	private record ScoreSeed(
		UUID playerId,
		String nickname,
		int contribution,
		boolean disconnected) {
	}
}
