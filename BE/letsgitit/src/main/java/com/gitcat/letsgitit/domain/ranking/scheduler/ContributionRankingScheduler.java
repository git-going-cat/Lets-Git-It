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
import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.domain.ranking.repository.CompetitiveRankingRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class ContributionRankingScheduler {

	private static final int CHUNK_SIZE = 500;

	private final ContributionRankingRedisRepository contributionRankingRedisRepository;
	private final CompetitiveRankingRepository competitiveRankingRepository;

	@Transactional
	@Scheduled(cron = "0 0 0 * * MON", zone = "Asia/Seoul")
	public void settleContributionRanking() {
		String week = WeekUtil.getWeek(LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1));
		log.info("[ranking][contribution][settle] started. week={}", week);

		String scoreKey = RankingKeyUtil.contributionKey(week);
		String contributionKey = RankingKeyUtil.contributionContributionKey(week);
		String playCountKey = RankingKeyUtil.contributionPlayCountKey(week);
		String registeredAtKey = RankingKeyUtil.contributionRegisteredAtKey(week);

		long total = contributionRankingRedisRepository.getTotalCount(scoreKey);
		log.info("[ranking][contribution][settle] week={}, total={}", week, total);

		if (total == 0) {
			log.info("[ranking][contribution][settle] no data to settle. week={}", week);
			return;
		}

		if (competitiveRankingRepository.countByModeAndWeek(CompetitiveMode.CONTRIBUTION, week) > 0) {
			log.warn("[ranking][contribution][settle] already settled. week={}, redisTotal={}", week, total);
			deleteKeysAfterCommit(scoreKey, contributionKey, playCountKey, registeredAtKey);
			return;
		}

		long offset = 0;
		while (offset < total) {
			long end = Math.min(offset + CHUNK_SIZE - 1, total - 1);
			List<RankEntry> chunk = contributionRankingRedisRepository.getRangeByRank(scoreKey, offset, end);

			if (chunk.isEmpty()) {
				log.warn("[ranking][contribution][settle] empty chunk. week={}, offset={}, end={}, total={}",
					week, offset, end, total);
				break;
			}

			List<UUID> memberIds = new ArrayList<>(chunk.size());
			for (RankEntry entry : chunk) {
				memberIds.add(UUID.fromString(entry.memberId()));
			}

			Map<UUID, Integer> contributionMap = contributionRankingRedisRepository.getContributions(
				contributionKey, memberIds);
			Map<UUID, Integer> playCountMap = contributionRankingRedisRepository.getPlayCounts(
				playCountKey, memberIds);

			List<CompetitiveRanking> rankings = new ArrayList<>(chunk.size());
			for (int i = 0; i < chunk.size(); i++) {
				UUID memberId = memberIds.get(i);
				int rank = (int)offset + i + 1;
				int contribution = contributionMap.getOrDefault(memberId, 0);
				int playCount = playCountMap.getOrDefault(memberId, 0);

				rankings.add(CompetitiveRanking.of(
					memberId, CompetitiveMode.CONTRIBUTION, contribution, playCount, rank, week));
			}

			competitiveRankingRepository.saveAll(rankings);
			log.info("[ranking][contribution][settle] chunk saved. week={}, offset={}, end={}, savedCount={}",
				week, offset, end, rankings.size());
			offset += chunk.size();
		}

		deleteKeysAfterCommit(scoreKey, contributionKey, playCountKey, registeredAtKey);
		log.info("[ranking][contribution][settle] finished. week={}", week);
	}

	/**
	 * 테스트용 수동 정산 (Dev API에서 호출)
	 */
	@Transactional
	public void settleContributionRankingManual(String week) {
		log.info("[ranking][contribution][settle][manual] started. week={}", week);

		String scoreKey = RankingKeyUtil.contributionKey(week);
		String contributionKey = RankingKeyUtil.contributionContributionKey(week);
		String playCountKey = RankingKeyUtil.contributionPlayCountKey(week);
		String registeredAtKey = RankingKeyUtil.contributionRegisteredAtKey(week);

		long total = contributionRankingRedisRepository.getTotalCount(scoreKey);
		log.info("[ranking][contribution][settle][manual] week={}, total={}", week, total);

		if (total == 0) {
			log.info("[ranking][contribution][settle][manual] no data to settle. week={}", week);
			return;
		}

		if (competitiveRankingRepository.countByModeAndWeek(CompetitiveMode.CONTRIBUTION, week) > 0) {
			log.warn("[ranking][contribution][settle][manual] already settled. week={}, redisTotal={}", week, total);
			deleteKeysAfterCommit(scoreKey, contributionKey, playCountKey, registeredAtKey);
			return;
		}

		long offset = 0;
		while (offset < total) {
			long end = Math.min(offset + CHUNK_SIZE - 1, total - 1);
			List<RankEntry> chunk = contributionRankingRedisRepository.getRangeByRank(scoreKey, offset, end);

			if (chunk.isEmpty()) {
				break;
			}

			List<UUID> memberIds = new ArrayList<>(chunk.size());
			for (RankEntry entry : chunk) {
				memberIds.add(UUID.fromString(entry.memberId()));
			}

			Map<UUID, Integer> contributionMap = contributionRankingRedisRepository.getContributions(
				contributionKey, memberIds);
			Map<UUID, Integer> playCountMap = contributionRankingRedisRepository.getPlayCounts(
				playCountKey, memberIds);

			List<CompetitiveRanking> rankings = new ArrayList<>(chunk.size());
			for (int i = 0; i < chunk.size(); i++) {
				UUID memberId = memberIds.get(i);
				int rank = (int)offset + i + 1;
				int contribution = contributionMap.getOrDefault(memberId, 0);
				int playCount = playCountMap.getOrDefault(memberId, 0);

				rankings.add(CompetitiveRanking.of(
					memberId, CompetitiveMode.CONTRIBUTION, contribution, playCount, rank, week));
			}

			competitiveRankingRepository.saveAll(rankings);
			log.info("[ranking][contribution][settle][manual] chunk saved. week={}, offset={}, end={}, savedCount={}",
				week, offset, end, rankings.size());
			offset += chunk.size();
		}

		deleteKeysAfterCommit(scoreKey, contributionKey, playCountKey, registeredAtKey);
		log.info("[ranking][contribution][settle][manual] finished. week={}", week);
	}

	private void deleteKeysAfterCommit(String... keys) {
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				log.info("[ranking][contribution][settle] committed. deleting Redis keys. keyCount={}", keys.length);
				try {
					contributionRankingRedisRepository.deleteKeys(keys);
				} catch (Exception e) {
					log.error("[ranking][contribution][settle] Redis keys delete failed.", e);
				}
			}
		});
	}
}
