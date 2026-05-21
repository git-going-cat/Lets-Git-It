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
@Table(name = "tutorial_step_item", uniqueConstraints = {
	@UniqueConstraint(name = "uq_tutorial_step_item", columnNames = {"tutorial_step_id", "sequence"})
})
public class TutorialStepItem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "tutorial_step_item_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "tutorial_step_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID tutorialStepId;

	@Column(name = "sequence", nullable = false)
	private int sequence;

	@Column(name = "content", nullable = false, length = 255)
	private String content;

	@Column(name = "explanation", length = 500)
	private String explanation;

	public static TutorialStepItem of(UUID tutorialStepId, int sequence, String content,
		String explanation) {
		TutorialStepItem item = new TutorialStepItem();
		item.tutorialStepId = tutorialStepId;
		item.sequence = sequence;
		item.content = content;
		item.explanation = explanation;
		return item;
	}
}
