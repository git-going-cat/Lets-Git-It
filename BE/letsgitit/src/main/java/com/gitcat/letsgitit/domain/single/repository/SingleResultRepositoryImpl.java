package com.gitcat.letsgitit.domain.single.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.single.entity.SingleResult;
import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SingleResultRepositoryImpl implements SingleResultRepository {

	private final SingleResultJpaRepository singleResultJpaRepository;

	@Override
	public Optional<SingleResult> findTopByMemberIdAndDifficultyOrderByScoreDesc(UUID memberId, Difficulty difficulty) {
		return singleResultJpaRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(memberId, difficulty);
	}

	@Override
	public boolean existsBySessionId(String sessionId) {
		return singleResultJpaRepository.existsBySessionId(sessionId);
	}

	@Override
	public SingleResult save(SingleResult singleResult) {
		return singleResultJpaRepository.save(singleResult);
	}
}
