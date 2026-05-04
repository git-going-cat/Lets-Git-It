package com.gitcat.letsgitit.domain.single.service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.single.dto.SingleSessionCache;
import com.gitcat.letsgitit.domain.single.dto.request.SingleSessionStartRequest;
import com.gitcat.letsgitit.domain.single.dto.response.CommandSetDto;
import com.gitcat.letsgitit.domain.single.dto.response.SingleSessionStartResponse;
import com.gitcat.letsgitit.domain.single.entity.SingleCommandSet;
import com.gitcat.letsgitit.domain.single.entity.SingleResult;
import com.gitcat.letsgitit.domain.single.repository.SingleCommandSetRepository;
import com.gitcat.letsgitit.domain.single.repository.SingleResultRepository;
import com.gitcat.letsgitit.domain.single.repository.SingleSessionRedisRepository;
import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SingleServiceImpl implements SingleService {

	private final SingleResultRepository singleResultRepository;
	private final SingleCommandSetRepository singleCommandSetRepository;
	private final SingleSessionRedisRepository singleSessionRedisRepository;

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
