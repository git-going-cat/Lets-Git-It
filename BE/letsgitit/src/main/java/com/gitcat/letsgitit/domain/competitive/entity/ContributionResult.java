package com.gitcat.letsgitit.domain.competitive.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "contribution_result",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_contribution_result_session", columnNames = {"session_id"})
    }
)
public class ContributionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "contribution_result_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "room_id", nullable = false, length = 100)
    private String roomId;

    @Column(name = "session_id", nullable = false, length = 100)
    private String sessionId;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    public static ContributionResult of(String roomId, String sessionId) {
        ContributionResult result   = new ContributionResult();
        result.roomId               = roomId;
        result.sessionId            = sessionId;
        result.playedAt             = LocalDateTime.now();
        return result;
    }
}
