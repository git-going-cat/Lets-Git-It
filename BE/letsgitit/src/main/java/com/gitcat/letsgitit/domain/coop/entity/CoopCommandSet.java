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
    name = "coop_command_set",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_coop_command_set",
            columnNames = {"coop_map_id", "set_number"})
    }
)
public class CoopCommandSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "coop_command_set_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "coop_map_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID coopMapId;

    @Column(name = "set_number", nullable = false)
    private int setNumber;

    public static CoopCommandSet of(UUID coopMapId, int setNumber) {
        CoopCommandSet set   = new CoopCommandSet();
        set.coopMapId        = coopMapId;
        set.setNumber        = setNumber;
        return set;
    }
}
