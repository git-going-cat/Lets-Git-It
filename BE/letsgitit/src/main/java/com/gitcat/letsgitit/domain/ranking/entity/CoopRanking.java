package com.gitcat.letsgitit.domain.ranking.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// map_name / map_difficulty → 랭킹 기록 시점 스냅샷 (문자열)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "coop_ranking", uniqueConstraints = {
	@UniqueConstraint(name = "uq_coop_ranking", columnNames = {"coop_result_id"})
}, indexes = {
	@Index(name = "idx_coop_ranking_map_difficulty_week", columnList = "map_difficulty, week"),
	@Index(name = "idx_coop_ranking_map_name_week", columnList = "map_name, week")
})
public class CoopRanking {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "coop_ranking_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "coop_result_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID coopResultId;

	@Column(name = "map_name", nullable = false, length = 100)
	private String mapName;

	@Column(name = "map_difficulty", nullable = false, length = 20)
	private String mapDifficulty;

	@Column(name = "`rank`", nullable = false)
	private int rank;

	@Column(name = "clear_time", nullable = false)
	private int clearTime;

	@Column(name = "week", nullable = false, length = 10)
	private String week;

	@Column(name = "recorded_at", nullable = false)
	private LocalDateTime recordedAt;

	public static CoopRanking of(UUID coopResultId, String mapName, String mapDifficulty,
		int rank, int clearTime, String week) {
		CoopRanking ranking = new CoopRanking();
		ranking.coopResultId = coopResultId;
		ranking.mapName = mapName;
		ranking.mapDifficulty = mapDifficulty;
		ranking.rank = rank;
		ranking.clearTime = clearTime;
		ranking.week = week;
		ranking.recordedAt = LocalDateTime.now();
		return ranking;
	}
}
