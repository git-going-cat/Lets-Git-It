package com.gitcat.letsgitit.domain.ranking.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingEntry;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingInitialResponse.MyContributionRank;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.UpdateContributionRankingResult;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.domain.ranking.util.RankingTimeUtil;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.util.WeekUtil;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContributionRankingServiceImpl implements ContributionRankingService {

	private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");

	private final ContributionRankingRedisRepository contributionRankingRedisRepository;
	private final MemberService memberService;
	private final MeterRegistry meterRegistry;

	@Override
	@Transactional(readOnly = true)
	public ContributionRankingInitialResponse getContributionRanking(int size, UUID memberId) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		String scoreKey = RankingKeyUtil.contributionKey(week);
		String contributionKey = RankingKeyUtil.contributionContributionKey(week);
		String playCountKey = RankingKeyUtil.contributionPlayCountKey(week);

		long total = contributionRankingRedisRepository.getTotalCount(scoreKey);
		log.debug("[ranking][contribution][initial] week={}, memberId={}, total={}, size={}",
			week, memberId, total, size);

		// top3 조회
		List<RankEntry> top3Raw = contributionRankingRedisRepository.getTopEntries(scoreKey, 3);
		List<UUID> top3Ids = top3Raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, Integer> top3ContributionMap = contributionRankingRedisRepository.getContributions(contributionKey,
			top3Ids);
		Map<UUID, Integer> top3PlayCountMap = contributionRankingRedisRepository.getPlayCounts(playCountKey, top3Ids);
		Map<UUID, String> top3NicknameMap = memberService.getNicknamesByIds(top3Ids);
		List<ContributionRankingEntry> top3 = toEntries(top3Raw, 1, top3NicknameMap, top3ContributionMap,
			top3PlayCountMap);

		// myRank 조회
		Long myRankZeroBased = contributionRankingRedisRepository.getRankZeroBased(scoreKey, memberId);

		if (myRankZeroBased == null) {
			boolean hasNext = total > 3;
			log.debug(
				"[ranking][contribution][initial] member rank missing. week={}, memberId={}, top3Count={}, hasNext={}",
				week, memberId, top3.size(), hasNext);
			return new ContributionRankingInitialResponse(
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

		Integer myContribution = contributionRankingRedisRepository.getContribution(contributionKey, memberId);
		Integer myPlayCount = contributionRankingRedisRepository.getPlayCount(playCountKey, memberId);

		MyContributionRank myRank = new MyContributionRank(
			(int)(myRankZeroBased + 1),
			myContribution != null ? myContribution : 0,
			myPlayCount != null ? myPlayCount : 0);

		// around 조회 (고정 5명: myRank ± 2)
		long aroundStart = Math.max(0, myRankZeroBased - 2);
		long aroundEnd = Math.min(total - 1, myRankZeroBased + 2);

		List<RankEntry> aroundRaw = contributionRankingRedisRepository.getRangeByRank(scoreKey, aroundStart, aroundEnd);
		List<UUID> aroundIds = aroundRaw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, Integer> aroundContributionMap = contributionRankingRedisRepository.getContributions(contributionKey,
			aroundIds);
		Map<UUID, Integer> aroundPlayCountMap = contributionRankingRedisRepository.getPlayCounts(playCountKey,
			aroundIds);
		Map<UUID, String> aroundNicknameMap = memberService.getNicknamesByIds(aroundIds);
		List<ContributionRankingEntry> around = toEntries(aroundRaw, (int)aroundStart + 1, aroundNicknameMap,
			aroundContributionMap, aroundPlayCountMap);

		boolean hasPrev = aroundStart > 0;
		Integer prevCursor = hasPrev ? (int)aroundStart + 1 : null;
		long nextCursorLong = aroundEnd + 1;
		boolean hasNext = nextCursorLong < total;

		log.debug(
			"[ranking][contribution][initial] week={}, memberId={}, myRank={}, aroundStart={}, aroundEnd={}, hasPrev={}, hasNext={}",
			week, memberId, myRank.rank(), aroundStart, aroundEnd, hasPrev, hasNext);

		return new ContributionRankingInitialResponse(
			WeekUtil.getYear(now),
			WeekUtil.getMonth(now),
			WeekUtil.getWeekOfMonth(now),
			top3,
			myRank,
			around,
			prevCursor, hasPrev,
			hasNext ? (int)nextCursorLong : null,
			hasNext);
	}

	@Override
	@Transactional(readOnly = true)
	public ContributionRankingScrollResponse getContributionRankingScrollAfter(int afterRank, int size, UUID memberId) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		String scoreKey = RankingKeyUtil.contributionKey(week);
		String contributionKey = RankingKeyUtil.contributionContributionKey(week);
		String playCountKey = RankingKeyUtil.contributionPlayCountKey(week);

		long total = contributionRankingRedisRepository.getTotalCount(scoreKey);

		long start = afterRank;
		long end = afterRank + (long)size - 1;
		log.debug(
			"[ranking][contribution][scrollAfter] week={}, memberId={}, afterRank={}, size={}, start={}, end={}, total={}",
			week, memberId, afterRank, size, start, end, total);

		List<RankEntry> raw = contributionRankingRedisRepository.getRangeByRank(scoreKey, start, end);
		List<UUID> memberUuids = raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, Integer> contributionMap = contributionRankingRedisRepository.getContributions(contributionKey,
			memberUuids);
		Map<UUID, Integer> playCountMap = contributionRankingRedisRepository.getPlayCounts(playCountKey, memberUuids);
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);
		List<ContributionRankingEntry> rankings = toEntries(raw, (int)start + 1, nicknameMap, contributionMap,
			playCountMap);

		boolean hasPrev = !raw.isEmpty() && afterRank > 0;
		Integer prevCursor = hasPrev ? (int)start + 1 : null;
		long nextCursorLong = start + raw.size();
		boolean hasNext = nextCursorLong < total;

		return new ContributionRankingScrollResponse(
			rankings,
			prevCursor, hasPrev,
			hasNext ? (int)nextCursorLong : null,
			hasNext);
	}

	@Override
	@Transactional(readOnly = true)
	public ContributionRankingScrollResponse getContributionRankingScrollBefore(int beforeRank, int size,
		UUID memberId) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		String scoreKey = RankingKeyUtil.contributionKey(week);
		String contributionKey = RankingKeyUtil.contributionContributionKey(week);
		String playCountKey = RankingKeyUtil.contributionPlayCountKey(week);

		long total = contributionRankingRedisRepository.getTotalCount(scoreKey);

		long endIdx = Math.min(total - 1, (long)beforeRank - 2);
		log.debug(
			"[ranking][contribution][scrollBefore] week={}, memberId={}, beforeRank={}, size={}, endIdx={}, total={}",
			week, memberId, beforeRank, size, endIdx, total);

		if (endIdx < 0) {
			return new ContributionRankingScrollResponse(List.of(), null, false, null, false);
		}
		long startIdx = Math.max(0, endIdx - size);

		List<RankEntry> raw = contributionRankingRedisRepository.getRangeByRank(scoreKey, startIdx, endIdx);

		if (raw.isEmpty()) {
			return new ContributionRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasPrev = raw.size() > size;
		List<RankEntry> page = hasPrev ? raw.subList(1, raw.size()) : raw;

		List<UUID> memberUuids = page.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, Integer> contributionMap = contributionRankingRedisRepository.getContributions(contributionKey,
			memberUuids);
		Map<UUID, Integer> playCountMap = contributionRankingRedisRepository.getPlayCounts(playCountKey, memberUuids);
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);

		int pageStartRank = hasPrev ? (int)startIdx + 2 : (int)startIdx + 1;
		List<ContributionRankingEntry> rankings = toEntries(page, pageStartRank, nicknameMap, contributionMap,
			playCountMap);

		Integer prevCursor = hasPrev ? pageStartRank : null;
		long nextCursorLong = endIdx + 1;
		boolean hasNext = nextCursorLong < total;

		return new ContributionRankingScrollResponse(
			rankings,
			prevCursor, hasPrev,
			page.isEmpty() ? null : (int)nextCursorLong,
			hasNext);
	}

	@Override
	public UpdateContributionRankingResult updateContributionScore(UUID memberId, int deltaContribution) {
		if (deltaContribution < 0) {
			throw new BusinessException(ErrorCode.INVALID_CONTRIBUTION);
		}

		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);
		long currentDeciseconds = RankingTimeUtil.currentWeekDeciseconds();

		String scoreKey = RankingKeyUtil.contributionKey(week);
		String contributionKey = RankingKeyUtil.contributionContributionKey(week);
		String playCountKey = RankingKeyUtil.contributionPlayCountKey(week);
		String registeredAtKey = RankingKeyUtil.contributionRegisteredAtKey(week);

		UpdateContributionRankingResult result = contributionRankingRedisRepository.updateScore(
			scoreKey, contributionKey, playCountKey, registeredAtKey,
			memberId, deltaContribution, currentDeciseconds);

		if (result.contributionOverflow()) {
			log.warn("[ranking][contribution] contribution overflow: memberId={}, value={}",
				memberId, result.newContribution());
			meterRegistry.counter("ranking.contribution.overflow").increment();
		}
		if (result.playCountOverflow()) {
			log.warn("[ranking][contribution] playCount overflow: memberId={}, value={}",
				memberId, result.newPlayCount());
			meterRegistry.counter("ranking.playcount.overflow").increment();
		}

		log.info(
			"[ranking][contribution][updateScore] week={}, memberId={}, delta={}, newContribution={}, newPlayCount={}, rank={}",
			week, memberId, deltaContribution, result.newContribution(), result.newPlayCount(), result.rank());

		return result;
	}

	private List<ContributionRankingEntry> toEntries(
		List<RankEntry> raw, int startRank,
		Map<UUID, String> nicknameMap,
		Map<UUID, Integer> contributionMap,
		Map<UUID, Integer> playCountMap) {

		List<ContributionRankingEntry> result = new ArrayList<>(raw.size());

		for (int i = 0; i < raw.size(); i++) {
			RankEntry r = raw.get(i);
			UUID id = UUID.fromString(r.memberId());
			result.add(new ContributionRankingEntry(
				startRank + i,
				id,
				nicknameMap.getOrDefault(id, "[Unknown]"),
				contributionMap.getOrDefault(id, 0),
				playCountMap.getOrDefault(id, 0)));
		}

		return result;
	}
}
