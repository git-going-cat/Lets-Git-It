package com.gitcat.letsgitit.domain.command.entity;

import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// branch_name / display_text : CONTRIBUTION_RUN 전용 (TIME_ATTACK 은 NULL)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "competitive_command_set_item", uniqueConstraints = {
	@UniqueConstraint(name = "uq_competitive_command_set_item", columnNames = {"competitive_command_set_id",
		"sequence"})
})
public class CompetitiveCommandSetItem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "competitive_command_set_item_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "competitive_command_set_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID competitiveCommandSetId;

	@Column(name = "sequence", nullable = false)
	private int sequence;

	@Column(name = "command_text", nullable = false, length = 255)
	private String commandText;

	@Column(name = "branch_name", length = 100)
	private String branchName;

	@Column(name = "display_text", length = 255)
	private String displayText;

	public static CompetitiveCommandSetItem of(UUID competitiveCommandSetId, int sequence,
		String commandText, String branchName,
		String displayText) {
		CompetitiveCommandSetItem item = new CompetitiveCommandSetItem();
		item.competitiveCommandSetId = competitiveCommandSetId;
		item.sequence = sequence;
		item.commandText = commandText;
		item.branchName = branchName;
		item.displayText = displayText;
		return item;
	}
}
