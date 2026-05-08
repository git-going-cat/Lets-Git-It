package com.gitcat.letsgitit.global.metrics;

import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.global.enums.Difficulty;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SingleMetrics {

	private final MeterRegistry registry;

	public Timer.Sample start() {
		return Timer.start(registry);
	}

	public void recordStartSession(Timer.Sample sample, Difficulty difficulty) {
		sample.stop(registry.timer("single.start_session", "difficulty", difficulty.name()));
	}

	public void recordStartSessionDb(Timer.Sample sample, Difficulty difficulty) {
		sample.stop(registry.timer("single.start_session.db", "difficulty", difficulty.name()));
	}

	public void recordStartSessionRedis(Timer.Sample sample, Difficulty difficulty) {
		sample.stop(registry.timer("single.start_session.redis", "difficulty", difficulty.name()));
	}

	public void recordSaveResult(Timer.Sample sample, String difficulty, boolean success) {
		sample.stop(registry.timer("single.save_result",
			"difficulty", difficulty != null ? difficulty : "unknown",
			"status", success ? "success" : "error"));
	}

	public void recordSaveResultRedisLookup(Timer.Sample sample) {
		sample.stop(registry.timer("single.save_result.redis_lookup"));
	}

	public void recordSaveResultDbSave(Timer.Sample sample) {
		sample.stop(registry.timer("single.save_result.db_save"));
	}

	public void recordSaveResultRankingUpdate(Timer.Sample sample) {
		sample.stop(registry.timer("single.save_result.ranking_update"));
	}

	public void incrementSaveResultError(String errorCode) {
		registry.counter("single.save_result.error", "error_code", errorCode).increment();
	}
}
