package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;

public interface CoopRankingJpaRepository extends JpaRepository<CoopRanking, UUID> {

	long countByWeek(String week);
}
