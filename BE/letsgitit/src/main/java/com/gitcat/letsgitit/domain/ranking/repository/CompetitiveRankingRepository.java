package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

public interface CompetitiveRankingRepository extends JpaRepository<CompetitiveRanking, UUID> {

	long countByModeAndWeek(CompetitiveMode mode, String week);
}
