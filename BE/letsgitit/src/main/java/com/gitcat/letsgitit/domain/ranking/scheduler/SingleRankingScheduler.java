package com.gitcat.letsgitit.domain.ranking.scheduler;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRepository;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class SingleRankingScheduler {

	private static final int CHUNK_SIZE = 500;

	private final SingleRankingRedisRepository singleRankingRedisRepository;
	private final SingleRankingRepository singleRankingRepository;

	@Transactional
	@Scheduled(cron = "0 0 0 * * MON", zone = "Asia/Seoul")
	public void settleSingleRanking() {
		// 월요일 00:00 KST 실행 → 전날(일요일)이 이전 주의 마지막 날
		// LocalDate.now(KST)로 명시해 JVM 기본 TZ가 UTC여도 날짜가 어긋나지 않도록 보장
		String week = WeekUtil.getWeek(LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1));
		List<String> keysToDelete = new ArrayList<>();

		for (Difficulty diff : Difficulty.values()) {
			String key = RankingKeyUtil.singleKey(diff.name(), week);
			String gradeKey = RankingKeyUtil.singleGradeKey(diff.name(), week);
			String playTimeKey = RankingKeyUtil.singlePlayTimeKey(diff.name(), week);
			long total = singleRankingRedisRepository.getTotalCount(key);

			if (total == 0) {
				continue;
			}

			if (singleRankingRepository.countByDifficultyAndWeek(diff, week) > 0) {
				// DB에 이미 정산됐지만 Redis 키가 남아 있는 경우 — afterCommit()에서 정리
				keysToDelete.add(key);
				keysToDelete.add(gradeKey);
				keysToDelete.add(playTimeKey);
				continue;
			}

			long offset = 0;
			while (offset < total) {
				long end = Math.min(offset + CHUNK_SIZE - 1, total - 1);
				List<SingleRankingRedisRepository.RankEntry> chunk = singleRankingRedisRepository.getRangeByRank(key,
					offset, end);

				if (chunk.isEmpty()) {
					break;
				}

				List<UUID> memberIds = new ArrayList<>(chunk.size());
				for (SingleRankingRedisRepository.RankEntry entry : chunk) {
					memberIds.add(UUID.fromString(entry.memberId()));
				}
				Map<UUID, String> gradeMap = singleRankingRedisRepository.getGrades(gradeKey, memberIds);
				Map<UUID, Integer> playTimeMap = singleRankingRedisRepository.getPlayTimes(playTimeKey, memberIds);

				List<SingleRanking> rankings = new ArrayList<>(chunk.size());
				for (int i = 0; i < chunk.size(); i++) {
					SingleRankingRedisRepository.RankEntry entry = chunk.get(i);
					UUID memberId = memberIds.get(i);
					int rank = (int)offset + i + 1;
					int score = RankingKeyUtil.toPlainSingleScore(entry.score());
					Integer playTime = playTimeMap.get(memberId);
					String gradeStr = gradeMap.get(memberId);
					Grade grade = gradeStr != null ? Grade.valueOf(gradeStr) : null;

					rankings.add(SingleRanking.of(memberId, diff, score, rank, grade, playTime, week));
				}

				singleRankingRepository.saveAll(rankings);
				offset += chunk.size();
			}

			keysToDelete.add(key);
			keysToDelete.add(gradeKey);
			keysToDelete.add(playTimeKey);
		}

		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				keysToDelete.forEach(key -> {
					try {
						singleRankingRedisRepository.deleteKey(key);
					} catch (Exception e) {
						log.error("[ranking][settle] Redis key delete failed. key={}", key, e);
					}
				});
			}
		});
	}

}
