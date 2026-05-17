package com.gitcat.letsgitit.domain.ranking.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import com.gitcat.letsgitit.global.enums.CompetitiveMode;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "competitive_ranking", uniqueConstraints = {
	@UniqueConstraint(name = "uq_competitive_ranking", columnNames = {"member_id", "mode", "week"})
}, indexes = {
	@Index(name = "idx_competitive_ranking_mode_week", columnList = "mode, week")
})
public class CompetitiveRanking {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "competitive_ranking_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID memberId;

	@Enumerated(EnumType.STRING)
	@Column(name = "mode", nullable = false, length = 50)
	private CompetitiveMode mode;

	@Column(name = "score", nullable = false)
	private int score = 0;

	@Column(name = "play_count", nullable = false)
	private int playCount = 0;

	@Column(name = "`rank`", nullable = false)
	private int rank;

	@Column(name = "week", nullable = false, length = 10)
	private String week;

	@Column(name = "recorded_at", nullable = false)
	private LocalDateTime recordedAt;

	public static CompetitiveRanking of(UUID memberId, CompetitiveMode mode,
		int score, int playCount, int rank, String week) {
		CompetitiveRanking ranking = new CompetitiveRanking();
		ranking.memberId = memberId;
		ranking.mode = mode;
		ranking.score = score;
		ranking.playCount = playCount;
		ranking.rank = rank;
		ranking.week = week;
		ranking.recordedAt = LocalDateTime.now();
		return ranking;
	}
}
