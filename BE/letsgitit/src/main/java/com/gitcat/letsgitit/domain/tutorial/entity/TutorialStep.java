package com.gitcat.letsgitit.domain.tutorial.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "tutorial_step",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_tutorial_step_order", columnNames = {"step_order"})
    }
)
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

    @OrderBy("sequence ASC")
    @OneToMany(mappedBy = "tutorialStep",
        cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<TutorialStepItem> items = new ArrayList<>();

    public static TutorialStep of(int stepOrder, String title, String description) {
        TutorialStep step = new TutorialStep();
        step.stepOrder    = stepOrder;
        step.title        = title;
        step.description  = description;
        return step;
    }
}
