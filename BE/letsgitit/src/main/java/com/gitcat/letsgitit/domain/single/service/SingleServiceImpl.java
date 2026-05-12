package com.gitcat.letsgitit.domain.single.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.service.SingleRankingService;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.domain.single.dto.SingleSessionCache;
import com.gitcat.letsgitit.domain.single.dto.request.SingleResultSaveRequest;
import com.gitcat.letsgitit.domain.single.dto.request.SingleSessionStartRequest;
import com.gitcat.letsgitit.domain.single.dto.response.CommandSetDto;
import com.gitcat.letsgitit.domain.single.dto.response.SingleResultResponse;
import com.gitcat.letsgitit.domain.single.dto.response.SingleSessionStartResponse;
import com.gitcat.letsgitit.domain.single.entity.SingleCommandSet;
import com.gitcat.letsgitit.domain.single.entity.SingleResult;
import com.gitcat.letsgitit.domain.single.repository.SingleCommandSetRepository;
import com.gitcat.letsgitit.domain.single.repository.SingleResultRepository;
import com.gitcat.letsgitit.domain.single.repository.SingleSessionRedisRepository;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.metrics.SingleMetrics;

import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SingleServiceImpl implements SingleService {

	private final SingleResultRepository singleResultRepository;
	private final SingleCommandSetRepository singleCommandSetRepository;
	private final SingleSessionRedisRepository singleSessionRedisRepository;

	private final SingleRankingService singleRankingService;
	private final RecordService recordService;
	private final MemberService memberService;
	private final SingleMetrics singleMetrics;

	@Override
	@Transactional
	public SingleSessionStartResponse startSession(UUID memberId, SingleSessionStartRequest request) {
		Timer.Sample total = singleMetrics.start();
		Difficulty difficulty = request.difficulty();

		// 1. sessionId 생성
		String sessionId = UUID.randomUUID().toString();

		// 2-4. DB: commandSet + items + bestScore
		Timer.Sample db = singleMetrics.start();
		SingleCommandSet commandSet = selectCommandSet(difficulty);

		List<CommandSetDto> commandSetDtos = singleCommandSetRepository
			.findAllBySingleCommandSetIdOrderBySequenceAsc(commandSet.getId())
			.stream()
			.map(CommandSetDto::from)
			.toList();

		if (commandSetDtos.isEmpty()) {
			throw new IllegalStateException(
				"Single command set items are missing. commandSetId=" + commandSet.getId());
		}

		int bestScore = singleResultRepository
			.findTopByMemberIdAndDifficultyOrderByScoreDesc(memberId, difficulty)
			.map(SingleResult::getScore)
			.orElse(0);
		singleMetrics.recordStartSessionDb(db, difficulty);

		// 5. Redis 세션 저장
		Timer.Sample redis = singleMetrics.start();
		SingleSessionCache sessionCache = SingleSessionCache.of(sessionId, memberId, difficulty);
		singleSessionRedisRepository.save(sessionCache);
		OffsetDateTime expiresAt = OffsetDateTime.now().plus(singleSessionRedisRepository.getSessionTtl());
		singleMetrics.recordStartSessionRedis(redis, difficulty);

		singleMetrics.recordStartSession(total, difficulty);
		log.info("[single][startSession] difficulty={}, sessionId={}", difficulty, sessionId);

		// 6. 응답 변환
		return SingleSessionStartResponse.of(
			sessionId,
			difficulty,
			bestScore,
			commandSetDtos,
			expiresAt);
	}

	@Override
	@Transactional
	public SingleResultResponse saveResult(UUID memberId, String sessionId, SingleResultSaveRequest request) {
		Timer.Sample total = singleMetrics.start();
		Difficulty difficulty = null;
		boolean success = false;

		try {
			// 1. 이미 결과 저장된 세션인지 확인
			if (singleResultRepository.existsBySessionId(sessionId)) {
				throw new BusinessException(ALREADY_FINISHED);
			}

			// 2. Redis 세션 조회 (실패해도 latency 기록)
			Timer.Sample redisLookup = singleMetrics.start();
			Optional<SingleSessionCache> sessionOpt = singleSessionRedisRepository.findBySessionId(sessionId);
			singleMetrics.recordSaveResultRedisLookup(redisLookup);

			SingleSessionCache sessionCache = sessionOpt.orElseThrow(() -> new BusinessException(SESSION_NOT_FOUND));

			// 3. 세션 소유자 검증
			if (!sessionCache.memberId().equals(memberId)) {
				throw new BusinessException(ACCESS_DENIED);
			}

			if (sessionCache.terminated()) {
				log.info("[single][saveResult] recovered terminated session. sessionId={}", sessionId);
			}

			difficulty = sessionCache.difficulty();

			// 4. 기존 최고 점수 조회
			Optional<SingleResult> previousBest = singleResultRepository
				.findTopByMemberIdAndDifficultyOrderByScoreDesc(memberId, difficulty);

			// 4-1. 금주차 최고 점수 조회
			Integer currentWeekBest = singleRankingService.getCurrentWeekScore(difficulty, memberId);

			// 5. 결과 저장
			Timer.Sample dbSave = singleMetrics.start();
			SingleResult singleResult = SingleResult.of(
				sessionId,
				memberId,
				difficulty,
				request.status(),
				request.score(),
				request.grade(),
				request.playTime());

			try {
				singleResultRepository.save(singleResult);
			} catch (DataIntegrityViolationException e) {
				singleMetrics.recordSaveResultDbSave(dbSave);
				throw new BusinessException(ALREADY_FINISHED);
			}
			singleMetrics.recordSaveResultDbSave(dbSave);

			// 6. 누적 시간 계산
			memberService.addPlayTime(memberId, request.playTime() / 1000);

			// 7-8. 랭킹 업데이트 (주간 + 역대)
			Timer.Sample rankingUpdate = singleMetrics.start();
			// 동점은 playTime 개선 가능성이 있으므로 Redis 갱신을 시도하고, 최종 반영 여부는 Lua composite 비교가 결정한다.
			boolean isCurrentWeekBest = currentWeekBest == null || request.score() >= currentWeekBest;
			Integer currentRank = null;
			log.info(
				"[single][saveResult][ranking] sessionId={}, difficulty={}, score={}, grade={}, playTime={}, currentWeekBest={}, isCurrentWeekBest={}",
				sessionId, difficulty, request.score(), request.grade(), request.playTime(), currentWeekBest,
				isCurrentWeekBest);

			if (isCurrentWeekBest) {
				currentRank = singleRankingService.updateSingleScore(
					difficulty,
					memberId,
					request.score(),
					request.grade(),
					request.playTime());
			}

			boolean isNewRecord = previousBest.isEmpty() || request.score() > previousBest.get().getScore();

			if (isNewRecord) {
				int rank = currentRank != null ? currentRank : singleRankingService.updateSingleScore(
					difficulty,
					memberId,
					request.score(),
					request.grade(),
					request.playTime());

				recordService.updateSingleBestRecord(
					memberId,
					difficulty,
					request.score(),
					rank);
			}
			singleMetrics.recordSaveResultRankingUpdate(rankingUpdate);

			// 9. 세션 종료 처리 — DB 커밋 확정 후 실행
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					singleSessionRedisRepository.deleteBySessionId(sessionId);
				}
			});

			log.info("[single][saveResult] sessionId={}, difficulty={}, score={}, isNewRecord={}",
				sessionId, difficulty, request.score(), isNewRecord);
			success = true;
			return SingleResultResponse.of(isNewRecord);

		} catch (BusinessException e) {
			singleMetrics.incrementSaveResultError(e.getErrorCode().name());
			log.warn("[single][saveResult] error. sessionId={}, errorCode={}", sessionId, e.getErrorCode());
			throw e;
		} finally {
			singleMetrics.recordSaveResult(total, difficulty != null ? difficulty.name() : null, success);
		}
	}

	@Override
	public void terminateSession(UUID memberId, String sessionId) {
		SingleSessionCache sessionCache = singleSessionRedisRepository.findBySessionId(sessionId)
			.orElseThrow(() -> new BusinessException(SESSION_NOT_FOUND));

		if (!sessionCache.memberId().equals(memberId)) {
			throw new BusinessException(ACCESS_DENIED);
		}

		singleSessionRedisRepository.save(sessionCache.terminate());
		log.info("[single][terminateSession] sessionId={}, terminated=true", sessionId);
	}

	private SingleCommandSet selectCommandSet(Difficulty difficulty) {
		List<SingleCommandSet> commandSets = singleCommandSetRepository.findAllByDifficulty(difficulty);

		if (commandSets.isEmpty()) {
			throw new IllegalStateException(
				"Single command set is missing. difficulty=" + difficulty);
		}

		int randomIndex = ThreadLocalRandom.current().nextInt(commandSets.size());
		return commandSets.get(randomIndex);
	}
}
