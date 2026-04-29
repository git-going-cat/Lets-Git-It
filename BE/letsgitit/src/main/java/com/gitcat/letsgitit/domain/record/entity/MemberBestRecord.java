package com.gitcat.letsgitit.domain.record.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.UpdateTimestamp;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "member_best_record", uniqueConstraints = {
	@UniqueConstraint(name = "uq_member_best_record", columnNames = {"member_id", "mode"})
})
public class MemberBestRecord {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "member_best_record_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID memberId;

	@Enumerated(EnumType.STRING)
	@Column(name = "mode", nullable = false, length = 50)
	private BestRecordMode mode;

	@Column(name = "best_score", nullable = false)
	private int bestScore = 0;

	@Column(name = "best_rank", nullable = false)
	private int bestRank;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	public static MemberBestRecord of(UUID memberId, BestRecordMode mode,
		int bestScore, int bestRank) {
		MemberBestRecord record = new MemberBestRecord();
		record.memberId = memberId;
		record.mode = mode;
		record.bestScore = bestScore;
		record.bestRank = bestRank;
		return record;
	}

	public void update(int bestScore, int bestRank) {
		this.bestScore = bestScore;
		this.bestRank = bestRank;
	}
}
