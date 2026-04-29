package com.gitcat.letsgitit.domain.single.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "single_result", uniqueConstraints = {
	@UniqueConstraint(name = "uq_single_result_session", columnNames = {"session_id"})
}, indexes = {
	@Index(name = "idx_single_result_member", columnList = "member_id")
})
public class SingleResult {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "single_result_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "session_id", nullable = false, length = 100)
	private String sessionId;

	@Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID memberId;

	@Enumerated(EnumType.STRING)
	@Column(name = "difficulty", nullable = false, length = 20)
	private Difficulty difficulty;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 10)
	private SingleResultStatus status;

	@Column(name = "score", nullable = false)
	private int score = 0;

	@Enumerated(EnumType.STRING)
	@Column(name = "grade", nullable = false, length = 1)
	private Grade grade;

	@Column(name = "play_time")
	private Integer playTime;

	@Column(name = "played_at", nullable = false)
	private LocalDateTime playedAt;

	public static SingleResult of(String sessionId, UUID memberId, Difficulty difficulty,
		SingleResultStatus status, int score, Grade grade,
		Integer playTime) {
		SingleResult result = new SingleResult();
		result.sessionId = sessionId;
		result.memberId = memberId;
		result.difficulty = difficulty;
		result.status = status;
		result.score = score;
		result.grade = grade;
		result.playTime = playTime;
		result.playedAt = LocalDateTime.now();
		return result;
	}
}
