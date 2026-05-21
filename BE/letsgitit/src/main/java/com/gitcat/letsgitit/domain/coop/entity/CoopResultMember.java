package com.gitcat.letsgitit.domain.coop.entity;

import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "coop_result_member", uniqueConstraints = {
	@UniqueConstraint(name = "uq_coop_result_member", columnNames = {"coop_result_id", "member_id"})
}, indexes = {
	@Index(name = "idx_coop_result_member_member", columnList = "member_id")
})
public class CoopResultMember {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "coop_result_member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "coop_result_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID coopResultId;

	@Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID memberId;

	@Column(name = "wrong_type_count", nullable = false)
	private int wrongTypeCount;

	@Column(name = "wrong_order_count", nullable = false)
	private int wrongOrderCount;

	public static CoopResultMember of(UUID coopResultId, UUID memberId, int wrongTypeCount, int wrongOrderCount) {
		CoopResultMember item = new CoopResultMember();
		item.coopResultId = coopResultId;
		item.memberId = memberId;
		item.wrongTypeCount = wrongTypeCount;
		item.wrongOrderCount = wrongOrderCount;
		return item;
	}
}
