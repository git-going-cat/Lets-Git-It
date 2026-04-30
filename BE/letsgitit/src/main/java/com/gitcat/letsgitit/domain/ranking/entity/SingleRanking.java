package com.gitcat.letsgitit.domain.ranking.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import com.gitcat.letsgitit.domain.single.entity.Grade;
import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "single_ranking", uniqueConstraints = {
	@UniqueConstraint(name = "uq_single_ranking", columnNames = {"member_id", "difficulty", "week"})
}, indexes = {
	@Index(name = "idx_single_ranking_difficulty_week", columnList = "difficulty, week")
})
public class SingleRanking {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "single_ranking_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID memberId;

	@Enumerated(EnumType.STRING)
	@Column(name = "difficulty", nullable = false, length = 20)
	private Difficulty difficulty;

	@Column(name = "score", nullable = false)
	private int score = 0;

	@Enumerated(EnumType.STRING)
	@Column(name = "grade", nullable = false, length = 1)
	private Grade grade;

	@Column(name = "`rank`", nullable = false)
	private int rank;

	@Column(name = "week", nullable = false, length = 10)
	private String week;

	@Column(name = "recorded_at", nullable = false)
	private LocalDateTime recordedAt;

	public static SingleRanking of(UUID memberId, Difficulty difficulty,
		int score, Grade grade, int rank, String week) {
		SingleRanking ranking = new SingleRanking();
		ranking.memberId = memberId;
		ranking.difficulty = difficulty;
		ranking.score = score;
		ranking.grade = grade;
		ranking.rank = rank;
		ranking.week = week;
		ranking.recordedAt = LocalDateTime.now();
		return ranking;
	}
}
