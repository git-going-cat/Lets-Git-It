package com.gitcat.letsgitit.domain.competitive.entity;

import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "contribution_result_member", uniqueConstraints = {
	@UniqueConstraint(name = "uq_contribution_result_member", columnNames = {"contribution_result_id", "member_id"})
}, indexes = {
	@Index(name = "idx_contribution_result_member_member", columnList = "member_id")
})
public class ContributionResultMember {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "contribution_result_member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "contribution_result_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID contributionResultId;

	@Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID memberId;

	@Column(name = "contribution", nullable = false)
	private int contribution;

	public static ContributionResultMember of(UUID contributionResultId, UUID memberId, int contribution) {
		ContributionResultMember item = new ContributionResultMember();
		item.contributionResultId = contributionResultId;
		item.memberId = memberId;
		item.contribution = contribution;
		return item;
	}
}
