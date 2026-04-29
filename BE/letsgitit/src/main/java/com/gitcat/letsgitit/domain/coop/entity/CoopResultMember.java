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
    name = "coop_result_member",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_coop_result_member",
            columnNames = {"coop_result_id", "member_id"})
    },
    indexes = {
        @Index(name = "idx_coop_result_member_member", columnList = "member_id")
    }
)
public class CoopResultMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "coop_result_member_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "coop_result_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID coopResultId;

    @Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID memberId;

    public static CoopResultMember of(UUID coopResultId, UUID memberId) {
        CoopResultMember item   = new CoopResultMember();
        item.coopResultId       = coopResultId;
        item.memberId           = memberId;
        return item;
    }
}
