package com.gitcat.letsgitit.domain.single.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

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

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SingleServiceImpl implements SingleService {

	private final SingleResultRepository singleResultRepository;
	private final SingleCommandSetRepository singleCommandSetRepository;
	private final SingleSessionRedisRepository singleSessionRedisRepository;

	private final SingleRankingService singleRankingService;
	private final RecordService recordService;
	private final MemberService memberService;

	@Override
	@Transactional
	public SingleSessionStartResponse startSession(UUID memberId, SingleSessionStartRequest request) {

		// 1. sessionId 생성
		String sessionId = UUID.randomUUID().toString();
		Difficulty difficulty = request.difficulty();

		// 2. 난이도에 맞는 command set 조회
		SingleCommandSet commandSet = selectCommandSet(difficulty);

		// 3. command Item 조회
		List<CommandSetDto> commandSetDtos = singleCommandSetRepository
			.findAllBySingleCommandSetIdOrderBySequenceAsc(commandSet.getId())
			.stream()
			.map(CommandSetDto::from)
			.toList();

		if (commandSetDtos.isEmpty()) {
			throw new IllegalStateException(
				"Single command set items are missing. commandSetId=" + commandSet.getId());
		}

		// 4. 최고 점수 조회
		int bestScore = singleResultRepository
			.findTopByMemberIdAndDifficultyOrderByScoreDesc(memberId, difficulty)
			.map(SingleResult::getScore)
			.orElse(0);

		// 5. Redis 세션 저장
		SingleSessionCache sessionCache = SingleSessionCache.of(sessionId, memberId, difficulty);

		singleSessionRedisRepository.save(sessionCache);

		// 6. 응답 변환
		return SingleSessionStartResponse.of(
			sessionId,
			difficulty,
			bestScore,
			commandSetDtos);
	}

	@Override
	@Transactional
	public SingleResultResponse saveResult(UUID memberId, String sessionId, SingleResultSaveRequest request) {
		// 1. 이미 결과 저장된 세션인지 확인
		if (singleResultRepository.existsBySessionId(sessionId)) {
			throw new BusinessException(ALREADY_FINISHED);
		}

		// 2. Redis 세션 조회
		SingleSessionCache sessionCache = singleSessionRedisRepository.findBySessionId(sessionId)
			.orElseThrow(() -> new BusinessException(SESSION_NOT_FOUND));

		// 3. 세션 소유자 검증
		if (!sessionCache.memberId().equals(memberId)) {
			throw new BusinessException(ACCESS_DENIED);
		}

		Difficulty difficulty = sessionCache.difficulty();

		// 4. 기존 최고 점수 조회
		Optional<SingleResult> previousBest = singleResultRepository
			.findTopByMemberIdAndDifficultyOrderByScoreDesc(memberId, difficulty);

		// 5. 결과 저장
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
			throw new BusinessException(ALREADY_FINISHED);
		}

		// 6. 누적 시간 계산
		memberService.addPlayTime(memberId, request.playTime() / 1000);

		// 7. 신기록이면 랭킹 갱신
		// 		- 금주차 랭킹 최고 기록 갱신
		// 		- 역대 최고 기록 갱신
		boolean isNewRecord = false;
		if (previousBest.isEmpty() || request.score() > previousBest.get().getScore()) {
			int rank = singleRankingService.updateSingleScore(
				difficulty,
				memberId,
				request.score());

			isNewRecord = recordService.updateSingleBestRecord(
				memberId,
				difficulty,
				request.score(),
				rank);
		}

		// 8. 세션 종료 처리 — DB 커밋 확정 후 실행
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				singleSessionRedisRepository.deleteBySessionId(sessionId);
			}
		});

		return SingleResultResponse.of(isNewRecord);
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
