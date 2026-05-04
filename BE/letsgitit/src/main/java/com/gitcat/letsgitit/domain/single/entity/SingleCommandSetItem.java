package com.gitcat.letsgitit.domain.single.entity;

import java.util.UUID;

import jakarta.persistence.*;

import com.gitcat.letsgitit.domain.single.entity.enums.CommandType;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "single_command_set_item", uniqueConstraints = {
	@UniqueConstraint(name = "uq_single_command_set_item", columnNames = {"single_command_set_id", "sequence"})
})
public class SingleCommandSetItem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "single_command_set_item_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "single_command_set_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID singleCommandSetId;

	@Column(name = "sequence", nullable = false)
	private int sequence;

	@Column(name = "command_text", nullable = false, length = 255)
	private String commandText;

	@Column(name = "branch_name", length = 100)
	private String branchName;

	@Enumerated(EnumType.STRING)
	@Column(name = "command_type", nullable = false, length = 10)
	private CommandType commandType = CommandType.COMMON;

	public static SingleCommandSetItem of(UUID singleCommandSetId, int sequence,
		String commandText, String branchName, CommandType commandType) {
		SingleCommandSetItem item = new SingleCommandSetItem();
		item.singleCommandSetId = singleCommandSetId;
		item.sequence = sequence;
		item.commandText = commandText;
		item.branchName = branchName;
		item.commandType = commandType;
		return item;
	}
}
