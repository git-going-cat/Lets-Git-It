package com.gitcat.letsgitit.domain.single.repository;

import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.single.entity.SingleResult;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleResultRepository {

	Optional<SingleResult> findTopByMemberIdAndDifficultyOrderByScoreDesc(
		UUID memberId,
		Difficulty difficulty);
}
