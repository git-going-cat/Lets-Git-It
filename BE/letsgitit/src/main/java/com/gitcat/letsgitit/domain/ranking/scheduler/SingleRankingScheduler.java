package com.gitcat.letsgitit.domain.ranking.scheduler;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
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
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;

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
			long total = singleRankingRedisRepository.getTotalCount(key);

			if (total == 0) {
				continue;
			}

			if (singleRankingRepository.countByDifficultyAndWeek(diff, week) > 0) {
				// DB에 이미 정산됐지만 Redis 키가 남아 있는 경우 — afterCommit()에서 정리
				keysToDelete.add(key);
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

				List<SingleRanking> rankings = new ArrayList<>(chunk.size());
				for (int i = 0; i < chunk.size(); i++) {
					SingleRankingRedisRepository.RankEntry entry = chunk.get(i);
					UUID memberId = UUID.fromString(entry.memberId());
					int rank = (int)offset + i + 1;
					int score = (int)Math.round(entry.score());

					rankings.add(SingleRanking.of(memberId, diff, score, rank, week));
				}

				singleRankingRepository.saveAll(rankings);
				offset += chunk.size();
			}

			keysToDelete.add(key);
		}

		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				keysToDelete.forEach(singleRankingRedisRepository::deleteKey);
			}
		});
	}

}
