package com.gitcat.letsgitit.domain.coop.service;

import static com.gitcat.letsgitit.domain.coop.constants.CoopConstants.*;
import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.gitcat.letsgitit.domain.coop.dto.request.CoopInputRequest;
import com.gitcat.letsgitit.domain.coop.dto.request.CoopResetRequest;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopGameEndResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopInputCorrectResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopInputWrongResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopOrderWrongResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopResetWrongResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopRoundAssignResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopRoundRevealResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopRoundRevealResponse.CommandDto;
import com.gitcat.letsgitit.domain.coop.entity.CoopCommandSetItem;
import com.gitcat.letsgitit.domain.coop.entity.CoopResult;
import com.gitcat.letsgitit.domain.coop.entity.CoopResultMember;
import com.gitcat.letsgitit.domain.coop.repository.CoopCommandSetItemRepository;
import com.gitcat.letsgitit.domain.coop.repository.CoopGameRedisRepository;
import com.gitcat.letsgitit.domain.coop.repository.CoopResultMemberRepository;
import com.gitcat.letsgitit.domain.coop.repository.CoopResultRepository;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.service.CoopRankingService;
import com.gitcat.letsgitit.domain.ranking.util.RankingTimeUtil;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoopGameServiceImpl implements CoopGameService {

	private final CoopCommandSetItemRepository commandSetItemRepository;
	private final CoopGameRedisRepository coopGameRedisRepository;
	private final CoopResultRepository coopResultRepository;
	private final CoopResultMemberRepository coopResultMemberRepository;
	private final MemberService memberService;
	private final RecordService recordService;
	private final CoopRankingService coopRankingService;
	private final WebSocketMessageSender messageSender;
	private final RedissonClient redissonClient;
	private final TaskScheduler taskScheduler;
	private final TransactionTemplate transactionTemplate;

	@Lazy
	@Autowired
	private RoomService roomService;

	// ── 게임 시작 ────────────────────────────────────────────────────────────────

	@Override
	public void initAndStartGame(Long roomId, UUID gameSessionId, UUID mapId, List<UUID> playerIds,
		String mapName, String mapDifficulty, String teamName) {
		coopGameRedisRepository.initGameState(gameSessionId, mapId, roomId, playerIds, mapName, mapDifficulty,
			teamName);
		coopGameRedisRepository.saveRoomGameSession(roomId, gameSessionId);
		log.info("[coop] game initialized. gameSessionId={}, roomId={}", gameSessionId, roomId);
		startRound(roomId, gameSessionId, mapId, 1, false, null);
	}

	// ── 명령어 입력 ──────────────────────────────────────────────────────────────

	@Override
	public void processInput(Long roomId, UUID memberId, CoopInputRequest request) {
		UUID gameSessionId = coopGameRedisRepository.findGameSessionIdByRoomId(roomId);
		if (gameSessionId == null)
			throw new BusinessException(GAME_ALREADY_ENDED);

		String lockKey = String.format(LOCK_INPUT, gameSessionId);
		RLock lock = redissonClient.getLock(lockKey);
		boolean gameEnded = false;

		try {
			boolean acquired = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS);
			if (!acquired) {
				log.warn("[coop] input lock acquisition failed. gameSessionId={}, memberId={}", gameSessionId,
					memberId);
				throw new BusinessException(LOCK_ACQUISITION_FAILED);
			}

			if (!coopGameRedisRepository.isGameActive(gameSessionId)) {
				throw new BusinessException(GAME_ALREADY_ENDED);
			}
			if (coopGameRedisRepository.isBlocked(gameSessionId)) {
				throw new BusinessException(INPUT_BLOCKED);
			}

			int completedCount = coopGameRedisRepository.getCompletedCount(gameSessionId);
			int currentRound = completedCount / COMMANDS_PER_ROUND + 1;
			int nextOrder = completedCount % COMMANDS_PER_ROUND + 1; // 1~4

			// 정답 명령어 조회
			String expectedCommand = coopGameRedisRepository.getCommandByOrder(
				gameSessionId, currentRound, nextOrder);

			// 내 배정 명령어 조회
			String assignedCommand = coopGameRedisRepository.getAssignedCommand(
				gameSessionId, currentRound, memberId);

			// 오타 검증: 내가 타이핑한 텍스트 != 내 배정 명령어
			if (!request.inputText().equals(assignedCommand)) {
				handleInputWrong(gameSessionId, memberId, request.requestId());
				return;
			}

			// 순서 검증: 내 배정 명령어 != 현재 순서의 정답 명령어
			if (!assignedCommand.equals(expectedCommand)) {
				handleOrderWrong(roomId, gameSessionId, memberId, request.requestId());
				return;
			}

			// 정답 처리 — 게임 완료 여부만 판별, endGame은 락 해제 후 실행
			gameEnded = handleInputCorrect(roomId, gameSessionId, memberId, request.requestId(), currentRound);

		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new BusinessException(LOCK_INTERRUPTED);
		} finally {
			if (lock.isHeldByCurrentThread()) {
				lock.unlock();
			}
		}
		// SEMI-1: DB저장·Redis삭제·WebSocket 송신을 LOCK_INPUT 점유 범위 밖에서 실행
		if (gameEnded) {
			endGame(roomId, gameSessionId);
		}
	}

	// ── git reset 입력 ───────────────────────────────────────────────────────────

	@Override
	public void processReset(Long roomId, UUID memberId, CoopResetRequest request) {
		UUID gameSessionId = coopGameRedisRepository.findGameSessionIdByRoomId(roomId);
		if (gameSessionId == null)
			throw new BusinessException(GAME_ALREADY_ENDED);

		String lockKey = String.format(LOCK_RESET, gameSessionId);
		RLock lock = redissonClient.getLock(lockKey);

		try {
			boolean acquired = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS);
			if (!acquired) {
				log.warn("[coop] reset lock acquisition failed. gameSessionId={}, memberId={}", gameSessionId,
					memberId);
				throw new BusinessException(LOCK_ACQUISITION_FAILED);
			}

			if (!coopGameRedisRepository.isGameActive(gameSessionId)) {
				throw new BusinessException(GAME_ALREADY_ENDED);
			}
			if (!coopGameRedisRepository.isBlocked(gameSessionId)) {
				throw new BusinessException(RESET_NOT_REQUIRED);
			}

			UUID resetTargetId = coopGameRedisRepository.getResetTargetPlayerId(gameSessionId);
			if (!memberId.equals(resetTargetId)) {
				throw new BusinessException(NOT_RESET_PLAYER);
			}

			// 오타 검증
			if (!GIT_RESET_COMMAND.equals(request.inputText())) {
				messageSender.sendToUser(memberId.toString(),
					CoopResetWrongResponse.of(gameSessionId, request.requestId(), memberId));
				return;
			}

			// 리셋 처리
			int currentRound = coopGameRedisRepository.getCurrentRound(gameSessionId);
			// unblock() 전에 닉네임 조회: unblock()이 FIELD_RESET_TARGET을 클리어하므로
			// 3초 뒤 assignAndSend()에서 읽으면 항상 null이 됨
			// resetTargetId는 위에서 이미 null이 아님을 검증함 (NOT_RESET_PLAYER 처리)
			String wrongNickname = memberService.getNicknameById(resetTargetId);

			coopGameRedisRepository.unblock(gameSessionId);
			coopGameRedisRepository.resetRoundProgress(gameSessionId, currentRound);

			UUID mapId = coopGameRedisRepository.getMapId(gameSessionId);
			log.info("[coop] game reset. gameSessionId={}, round={}", gameSessionId, currentRound);
			startRound(roomId, gameSessionId, mapId, currentRound, true, wrongNickname);

		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new BusinessException(LOCK_INTERRUPTED);
		} finally {
			if (lock.isHeldByCurrentThread()) {
				lock.unlock();
			}
		}
	}

	// ── 이탈 처리 ────────────────────────────────────────────────────────────────

	@Override
	public void handlePlayerDisconnect(Long roomId) {
		String lockKey = String.format(LOCK_DISCONNECT, roomId);
		RLock lock = redissonClient.getLock(lockKey);
		try {
			boolean acquired = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS);
			if (!acquired) {
				log.warn("[coop] disconnect lock acquisition failed. roomId={}", roomId);
				return;
			}
			UUID gameSessionId = coopGameRedisRepository.findGameSessionIdByRoomId(roomId);
			// gameSessionId가 null이면 100ms 윈도우 중 disconnect(아직 initAndStartGame이 실행 전)
			// isGameActive가 false면 endGame()이 이미 완료된 케이스 — 두 경우 모두 Redis 정리는 생략
			if (gameSessionId != null && coopGameRedisRepository.isGameActive(gameSessionId)) {
				coopGameRedisRepository.deleteGameState(gameSessionId);
				coopGameRedisRepository.deleteRoomGameSession(roomId);
				roomService.resetRoomAfterGame(roomId);
				messageSender.send("/topic/room/" + roomId + "/coop",
					CoopGameEndResponse.disconnected(gameSessionId));
			}
			log.info("[coop] player disconnected. gameSessionId={}, roomId={}", gameSessionId, roomId);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			log.warn("[coop] disconnect lock interrupted. roomId={}", roomId);
		} finally {
			if (lock.isHeldByCurrentThread()) {
				lock.unlock();
			}
		}
	}

	// ── private: 라운드 시작 ──────────────────────────────────────────────────────

	private void startRound(Long roomId, UUID gameSessionId, UUID mapId, int round, boolean isReset,
		String wrongNickname) {
		// DB에서 명령어 4개 조회
		List<CoopCommandSetItem> items = commandSetItemRepository.findByMapIdAndRound(mapId, round);

		Map<Integer, String> commands = items.stream()
			.collect(Collectors.toMap(CoopCommandSetItem::getSequence, CoopCommandSetItem::getCommandText));

		// Redis에 명령어 저장
		coopGameRedisRepository.saveRoundCommands(gameSessionId, round, commands);
		coopGameRedisRepository.setRound(gameSessionId, round);

		// CommandDto 목록 생성 (순서 포함)
		List<CommandDto> commandDtos = items.stream()
			.map(item -> new CommandDto(item.getSequence(), item.getCommandText()))
			.toList();

		// COOP_ROUND_REVEAL 브로드캐스트
		messageSender.send("/topic/room/" + roomId + "/coop",
			CoopRoundRevealResponse.of(gameSessionId, round, isReset, commandDtos));

		log.info("[coop] round reveal sent. gameSessionId={}, round={}, isReset={}",
			gameSessionId, round, isReset);

		// 3초 후 ASSIGN 처리 — wrongNickname은 processReset()에서 unblock() 전에 이미 조회한 값
		taskScheduler.schedule(
			() -> assignAndSend(roomId, gameSessionId, round, isReset, wrongNickname),
			java.time.Instant.now().plusMillis(REVEAL_DURATION_MS));
	}

	private void assignAndSend(Long roomId, UUID gameSessionId, int round, boolean isReset,
		String wrongNickname) {
		if (!coopGameRedisRepository.isGameActive(gameSessionId)) {
			log.warn("[coop] game already ended before assign. gameSessionId={}", gameSessionId);
			return;
		}

		List<UUID> players = coopGameRedisRepository.getPlayers(gameSessionId);

		// 라운드 명령어 셔플 후 플레이어에게 1개씩 배정
		List<Integer> orders = new ArrayList<>(List.of(1, 2, 3, 4));
		Collections.shuffle(orders);

		for (int i = 0; i < players.size(); i++) {
			UUID playerId = players.get(i);
			int assignedOrder = orders.get(i);
			String assignedText = coopGameRedisRepository.getCommandByOrder(gameSessionId, round, assignedOrder);

			coopGameRedisRepository.assignCommand(gameSessionId, round, playerId, assignedText);

			messageSender.sendToUser(playerId.toString(),
				CoopRoundAssignResponse.of(gameSessionId, round, isReset, assignedText, wrongNickname));
		}

		log.info("[coop] round assign sent. gameSessionId={}, round={}", gameSessionId, round);
	}

	// ── private: 입력 처리 ────────────────────────────────────────────────────────

	private void handleOrderWrong(Long roomId, UUID gameSessionId, UUID memberId, UUID requestId) {
		String nickname = memberService.getNicknameById(memberId);
		coopGameRedisRepository.block(gameSessionId, memberId);
		coopGameRedisRepository.incrementWrongOrder(gameSessionId, memberId);
		messageSender.send("/topic/room/" + roomId + "/coop",
			CoopOrderWrongResponse.of(gameSessionId, requestId, memberId, nickname));
		log.info("[coop] order wrong. gameSessionId={}, memberId={}", gameSessionId, memberId);
	}

	private void handleInputWrong(UUID gameSessionId, UUID memberId, UUID requestId) {
		coopGameRedisRepository.incrementWrongType(gameSessionId, memberId);
		messageSender.sendToUser(memberId.toString(),
			CoopInputWrongResponse.of(gameSessionId, requestId, memberId));
		log.info("[coop] input wrong (typo). gameSessionId={}, memberId={}", gameSessionId, memberId);
	}

	private boolean handleInputCorrect(Long roomId, UUID gameSessionId, UUID memberId, UUID requestId,
		int currentRound) {
		int newCompleted = coopGameRedisRepository.incrementCompletedCount(gameSessionId);
		int round = (newCompleted - 1) / COMMANDS_PER_ROUND + 1;
		int stepInRound = (newCompleted - 1) % COMMANDS_PER_ROUND + 1;
		boolean isRoundComplete = (newCompleted % COMMANDS_PER_ROUND == 0);
		boolean isGameComplete = (newCompleted == TOTAL_COMMANDS);

		messageSender.send("/topic/room/" + roomId + "/coop",
			CoopInputCorrectResponse.of(gameSessionId, requestId, newCompleted, round, stepInRound,
				isRoundComplete));

		log.info("[coop] input correct. gameSessionId={}, sequence={}, round={}, step={}",
			gameSessionId, newCompleted, round, stepInRound);

		if (isGameComplete) {
			return true;
		} else if (isRoundComplete) {
			UUID mapId = coopGameRedisRepository.getMapId(gameSessionId);
			startRound(roomId, gameSessionId, mapId, round + 1, false, null);
		}
		return false;
	}

	private void endGame(Long roomId, UUID gameSessionId) {
		// LOCK_DISCONNECT를 획득해 handlePlayerDisconnect와의 동시 실행을 막는다.
		// 선점 케이스 1: disconnect가 먼저 상태를 지운 경우 → isGameActive=false → 조기 반환
		// 선점 케이스 2: endGame이 먼저 락을 획득한 경우 → disconnect는 isGameActive=false를 보고 조기 반환
		String disconnectLockKey = String.format(LOCK_DISCONNECT, roomId);
		RLock disconnectLock = redissonClient.getLock(disconnectLockKey);
		try {
			boolean acquired = disconnectLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS);
			if (!acquired) {
				log.warn("[coop] endGame: disconnect lock acquisition failed. gameSessionId={}, roomId={}",
					gameSessionId, roomId);
				return;
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			log.warn("[coop] endGame interrupted while acquiring lock. gameSessionId={}", gameSessionId);
			return;
		}

		try {
			if (!coopGameRedisRepository.isGameActive(gameSessionId)) {
				log.warn("[coop] endGame: game already terminated (disconnect race). gameSessionId={}", gameSessionId);
				return;
			}
			endGameInternal(roomId, gameSessionId);
		} finally {
			if (disconnectLock.isHeldByCurrentThread()) {
				disconnectLock.unlock();
			}
		}
	}

	private void endGameInternal(Long roomId, UUID gameSessionId) {
		long startTime = coopGameRedisRepository.getStartTime(gameSessionId);
		int elapsedTime = (int)(System.currentTimeMillis() - startTime);

		List<UUID> players = coopGameRedisRepository.getPlayers(gameSessionId);

		// 플레이어별 오타/순서오류 수 조회
		record PlayerStats(UUID id, int wrongType, int wrongOrder) {
		}
		List<PlayerStats> statsList = players.stream()
			.map(id -> new PlayerStats(
				id,
				coopGameRedisRepository.getWrongType(gameSessionId, id),
				coopGameRedisRepository.getWrongOrder(gameSessionId, id)))
			.toList();

		// 랭킹 계산: 오류 총합 오름차순, 공동 순위 허용
		List<PlayerStats> sorted = statsList.stream()
			.sorted(Comparator.comparingInt(s -> s.wrongType() + s.wrongOrder()))
			.toList();
		Map<UUID, Integer> rankMap = new HashMap<>();
		for (int i = 0; i < sorted.size(); i++) {
			PlayerStats s = sorted.get(i);
			if (i == 0) {
				rankMap.put(s.id(), 1);
			} else {
				PlayerStats prev = sorted.get(i - 1);
				int prevTotal = prev.wrongType() + prev.wrongOrder();
				int curTotal = s.wrongType() + s.wrongOrder();
				rankMap.put(s.id(), curTotal == prevTotal ? rankMap.get(prev.id()) : i + 1);
			}
		}

		// DB 저장
		String mapName = coopGameRedisRepository.getMapName(gameSessionId);
		int difficulty = Integer.parseInt(coopGameRedisRepository.getMapDifficulty(gameSessionId));
		String teamName = coopGameRedisRepository.getTeamName(gameSessionId);
		int totalWrongType = statsList.stream().mapToInt(PlayerStats::wrongType).sum();
		int totalWrongOrder = statsList.stream().mapToInt(PlayerStats::wrongOrder).sum();

		// private 메서드에는 @Transactional AOP가 적용되지 않으므로 TransactionTemplate으로 직접 트랜잭션 시작
		// CoopResult 저장 → CoopResultMember 저장 → 최고기록 갱신 → 플레이 시간 누적을 하나의 트랜잭션으로 묶음
		// DB 저장 실패 시에도 Redis 정리·방 초기화·클라이언트 알림은 반드시 실행되어야 하므로 예외를 잡아둠
		record SaveResult(CoopResult coopResult, Map<UUID, Boolean> newRecordMap) {
		}
		SaveResult saveResult = null;

		try {
			saveResult = transactionTemplate.execute(status -> {
				CoopResult result = coopResultRepository.save(
					CoopResult.of(roomId, gameSessionId.toString(), mapName, difficulty,
						teamName, elapsedTime, totalWrongType, totalWrongOrder));

				coopResultMemberRepository.saveAll(statsList.stream()
					.map(s -> CoopResultMember.of(result.getId(), s.id(), s.wrongType(), s.wrongOrder()))
					.toList());

				Map<UUID, Boolean> newRecordMap = new HashMap<>();
				statsList.forEach(s -> {
					newRecordMap.put(s.id(),
						recordService.updateCoopBestRecord(s.id(), mapName, difficulty, elapsedTime,
							rankMap.get(s.id())));
					memberService.addPlayTime(s.id(), elapsedTime / 1000);
				});

				return new SaveResult(result, newRecordMap);
			});

			// DB 저장 성공한 경우에만 랭킹 등록 시도
			try {
				List<String> memberIdStrings = players.stream()
					.map(UUID::toString)
					.toList();

				CoopRankingData rankingData = new CoopRankingData(
					saveResult.coopResult().getId().toString(),
					teamName,
					mapName,
					difficulty,
					elapsedTime,
					totalWrongOrder,
					totalWrongType,
					RankingTimeUtil.currentWeekDeciseconds(),
					memberIdStrings);

				coopRankingService.registerCoopRanking(rankingData);
			} catch (Exception e) {
				log.error("[coop] ranking registration failed. gameSessionId={}, coopResultId={}",
					gameSessionId, saveResult.coopResult().getId(), e);
			}

		} catch (Exception e) {
			log.error("[coop] DB 저장 실패. gameSessionId={}, roomId={}", gameSessionId, roomId, e);
		}
	}
}
