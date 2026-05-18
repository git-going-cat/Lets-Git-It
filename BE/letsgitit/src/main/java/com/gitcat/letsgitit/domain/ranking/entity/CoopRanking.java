package com.gitcat.letsgitit.domain.ranking.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;

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
	@Index(name = "idx_coop_ranking_difficulty_week_rank", columnList = "difficulty, week, `rank`"),
	@Index(name = "idx_coop_ranking_map_name_week_rank", columnList = "map_name, week, `rank`")
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

	@Column(name = "difficulty", nullable = false)
	private int difficulty;

	@Column(name = "team_name", nullable = false, length = 100)
	private String teamName;

	@Column(name = "`rank`", nullable = false)
	private int rank;

	@Column(name = "elapsed_time", nullable = false)
	private int elapsedTime;

	@Column(name = "total_wrong_type_count", nullable = false)
	private int totalWrongTypeCount;

	@Column(name = "total_wrong_order_count", nullable = false)
	private int totalWrongOrderCount;

	@Column(name = "week", nullable = false, length = 10)
	private String week;

	@CreationTimestamp
	@Column(name = "recorded_at", nullable = false, updatable = false)
	private LocalDateTime recordedAt;

	public static CoopRanking of(UUID coopResultId, String mapName, int difficulty,
		String teamName, int rank, int elapsedTime, int totalWrongTypeCount, int totalWrongOrderCount, String week) {
		CoopRanking ranking = new CoopRanking();
		ranking.coopResultId = coopResultId;
		ranking.mapName = mapName;
		ranking.difficulty = difficulty;
		ranking.teamName = teamName;
		ranking.rank = rank;
		ranking.elapsedTime = elapsedTime;
		ranking.totalWrongTypeCount = totalWrongTypeCount;
		ranking.totalWrongOrderCount = totalWrongOrderCount;
		ranking.week = week;
		return ranking;
	}
}
