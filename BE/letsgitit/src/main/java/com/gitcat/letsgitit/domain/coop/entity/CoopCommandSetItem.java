package com.gitcat.letsgitit.domain.coop.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "coop_command_set_item",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_coop_command_set_item",
            columnNames = {"coop_command_set_id", "round", "sequence"})
    }
)
public class CoopCommandSetItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "coop_command_set_item_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "coop_command_set_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID coopCommandSetId;

    @Column(name = "round", nullable = false)
    private int round;

    @Column(name = "sequence", nullable = false)
    private int sequence;

    @Column(name = "command_text", nullable = false, length = 255)
    private String commandText;

    public static CoopCommandSetItem of(UUID coopCommandSetId, int round,
                                         int sequence, String commandText) {
        CoopCommandSetItem item   = new CoopCommandSetItem();
        item.coopCommandSetId     = coopCommandSetId;
        item.round                = round;
        item.sequence             = sequence;
        item.commandText          = commandText;
        return item;
    }
}
