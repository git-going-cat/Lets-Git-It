package com.gitcat.letsgitit.domain.coop.entity;

import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "coop_command_set_item", uniqueConstraints = {
	@UniqueConstraint(name = "uq_coop_command_set_item", columnNames = {"coop_map_id", "round", "sequence"})
})
public class CoopCommandSetItem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "coop_command_set_item_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "coop_map_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID coopMapId;

	@Column(name = "round", nullable = false)
	private int round;

	@Column(name = "sequence", nullable = false)
	private int sequence;

	@Column(name = "command_text", nullable = false, length = 255)
	private String commandText;

	public static CoopCommandSetItem of(UUID coopMapId, int round,
		int sequence, String commandText) {
		CoopCommandSetItem item = new CoopCommandSetItem();
		item.coopMapId = coopMapId;
		item.round = round;
		item.sequence = sequence;
		item.commandText = commandText;
		return item;
	}
}
