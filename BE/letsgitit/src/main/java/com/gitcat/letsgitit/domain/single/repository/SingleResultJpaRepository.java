package com.gitcat.letsgitit.domain.single.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.single.entity.SingleResult;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleResultJpaRepository extends JpaRepository<SingleResult, UUID> {

	Optional<SingleResult> findTopByMemberIdAndDifficultyOrderByScoreDesc(
		UUID memberId,
		Difficulty difficulty);
}
