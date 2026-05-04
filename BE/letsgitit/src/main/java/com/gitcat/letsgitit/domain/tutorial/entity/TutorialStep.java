package com.gitcat.letsgitit.domain.tutorial.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tutorial_step", uniqueConstraints = {
	@UniqueConstraint(name = "uq_tutorial_step_order", columnNames = {"step_order"})
})
public class TutorialStep {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "tutorial_step_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "step_order", nullable = false)
	private int stepOrder;

	@Column(name = "title", nullable = false, length = 100)
	private String title;

	@Column(name = "description", nullable = false, length = 500)
	private String description;

	public static TutorialStep of(int stepOrder, String title, String description) {
		TutorialStep step = new TutorialStep();
		step.stepOrder = stepOrder;
		step.title = title;
		step.description = description;
		return step;
	}
}
