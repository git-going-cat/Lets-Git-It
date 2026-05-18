package com.gitcat.letsgitit.domain.coop.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// map_name / difficulty 는 플레이 시점 스냅샷 (coop_map FK 없음)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "coop_result", uniqueConstraints = {
	@UniqueConstraint(name = "uq_coop_result_session", columnNames = {"session_id"})
})
public class CoopResult {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "coop_result_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "room_id", nullable = false)
	private Long roomId;

	@Column(name = "session_id", nullable = false, length = 100)
	private String sessionId;

	@Column(name = "map_name", nullable = false, length = 100)
	private String mapName;

	@Column(name = "difficulty", nullable = false)
	private int difficulty;

	@Column(name = "team_name", nullable = false, length = 100)
	private String teamName;

	@Column(name = "elapsed_time", nullable = false)
	private int elapsedTime;

	@Column(name = "total_wrong_type_count", nullable = false)
	private int totalWrongTypeCount;

	@Column(name = "total_wrong_order_count", nullable = false)
	private int totalWrongOrderCount;

	@Column(name = "played_at", nullable = false)
	private LocalDateTime playedAt;

	public static CoopResult of(Long roomId, String sessionId, String mapName,
		int difficulty, String teamName, int elapsedTime, int totalWrongTypeCount, int totalWrongOrderCount) {
		CoopResult result = new CoopResult();
		result.roomId = roomId;
		result.sessionId = sessionId;
		result.mapName = mapName;
		result.difficulty = difficulty;
		result.teamName = teamName;
		result.elapsedTime = elapsedTime;
		result.totalWrongTypeCount = totalWrongTypeCount;
		result.totalWrongOrderCount = totalWrongOrderCount;
		result.playedAt = LocalDateTime.now();
		return result;
	}
}
