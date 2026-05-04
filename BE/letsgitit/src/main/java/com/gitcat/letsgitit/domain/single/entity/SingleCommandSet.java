package com.gitcat.letsgitit.domain.single.entity;

import java.util.UUID;

import jakarta.persistence.*;

import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "single_command_set", uniqueConstraints = {
	@UniqueConstraint(name = "uq_single_command_set", columnNames = {"set_number", "difficulty"})
})
public class SingleCommandSet {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "single_command_set_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "set_number", nullable = false)
	private int setNumber;

	@Enumerated(EnumType.STRING)
	@Column(name = "difficulty", nullable = false, length = 20)
	private Difficulty difficulty;

	public static SingleCommandSet of(int setNumber, Difficulty difficulty) {
		SingleCommandSet set = new SingleCommandSet();
		set.setNumber = setNumber;
		set.difficulty = difficulty;
		return set;
	}
}
