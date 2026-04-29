package com.gitcat.letsgitit.domain.coop.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

// map_name / map_difficulty 는 플레이 시점 스냅샷 (coop_map FK 없음, String 저장)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "coop_result",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_coop_result_session", columnNames = {"session_id"})
    }
)
public class CoopResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "coop_result_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "room_id", nullable = false, length = 100)
    private String roomId;

    @Column(name = "session_id", nullable = false, length = 100)
    private String sessionId;

    @Column(name = "map_name", nullable = false, length = 100)
    private String mapName;

    @Column(name = "map_difficulty", nullable = false, length = 20)
    private String mapDifficulty;

    @Column(name = "team_name", nullable = false, length = 100)
    private String teamName;

    @Column(name = "clear_time", nullable = false)
    private int clearTime;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    public static CoopResult of(String roomId, String sessionId, String mapName,
                                 String mapDifficulty, String teamName, int clearTime) {
        CoopResult result    = new CoopResult();
        result.roomId        = roomId;
        result.sessionId     = sessionId;
        result.mapName       = mapName;
        result.mapDifficulty = mapDifficulty;
        result.teamName      = teamName;
        result.clearTime     = clearTime;
        result.playedAt      = LocalDateTime.now();
        return result;
    }
}
