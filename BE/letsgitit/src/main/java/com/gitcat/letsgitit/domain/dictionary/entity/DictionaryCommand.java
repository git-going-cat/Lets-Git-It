package com.gitcat.letsgitit.domain.dictionary.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// [양방향 설정 이유]
// GET /api/v1/dictionary/commands 응답은 명령어와 옵션을 항상 함께 반환한다.
// @OneToMany 양방향 + JOIN FETCH 로 단일 쿼리 조회가 가능해 N+1 문제를 방지한다.
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "dictionary_command")
public class DictionaryCommand {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "dictionary_command_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "name", nullable = false, length = 100)
	private String name;

	@Column(name = "description", columnDefinition = "TEXT")
	private String description;

	@Column(name = "tip", length = 500)
	private String tip;

	@Column(name = "example", length = 500)
	private String example;

	@Column(name = "is_in_game", nullable = false)
	private boolean isInGame = true;

	@OneToMany(mappedBy = "dictionaryCommand", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	private List<DictionaryCommandOption> options = new ArrayList<>();

	public static DictionaryCommand of(String name, String description,
		String tip, String example, boolean isInGame) {
		DictionaryCommand command = new DictionaryCommand();
		command.name = name;
		command.description = description;
		command.tip = tip;
		command.example = example;
		command.isInGame = isInGame;
		return command;
	}
}
