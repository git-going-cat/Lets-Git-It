package com.gitcat.letsgitit.domain.record.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

// map_name / map_difficulty → 기록 시점 스냅샷 (coop_map FK 없음, String 저장)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
    name = "member_coop_best_record",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_member_coop_best_record",
            columnNames = {"member_id", "map_name", "map_difficulty"})
    }
)
public class MemberCoopBestRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "member_coop_best_record_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID memberId;

    @Column(name = "map_name", nullable = false, length = 100)
    private String mapName;

    @Column(name = "map_difficulty", nullable = false, length = 20)
    private String mapDifficulty;

    @Column(name = "best_time", nullable = false)
    private int bestTime;

    @Column(name = "best_rank", nullable = false)
    private int bestRank;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static MemberCoopBestRecord of(UUID memberId, String mapName,
                                           String mapDifficulty, int bestTime, int bestRank) {
        MemberCoopBestRecord record   = new MemberCoopBestRecord();
        record.memberId               = memberId;
        record.mapName                = mapName;
        record.mapDifficulty          = mapDifficulty;
        record.bestTime               = bestTime;
        record.bestRank               = bestRank;
        return record;
    }

    public void update(int bestTime, int bestRank) {
        this.bestTime = bestTime;
        this.bestRank = bestRank;
    }
}
