package com.gitcat.letsgitit.domain.command.entity;

import com.gitcat.letsgitit.global.enums.CompetitiveMode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "competitive_command_set",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_competitive_command_set",
            columnNames = {"set_number", "mode"})
    }
)
public class CompetitiveCommandSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "competitive_command_set_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "set_number", nullable = false)
    private int setNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 50)
    private CompetitiveMode mode;

    public static CompetitiveCommandSet of(int setNumber, CompetitiveMode mode) {
        CompetitiveCommandSet set   = new CompetitiveCommandSet();
        set.setNumber               = setNumber;
        set.mode                    = mode;
        return set;
    }
}
