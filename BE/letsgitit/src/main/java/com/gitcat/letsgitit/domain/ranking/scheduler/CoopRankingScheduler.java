package com.gitcat.letsgitit.domain.ranking.scheduler;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRepository;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class CoopRankingScheduler {

	private static final int CHUNK_SIZE = 500;
	private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");

	private final CoopRankingRedisRepository coopRankingRedisRepository;
	private final CoopRankingRepository coopRankingRepository;

	@Transactional
	@Scheduled(cron = "0 0 0 * * MON", zone = "Asia/Seoul")
	public void settleCoopRanking() {
		String week = WeekUtil.getWeek(LocalDate.now(KOREA_ZONE_ID).minusDays(1));
		doSettle(week, false);
	}

	@Transactional
	public void settleCoopRankingManual(String week) {
		doSettle(week, true);
	}

	private void doSettle(String week, boolean manual) {
		String logPrefix = manual ? "[ranking][coop][settle][manual]" : "[ranking][coop][settle]";
		log.info("{} started. week={}", logPrefix, week);

		String rankingKey = RankingKeyUtil.coopRankingKey(week);
		String dataKey = RankingKeyUtil.coopRankingDataKey(week);
		String lookupKey = RankingKeyUtil.coopRankingLookupKey(week);
		String memberKeysKey = RankingKeyUtil.coopRankingMemberKeysKey(week);

		long total = coopRankingRedisRepository.getTotalCount(week);
		log.info("{} week={}, total={}", logPrefix, week, total);

		if (total == 0) {
			log.info("{} no data to settle. week={}", logPrefix, week);
			return;
		}

		Set<String> memberKeys = coopRankingRedisRepository.getAllMemberKeys(week);
		List<String> keysToDelete = buildDeleteKeys(week, rankingKey, dataKey, lookupKey, memberKeysKey, memberKeys);

		if (coopRankingRepository.countByWeek(week) > 0) {
			log.warn("{} already settled. week={}, redisTotal={}", logPrefix, week, total);
			deleteKeysAfterCommit(keysToDelete);
			return;
		}

		long offset = 0;
		while (offset < total) {
			long end = Math.min(offset + CHUNK_SIZE - 1, total - 1);
			List<String> lexStrings = coopRankingRedisRepository.getRangeByRank(week, offset, end);

			if (lexStrings.isEmpty()) {
				log.warn("{} empty chunk. week={}, offset={}, end={}, total={}",
					logPrefix, week, offset, end, total);
				break;
			}

			// 개별 HGET 대신 HMGET 1회로 청크 전체 조회
			List<String> coopResultIds = lexStrings.stream()
				.map(RankingKeyUtil::parseCoopResultIdFromLexString)
				.toList();
			List<CoopRankingData> dataList = coopRankingRedisRepository.getDataBatch(week, coopResultIds);

			List<CoopRanking> rankings = new ArrayList<>(lexStrings.size());
			for (int i = 0; i < coopResultIds.size(); i++) {
				CoopRankingData data = i < dataList.size() ? dataList.get(i) : null;
				if (data == null) {
					// register() 부분 실패로 Hash 데이터가 없는 orphan 항목 — 해당 항목만 건너뜀
					log.warn("{} data missing, skipping. week={}, coopResultId={}", logPrefix, week,
						coopResultIds.get(i));
					continue;
				}

				rankings.add(CoopRanking.of(
					UUID.fromString(data.coopResultId()),
					data.mapName(),
					data.difficulty(),
					data.teamName(),
					(int)(offset + i + 1),
					data.elapsedTime(),
					data.totalWrongTypeCount(),
					data.totalWrongOrderCount(),
					week));
			}

			coopRankingRepository.saveAll(rankings);
			log.info("{} chunk saved. week={}, offset={}, end={}, savedCount={}",
				logPrefix, week, offset, end, rankings.size());
			offset += lexStrings.size();
		}

		deleteKeysAfterCommit(keysToDelete);
		log.info("{} finished. week={}, deleteKeyCount={}", logPrefix, week, keysToDelete.size());
	}

	private List<String> buildDeleteKeys(String week, String rankingKey, String dataKey,
		String lookupKey, String memberKeysKey, Set<String> memberKeys) {
		List<String> keysToDelete = new ArrayList<>(memberKeys.size() + 4);
		keysToDelete.add(rankingKey);
		keysToDelete.add(dataKey);
		keysToDelete.add(lookupKey);
		keysToDelete.add(memberKeysKey);
		for (String memberId : memberKeys) {
			keysToDelete.add(RankingKeyUtil.coopRankingMembersKey(week, memberId));
		}
		return keysToDelete;
	}

	private void deleteKeysAfterCommit(List<String> keys) {
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				log.info("[ranking][coop][settle] committed. deleting Redis keys. keyCount={}", keys.size());
				try {
					coopRankingRedisRepository.deleteKeys(keys.toArray(String[]::new));
				} catch (Exception e) {
					log.error("[ranking][coop][settle] Redis keys delete failed.", e);
				}
			}
		});
	}
}
