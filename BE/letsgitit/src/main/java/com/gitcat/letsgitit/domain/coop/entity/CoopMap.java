package com.gitcat.letsgitit.domain.coop.entity;

import java.util.UUID;

import jakarta.persistence.*;

import com.gitcat.letsgitit.global.enums.MapDifficulty;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "coop_map", uniqueConstraints = {
	@UniqueConstraint(name = "uq_coop_map_name_difficulty", columnNames = {"name", "difficulty"})
})
public class CoopMap {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "coop_map_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "name", nullable = false, length = 100)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "difficulty", nullable = false, length = 20)
	private MapDifficulty difficulty;

	@Column(name = "is_active", nullable = false)
	private boolean isActive = true;

	public static CoopMap of(String name, MapDifficulty difficulty) {
		CoopMap map = new CoopMap();
		map.name = name;
		map.difficulty = difficulty;
		map.isActive = true;
		return map;
	}

	public void deactivate() {
		this.isActive = false;
	}
}
