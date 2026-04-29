package com.gitcat.letsgitit.domain.dictionary.entity;

import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// DictionaryCommand 와 양방향 — DictionaryCommand 주석 참조
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "dictionary_command_option", uniqueConstraints = {
	@UniqueConstraint(name = "uq_dictionary_command_option", columnNames = {"dictionary_command_id", "option"})
})
public class DictionaryCommandOption {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "dictionary_command_option_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "dictionary_command_id", nullable = false, foreignKey = @ForeignKey(name = "fk_dictionary_command_option"))
	private DictionaryCommand dictionaryCommand;

	@Column(name = "`option`", nullable = false, length = 100)
	private String option;

	@Column(name = "description", length = 500)
	private String description;

	public static DictionaryCommandOption of(DictionaryCommand dictionaryCommand,
		String option, String description) {
		DictionaryCommandOption opt = new DictionaryCommandOption();
		opt.dictionaryCommand = dictionaryCommand;
		opt.option = option;
		opt.description = description;
		return opt;
	}
}
