package com.gitcat.letsgitit.domain.ranking.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
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
import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.domain.ranking.repository.CompetitiveRankingRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.domain.ranking.util.RankingTimeUtil;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;
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
	private final CompetitiveRankingRepository competitiveRankingRepository;

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
		if (deltaContribution <= 0) {
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

	/**
	 * 과거주 기여도 뺏기 랭킹 초기 진입 조회
	 * - top3: 화면 상단 고정 노출 (항상 반환)
	 * - myRank: 로그인 사용자의 해당 주차 기록 (기록 없으면 null, around 빈 배열)
	 * - around: 내 순위 기준 ±2 범위 (예: 내가 15위 → 13~17위)
	 * - prevCursor/nextCursor: around 첫/마지막 순위값 (스크롤 시작 커서로 사용)
	 */
	@Override
	@Transactional(readOnly = true)
	public ContributionRankingInitialResponse getContributionRankingHistory(int year, int month, int week, int size,
		UUID memberId) {
		// year/month/week 조합을 DB 저장 형식 "YYYY-MM-W"로 변환 (예: "2025-4-3")
		String weekKey = WeekUtil.getWeek(year, month, week);

		List<CompetitiveRanking> top3Raw = competitiveRankingRepository.findTop3ByModeAndWeek(
			CompetitiveMode.CONTRIBUTION, weekKey);
		long total = competitiveRankingRepository.countByModeAndWeek(CompetitiveMode.CONTRIBUTION, weekKey);

		CompetitiveRanking myRankEntity = competitiveRankingRepository
			.findByMemberIdAndModeAndWeek(memberId, CompetitiveMode.CONTRIBUTION, weekKey)
			.orElse(null);

		// 해당 주차에 플레이 기록이 없으면 top3만 반환
		// around가 없으므로 nextCursor는 top3의 마지막 순위(3)로 설정
		if (myRankEntity == null) {
			List<UUID> top3Ids = top3Raw.stream().map(CompetitiveRanking::getMemberId).toList();
			Map<UUID, String> top3NicknameMap = memberService.getNicknamesByIds(top3Ids);
			List<ContributionRankingEntry> top3 = toEntries(top3Raw, top3NicknameMap);

			boolean hasNext = total > 3;
			return new ContributionRankingInitialResponse(
				year, month, week,
				top3,
				null, // myRank 없음
				List.of(), // around 없음
				null, false,
				hasNext ? 3 : null, // 4위부터 스크롤 가능하도록 커서를 3으로 설정
				hasNext);
		}

		// around 범위 계산: 내 순위 ±2, 단 1 미만 및 전체 순위 초과는 클램핑
		int aroundMinRank = Math.max(1, myRankEntity.getRank() - 2);
		int aroundMaxRank = Math.min((int)total, myRankEntity.getRank() + 2);

		List<CompetitiveRanking> aroundRaw = competitiveRankingRepository
			.findAroundByModeAndWeekAndRank(CompetitiveMode.CONTRIBUTION, weekKey, aroundMinRank, aroundMaxRank);

		// top3 memberId와 around memberId를 합쳐서 닉네임을 한 번에 배치 조회 (N+1 방지)
		List<UUID> allIds = new ArrayList<>();
		top3Raw.stream().map(CompetitiveRanking::getMemberId).forEach(allIds::add);
		aroundRaw.stream().map(CompetitiveRanking::getMemberId).forEach(allIds::add);
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(allIds.stream().distinct().toList());

		List<ContributionRankingEntry> top3 = toEntries(top3Raw, nicknameMap);
		// myRank는 자기 자신이므로 playerId/nickname 미포함 (ContributionMyRankEntry)
		MyContributionRank myRank = new MyContributionRank(
			myRankEntity.getRank(),
			myRankEntity.getScore(), // DB 컬럼명은 score, 응답 필드명은 contribution
			myRankEntity.getPlayCount());
		List<ContributionRankingEntry> around = toEntries(aroundRaw, nicknameMap);

		// around의 첫 순위가 1이면 위로 더 없음 → prevCursor null
		boolean hasPrev = aroundMinRank > 1;
		Integer prevCursor = hasPrev ? aroundMinRank : null;
		// around의 마지막 순위가 전체 끝이면 아래로 더 없음 → nextCursor null
		boolean hasNext = aroundMaxRank < total;
		Integer nextCursor = hasNext ? aroundMaxRank : null;

		return new ContributionRankingInitialResponse(
			year, month, week,
			top3, myRank, around,
			prevCursor, hasPrev,
			nextCursor, hasNext);
	}

	/**
	 * 아래 방향 스크롤: afterRank 초과 데이터를 rank ASC로 조회
	 * - size+1개를 fetch해서 실제 페이지(size개) 외에 다음 데이터 존재 여부(hasNext)를 판단
	 * - prevCursor: 현재 페이지 첫 순위 (위 방향 스크롤 진입점)
	 * - nextCursor: 현재 페이지 마지막 순위 (다음 아래 스크롤 커서)
	 */
	@Override
	@Transactional(readOnly = true)
	public ContributionRankingScrollResponse getContributionRankingHistoryScrollAfter(int year, int month, int week,
		int afterRank, int size, UUID memberId) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		// size+1개 요청: size개는 현재 페이지, 1개 초과 시 hasNext=true
		List<CompetitiveRanking> raw = competitiveRankingRepository.findScrollResult(
			CompetitiveMode.CONTRIBUTION, weekKey, afterRank, size + 1);

		if (raw.isEmpty()) {
			return new ContributionRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasNext = raw.size() > size;
		List<CompetitiveRanking> page = hasNext ? raw.subList(0, size) : raw;

		List<UUID> memberIds = page.stream().map(CompetitiveRanking::getMemberId).toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberIds);
		List<ContributionRankingEntry> rankings = toEntries(page, nicknameMap);

		boolean hasPrev = afterRank > 0; // afterRank가 0이면 이미 최상단
		Integer prevCursor = hasPrev ? page.get(0).getRank() : null;
		Integer nextCursor = hasNext ? page.get(page.size() - 1).getRank() : null;

		return new ContributionRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
	}

	/**
	 * 위 방향 스크롤: beforeRank 미만 데이터를 rank DESC로 조회 후 오름차순 복원
	 * - DSL 쿼리가 rank DESC로 반환하므로 Collections.reverse로 오름차순 복원
	 * - size+1개를 fetch해서 hasPrev(더 위에 데이터 존재 여부)를 판단
	 * - hasNext: 현재 페이지 마지막 순위가 전체 끝보다 작으면 아래 데이터 존재
	 */
	@Override
	@Transactional(readOnly = true)
	public ContributionRankingScrollResponse getContributionRankingHistoryScrollBefore(int year, int month, int week,
		int beforeRank, int size, UUID memberId) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		// hasNext 판단을 위해 total 조회 (현재 페이지 마지막 순위와 비교)
		long total = competitiveRankingRepository.countByModeAndWeek(CompetitiveMode.CONTRIBUTION, weekKey);

		// DSL에서 rank DESC + size+1 fetch → hasPrev 판단용 1개 초과분 포함
		List<CompetitiveRanking> raw = competitiveRankingRepository.findScrollResultBefore(
			CompetitiveMode.CONTRIBUTION, weekKey, beforeRank, size);

		if (raw.isEmpty()) {
			return new ContributionRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasPrev = raw.size() > size;
		// DSL이 DESC로 반환했으므로 화면 표시를 위해 오름차순(ASC)으로 뒤집기
		List<CompetitiveRanking> page = new ArrayList<>(hasPrev ? raw.subList(0, size) : raw);
		Collections.reverse(page);

		List<UUID> memberIds = page.stream().map(CompetitiveRanking::getMemberId).toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberIds);
		List<ContributionRankingEntry> rankings = toEntries(page, nicknameMap);

		Integer prevCursor = hasPrev ? page.get(0).getRank() : null;
		// 현재 페이지 마지막 순위가 전체 끝 미만이면 아래 방향 데이터 존재
		int lastRank = page.get(page.size() - 1).getRank();
		boolean hasNext = (long)lastRank < total;
		Integer nextCursor = hasNext ? lastRank : null;

		return new ContributionRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
	}

	// CompetitiveRanking 엔티티 리스트를 ContributionRankingEntry DTO 리스트로 변환
	// score(DB 컬럼) → contribution(응답 필드), memberId → playerId 매핑
	private List<ContributionRankingEntry> toEntries(List<CompetitiveRanking> raw, Map<UUID, String> nicknameMap) {
		return raw.stream()
			.map(r -> new ContributionRankingEntry(
				r.getRank(),
				r.getMemberId(),
				nicknameMap.getOrDefault(r.getMemberId(), "[Unknown]"),
				r.getScore(),
				r.getPlayCount()))
			.toList();
	}
}
