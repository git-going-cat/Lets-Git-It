package com.gitcat.letsgitit.global.metrics;

import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.global.enums.Difficulty;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class RankingMetrics {

	private final MeterRegistry registry;

	public Timer.Sample start() {
		return Timer.start(registry);
	}

	// API 전체 응답 시간 (type: initial | scroll | history | history_scroll)
	public void recordGetSingleRanking(Timer.Sample sample, Difficulty difficulty, String type) {
		sample.stop(registry.timer("ranking.single.get",
			"difficulty", difficulty.name(),
			"type", type));
	}

	// 유저 행동 지표: 랭킹 조회 수 (type: realtime | history)
	public void incrementRankingViewed(Difficulty difficulty, String type) {
		registry.counter("ranking.single.viewed",
			"difficulty", difficulty.name(),
			"type", type).increment();
	}

	// 유저 행동 지표: 스크롤 조회 수
	public void incrementRankingScrolled(Difficulty difficulty, String type) {
		registry.counter("ranking.single.scrolled",
			"difficulty", difficulty.name(),
			"type", type).increment();
	}

	// Redis 조회 지연 (operation: top3 | my_rank | around)
	public void recordRedis(Timer.Sample sample, Difficulty difficulty, String operation) {
		sample.stop(registry.timer("ranking.single.redis",
			"difficulty", difficulty.name(),
			"operation", operation));
	}

	// DB 조회 지연 (operation: top3 | around | count)
	public void recordDb(Timer.Sample sample, Difficulty difficulty, String operation) {
		sample.stop(registry.timer("ranking.single.db",
			"difficulty", difficulty.name(),
			"operation", operation));
	}
}
