package com.gitcat.letsgitit.domain.tutorial.entity;

import com.gitcat.letsgitit.global.enums.TutorialItemType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "tutorial_step_item",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_tutorial_step_item",
            columnNames = {"tutorial_step_id", "sequence"})
    }
)
public class TutorialStepItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tutorial_step_item_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tutorial_step_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_tutorial_step_item_step"))
    private TutorialStep tutorialStep;

    @Column(name = "sequence", nullable = false)
    private int sequence;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    private TutorialItemType itemType;

    @Column(name = "content", nullable = false, length = 255)
    private String content;

    @Column(name = "explanation", length = 500)
    private String explanation;

    public static TutorialStepItem of(TutorialStep tutorialStep, int sequence,
                                       TutorialItemType itemType, String content,
                                       String explanation) {
        TutorialStepItem item = new TutorialStepItem();
        item.tutorialStep     = tutorialStep;
        item.sequence         = sequence;
        item.itemType         = itemType;
        item.content          = content;
        item.explanation      = explanation;
        return item;
    }
}
