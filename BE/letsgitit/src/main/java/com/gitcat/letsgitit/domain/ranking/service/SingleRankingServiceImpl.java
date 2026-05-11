package com.gitcat.letsgitit.domain.ranking.service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.response.RankingEntry;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRepository;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.metrics.RankingMetrics;
import com.gitcat.letsgitit.global.util.WeekUtil;

import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SingleRankingServiceImpl implements SingleRankingService {

	private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");

	private final SingleRankingRedisRepository singleRankingRedisRepository;
	private final SingleRankingRepository singleRankingRepository;
	private final MemberService memberService;
	private final RankingMetrics rankingMetrics;

	@Override
	@Transactional(readOnly = true)
	public SingleRankingInitialResponse getSingleRanking(Difficulty difficulty, int size, UUID memberId) {
		Timer.Sample apiSample = rankingMetrics.start();
		rankingMetrics.incrementRankingViewed(difficulty, "realtime");
		try {
			LocalDate now = LocalDate.now(KOREA_ZONE_ID);
			String week = WeekUtil.getWeek(now);

			String key = RankingKeyUtil.singleKey(difficulty.name(), week);
			String gradeKey = RankingKeyUtil.singleGradeKey(difficulty.name(), week);
			String playTimeKey = RankingKeyUtil.singlePlayTimeKey(difficulty.name(), week);
			long total = singleRankingRedisRepository.getTotalCount(key);

			Timer.Sample top3Sample = rankingMetrics.start();
			List<RankEntry> top3Raw = singleRankingRedisRepository.getTopEntries(key, 3);
			List<UUID> top3Ids = top3Raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
			Map<UUID, String> top3GradeMap = singleRankingRedisRepository.getGrades(gradeKey, top3Ids);
			Map<UUID, Integer> top3PlayTimeMap = singleRankingRedisRepository.getPlayTimes(playTimeKey, top3Ids);
			rankingMetrics.recordRedis(top3Sample, difficulty, "top3");
			Map<UUID, String> top3NicknameMap = memberService.getNicknamesByIds(top3Ids);
			List<RankingEntry> top3 = toEntries(top3Raw, 1, top3NicknameMap, top3GradeMap, top3PlayTimeMap);

			Timer.Sample myRankSample = rankingMetrics.start();
			Long myRankZeroBased = singleRankingRedisRepository.getRankZeroBased(key, memberId);
			Double myScore = singleRankingRedisRepository.getScore(key, memberId);
			rankingMetrics.recordRedis(myRankSample, difficulty, "my_rank");

			if (myRankZeroBased == null || myScore == null) {
				boolean hasNext = total > 3;
				return new SingleRankingInitialResponse(
					difficulty.name(),
					WeekUtil.getYear(now),
					WeekUtil.getMonth(now),
					WeekUtil.getWeekOfMonth(now),
					top3,
					null,
					List.of(),
					null, false,
					hasNext ? 3 : null,
					hasNext);
			}

			String nickname = memberService.getNicknameById(memberId);
			String myGradeStr = singleRankingRedisRepository.getGrade(gradeKey, memberId);
			Grade myGrade = myGradeStr != null ? Grade.valueOf(myGradeStr) : null;
			Integer myPlayTime = singleRankingRedisRepository.getPlayTime(playTimeKey, memberId);

			RankingEntry myRank = new RankingEntry(
				(int)(myRankZeroBased + 1),
				nickname,
				toPlainScore(myScore),
				myGrade,
				myPlayTime);

			long aroundStart = Math.max(0, myRankZeroBased - 2);
			long aroundEnd = Math.min(total - 1, myRankZeroBased + 2);

			Timer.Sample aroundSample = rankingMetrics.start();
			List<RankEntry> aroundRaw = singleRankingRedisRepository.getRangeByRank(key, aroundStart, aroundEnd);
			List<UUID> aroundIds = aroundRaw.stream().map(r -> UUID.fromString(r.memberId())).toList();
			Map<UUID, String> aroundGradeMap = singleRankingRedisRepository.getGrades(gradeKey, aroundIds);
			Map<UUID, Integer> aroundPlayTimeMap = singleRankingRedisRepository.getPlayTimes(playTimeKey, aroundIds);
			rankingMetrics.recordRedis(aroundSample, difficulty, "around");
			Map<UUID, String> aroundNicknameMap = memberService.getNicknamesByIds(aroundIds);
			List<RankingEntry> around = toEntries(aroundRaw, (int)aroundStart + 1, aroundNicknameMap, aroundGradeMap,
				aroundPlayTimeMap);

			boolean hasPrev = aroundStart > 0;
			Integer prevCursor = hasPrev ? (int)aroundStart + 1 : null;
			long nextCursorLong = aroundEnd + 1;
			boolean hasNext = nextCursorLong < total;

			return new SingleRankingInitialResponse(
				difficulty.name(),
				WeekUtil.getYear(now),
				WeekUtil.getMonth(now),
				WeekUtil.getWeekOfMonth(now),
				top3,
				myRank,
				around,
				prevCursor, hasPrev,
				hasNext ? (int)nextCursorLong : null,
				hasNext);
		} finally {
			rankingMetrics.recordGetSingleRanking(apiSample, difficulty, "initial");
		}
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingScrollResponse getSingleRankingScrollAfter(Difficulty difficulty, int afterRank, int size,
		UUID memberId) {
		Timer.Sample apiSample = rankingMetrics.start();
		rankingMetrics.incrementRankingScrolled(difficulty, "realtime");
		try {
			LocalDate now = LocalDate.now(KOREA_ZONE_ID);
			String week = WeekUtil.getWeek(now);

			String key = RankingKeyUtil.singleKey(difficulty.name(), week);
			String gradeKey = RankingKeyUtil.singleGradeKey(difficulty.name(), week);
			String playTimeKey = RankingKeyUtil.singlePlayTimeKey(difficulty.name(), week);
			long total = singleRankingRedisRepository.getTotalCount(key);

			long start = afterRank;
			long end = afterRank + (long)size - 1;

			Timer.Sample aroundSample = rankingMetrics.start();
			List<RankEntry> raw = singleRankingRedisRepository.getRangeByRank(key, start, end);
			List<UUID> memberUuids = raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
			Map<UUID, String> gradeMap = singleRankingRedisRepository.getGrades(gradeKey, memberUuids);
			Map<UUID, Integer> playTimeMap = singleRankingRedisRepository.getPlayTimes(playTimeKey, memberUuids);
			rankingMetrics.recordRedis(aroundSample, difficulty, "around");
			Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);
			List<RankingEntry> rankings = toEntries(raw, (int)start + 1, nicknameMap, gradeMap, playTimeMap);

			Integer prevCursor = raw.isEmpty() ? null : (int)start + 1;
			boolean hasPrev = !raw.isEmpty() && afterRank > 0;
			long nextCursorLong = start + raw.size();
			boolean hasNext = nextCursorLong < total;

			return new SingleRankingScrollResponse(
				rankings,
				prevCursor, hasPrev,
				hasNext ? (int)nextCursorLong : null,
				hasNext);
		} finally {
			rankingMetrics.recordGetSingleRanking(apiSample, difficulty, "scroll");
		}
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingScrollResponse getSingleRankingScrollBefore(Difficulty difficulty, int beforeRank, int size,
		UUID memberId) {
		Timer.Sample apiSample = rankingMetrics.start();
		rankingMetrics.incrementRankingScrolled(difficulty, "realtime");
		try {
			LocalDate now = LocalDate.now(KOREA_ZONE_ID);
			String week = WeekUtil.getWeek(now);

			String key = RankingKeyUtil.singleKey(difficulty.name(), week);
			String gradeKey = RankingKeyUtil.singleGradeKey(difficulty.name(), week);
			String playTimeKey = RankingKeyUtil.singlePlayTimeKey(difficulty.name(), week);
			long total = singleRankingRedisRepository.getTotalCount(key);

			long endIdx = Math.min(total - 1, (long)beforeRank - 2);
			if (endIdx < 0) {
				return new SingleRankingScrollResponse(List.of(), null, false, null, false);
			}
			long startIdx = Math.max(0, endIdx - size);

			Timer.Sample aroundSample = rankingMetrics.start();
			List<RankEntry> raw = singleRankingRedisRepository.getRangeByRank(key, startIdx, endIdx);
			rankingMetrics.recordRedis(aroundSample, difficulty, "around");

			if (raw.isEmpty()) {
				return new SingleRankingScrollResponse(List.of(), null, false, null, false);
			}
			boolean hasPrev = raw.size() > size;
			List<RankEntry> page = hasPrev ? raw.subList(1, raw.size()) : raw;

			List<UUID> memberUuids = page.stream().map(r -> UUID.fromString(r.memberId())).toList();
			Map<UUID, String> gradeMap = singleRankingRedisRepository.getGrades(gradeKey, memberUuids);
			Map<UUID, Integer> playTimeMap = singleRankingRedisRepository.getPlayTimes(playTimeKey, memberUuids);
			Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);
			int pageStartRank = hasPrev ? (int)startIdx + 2 : (int)startIdx + 1;
			List<RankingEntry> rankings = toEntries(page, pageStartRank, nicknameMap, gradeMap, playTimeMap);

			Integer prevCursor = hasPrev ? pageStartRank : null;
			long nextCursorLong = endIdx + 1;
			boolean hasNext = nextCursorLong < total;

			return new SingleRankingScrollResponse(
				rankings,
				prevCursor, hasPrev,
				page.isEmpty() ? null : (int)nextCursorLong,
				hasNext);
		} finally {
			rankingMetrics.recordGetSingleRanking(apiSample, difficulty, "scroll");
		}
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingInitialResponse getSingleRankingHistory(Difficulty difficulty, int year, int month, int week,
		int size, UUID memberId) {
		Timer.Sample apiSample = rankingMetrics.start();
		rankingMetrics.incrementRankingViewed(difficulty, "history");
		try {
			String weekKey = WeekUtil.getWeek(year, month, week);

			Timer.Sample top3Sample = rankingMetrics.start();
			List<SingleRanking> top3Raw = singleRankingRepository.findTop3ByDifficultyAndWeek(difficulty, weekKey);
			rankingMetrics.recordDb(top3Sample, difficulty, "top3");

			Timer.Sample countSample = rankingMetrics.start();
			long total = singleRankingRepository.countByDifficultyAndWeek(difficulty, weekKey);
			rankingMetrics.recordDb(countSample, difficulty, "count");

			SingleRanking myRankEntity = singleRankingRepository
				.findByMemberIdAndDifficultyAndWeek(memberId, difficulty, weekKey)
				.orElse(null);

			if (myRankEntity == null) {
				List<UUID> top3Ids = top3Raw.stream().map(SingleRanking::getMemberId).toList();
				Map<UUID, String> top3NicknameMap = memberService.getNicknamesByIds(top3Ids);
				List<RankingEntry> top3 = toHistoryEntries(top3Raw, top3NicknameMap);

				boolean hasNext = total > 3;
				return new SingleRankingInitialResponse(
					difficulty.name(),
					year,
					month,
					week,
					top3,
					null,
					List.of(),
					null, false,
					hasNext ? 3 : null,
					hasNext);
			}

			int aroundMinRank = Math.max(1, myRankEntity.getRank() - 2);
			int aroundMaxRank = Math.min((int)total, myRankEntity.getRank() + 2);

			Timer.Sample aroundSample = rankingMetrics.start();
			List<SingleRanking> aroundRaw = singleRankingRepository
				.findAroundByDifficultyAndWeekAndRank(
					difficulty,
					weekKey,
					aroundMinRank,
					aroundMaxRank);
			rankingMetrics.recordDb(aroundSample, difficulty, "around");

			List<UUID> allIds = new ArrayList<>();
			top3Raw.stream().map(SingleRanking::getMemberId).forEach(allIds::add);
			aroundRaw.stream().map(SingleRanking::getMemberId).forEach(allIds::add);
			allIds.add(myRankEntity.getMemberId());
			Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(allIds.stream().distinct().toList());

			List<RankingEntry> top3 = toHistoryEntries(top3Raw, nicknameMap);
			String myNickname = nicknameMap.getOrDefault(myRankEntity.getMemberId(), "[Unknown]");
			RankingEntry myRank = new RankingEntry(
				myRankEntity.getRank(),
				myNickname,
				myRankEntity.getScore(),
				myRankEntity.getGrade(),
				myRankEntity.getPlayTime());
			List<RankingEntry> around = toHistoryEntries(aroundRaw, nicknameMap);

			boolean hasPrev = aroundMinRank > 1;
			Integer prevCursor = hasPrev ? aroundMinRank : null;
			boolean hasNext = aroundMaxRank < total;
			Integer nextCursor = hasNext ? aroundMaxRank : null;

			return new SingleRankingInitialResponse(
				difficulty.name(),
				year,
				month,
				week,
				top3,
				myRank,
				around,
				prevCursor, hasPrev,
				nextCursor,
				hasNext);
		} finally {
			rankingMetrics.recordGetSingleRanking(apiSample, difficulty, "history");
		}
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingScrollResponse getSingleRankingHistoryScrollAfter(Difficulty difficulty, int year, int month,
		int week, int afterRank, int size, UUID memberId) {
		Timer.Sample apiSample = rankingMetrics.start();
		rankingMetrics.incrementRankingScrolled(difficulty, "history");
		try {
			String weekKey = WeekUtil.getWeek(year, month, week);

			Timer.Sample aroundSample = rankingMetrics.start();
			List<SingleRanking> raw = singleRankingRepository.findScrollResult(
				difficulty,
				weekKey,
				afterRank,
				size + 1);
			rankingMetrics.recordDb(aroundSample, difficulty, "around");

			if (raw.isEmpty()) {
				return new SingleRankingScrollResponse(List.of(), null, false, null, false);
			}

			boolean hasNext = raw.size() > size;
			List<SingleRanking> page = hasNext ? raw.subList(0, size) : raw;

			List<UUID> memberIds = page.stream().map(SingleRanking::getMemberId).toList();
			Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberIds);
			List<RankingEntry> rankings = toHistoryEntries(page, nicknameMap);

			Integer prevCursor = page.isEmpty() ? null : page.get(0).getRank();
			boolean hasPrev = afterRank > 0;
			Integer nextCursor = hasNext ? page.get(page.size() - 1).getRank() : null;

			return new SingleRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
		} finally {
			rankingMetrics.recordGetSingleRanking(apiSample, difficulty, "history_scroll");
		}
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingScrollResponse getSingleRankingHistoryScrollBefore(Difficulty difficulty, int year, int month,
		int week, int beforeRank, int size, UUID memberId) {
		Timer.Sample apiSample = rankingMetrics.start();
		rankingMetrics.incrementRankingScrolled(difficulty, "history");
		try {
			String weekKey = WeekUtil.getWeek(year, month, week);

			Timer.Sample countSample = rankingMetrics.start();
			long total = singleRankingRepository.countByDifficultyAndWeek(difficulty, weekKey);
			rankingMetrics.recordDb(countSample, difficulty, "count");

			Timer.Sample aroundSample = rankingMetrics.start();
			List<SingleRanking> raw = singleRankingRepository.findScrollResultBefore(
				difficulty,
				weekKey,
				beforeRank,
				size);
			rankingMetrics.recordDb(aroundSample, difficulty, "around");

			if (raw.isEmpty()) {
				return new SingleRankingScrollResponse(List.of(), null, false, null, false);
			}

			boolean hasPrev = raw.size() > size;
			List<SingleRanking> page = new ArrayList<>(hasPrev ? raw.subList(0, size) : raw);
			Collections.reverse(page);

			List<UUID> memberIds = page.stream().map(SingleRanking::getMemberId).toList();
			Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberIds);
			List<RankingEntry> rankings = toHistoryEntries(page, nicknameMap);

			Integer prevCursor = hasPrev ? page.get(0).getRank() : null;
			Integer nextCursor = page.isEmpty() ? null : page.get(page.size() - 1).getRank();
			boolean hasNext = nextCursor != null && (long)nextCursor < total;

			return new SingleRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
		} finally {
			rankingMetrics.recordGetSingleRanking(apiSample, difficulty, "history_scroll");
		}
	}

	@Override
	@Transactional
	public int updateSingleScore(Difficulty difficulty, UUID memberId, int score, Grade grade, int playTimeMs) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);
		String scoreKey = RankingKeyUtil.singleKey(difficulty.name(), week);
		String gradeKey = RankingKeyUtil.singleGradeKey(difficulty.name(), week);
		String playTimeKey = RankingKeyUtil.singlePlayTimeKey(difficulty.name(), week);

		double composite = buildComposite(score, playTimeMs);
		singleRankingRedisRepository.saveScoreGradeAndPlayTime(scoreKey, gradeKey, playTimeKey, memberId, composite,
			grade.name(), playTimeMs);

		Long rankZeroBased = singleRankingRedisRepository.getRankZeroBased(scoreKey, memberId);
		int rank = rankZeroBased == null ? 0 : rankZeroBased.intValue() + 1;
		log.info("[ranking][updateScore] difficulty={}, score={}, rank={}", difficulty, score, rank);
		return rank;
	}

	private double buildComposite(int score, int playTimeMs) {
		long clampedPlayTimeMs = Math.min(playTimeMs, RankingKeyUtil.MAX_PLAY_TIME_MS);
		long playTimeComponent = (RankingKeyUtil.MAX_PLAY_TIME_MS - clampedPlayTimeMs)
			* RankingKeyUtil.PLAY_TIME_UNIT;

		ZonedDateTime weekStart = ZonedDateTime.now(KOREA_ZONE_ID)
			.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
			.toLocalDate()
			.atStartOfDay(KOREA_ZONE_ID);
		// Registration time is a best-effort tie-breaker at 100ms precision.
		long decisecondsSinceWeekStart = Math.min(
			(Instant.now().toEpochMilli() - weekStart.toInstant().toEpochMilli()) / 100,
			RankingKeyUtil.DECISECONDS_IN_WEEK - 1);
		long timeComponent = RankingKeyUtil.DECISECONDS_IN_WEEK - decisecondsSinceWeekStart;

		return (double)((score + 1L) * RankingKeyUtil.SCORE_UNIT + playTimeComponent + timeComponent);
	}

	@Override
	@Transactional(readOnly = true)
	public Integer getCurrentWeekScore(Difficulty difficulty, UUID memberId) {
		String key = RankingKeyUtil.singleKey(
			difficulty.name(),
			WeekUtil.getWeek(LocalDate.now(KOREA_ZONE_ID)));

		Double score = singleRankingRedisRepository.getScore(key, memberId);
		return score == null ? null : toPlainScore(score);
	}

	private List<RankingEntry> toHistoryEntries(List<SingleRanking> raw, Map<UUID, String> nicknameMap) {
		return raw.stream()
			.map(sr -> new RankingEntry(
				sr.getRank(),
				nicknameMap.getOrDefault(sr.getMemberId(), "[Unknown]"),
				sr.getScore(),
				sr.getGrade(),
				sr.getPlayTime()))
			.toList();
	}

	private List<RankingEntry> toEntries(List<RankEntry> raw, int startRank,
		Map<UUID, String> nicknameMap, Map<UUID, String> gradeMap, Map<UUID, Integer> playTimeMap) {
		List<RankingEntry> result = new ArrayList<>(raw.size());

		for (int i = 0; i < raw.size(); i++) {
			RankEntry r = raw.get(i);
			UUID id = UUID.fromString(r.memberId());
			String gradeStr = gradeMap.get(id);
			result.add(new RankingEntry(
				startRank + i,
				nicknameMap.getOrDefault(id, "[Unknown]"),
				toPlainScore(r.score()),
				gradeStr != null ? Grade.valueOf(gradeStr) : null,
				playTimeMap.get(id)));
		}

		return result;
	}

	private static int toPlainScore(double compositeScore) {
		return RankingKeyUtil.toPlainSingleScore(compositeScore);
	}
}
