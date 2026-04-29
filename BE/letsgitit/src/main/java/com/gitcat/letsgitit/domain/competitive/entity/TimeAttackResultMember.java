package com.gitcat.letsgitit.domain.competitive.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "timeattack_result_member",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_timeattack_result_member",
            columnNames = {"timeattack_result_id", "member_id"})
    },
    indexes = {
        @Index(name = "idx_timeattack_result_member_member", columnList = "member_id")
    }
)
public class TimeAttackResultMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "timeattack_result_member_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "timeattack_result_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID timeAttackResultId;

    @Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID memberId;

    @Column(name = "total_count", nullable = false)
    private int totalCount;

    @Column(name = "is_winner", nullable = false)
    private boolean isWinner = false;

    public static TimeAttackResultMember of(UUID timeAttackResultId, UUID memberId,
                                             int totalCount, boolean isWinner) {
        TimeAttackResultMember item   = new TimeAttackResultMember();
        item.timeAttackResultId       = timeAttackResultId;
        item.memberId                 = memberId;
        item.totalCount               = totalCount;
        item.isWinner                 = isWinner;
        return item;
    }
}
