package com.gitcat.letsgitit.domain.ranking.service;

import java.text.Collator;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.coop.entity.CoopResultMember;
import com.gitcat.letsgitit.domain.coop.repository.CoopResultMemberRepository;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingEntry;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingMemberDto;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRepository;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoopRankingServiceImpl implements CoopRankingService {

	private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");
	private static final Collator KOREAN_COLLATOR = Collator.getInstance(Locale.KOREAN);

	private final CoopRankingRedisRepository coopRankingRedisRepository;
	private final MemberService memberService;
	private final CoopRankingRepository coopRankingRepository;
	private final CoopResultMemberRepository coopResultMemberRepository;

	// ── 이번주 (Redis) ──────────────────────────────────────────────────────────

	@Override
	public CoopRankingInitialResponse getCoopRanking(UUID memberId, String mapName, int difficulty) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		List<CoopRankingData> filtered = getFilteredMapData(week, mapName, difficulty);
		long mapTotal = filtered.size();

		log.debug("[coop-ranking][initial] week={}, mapName={}, difficulty={}, memberId={}, mapTotal={}",
			week, mapName, difficulty, memberId, mapTotal);

		List<CoopRankingData> top3DataList = filtered.subList(0, (int)Math.min(3, mapTotal));
		List<CoopRankingEntry> top3 = toEntries(top3DataList, 1);

		Set<String> myCoopResultIds = coopRankingRedisRepository.getMemberCoopResultIds(week, memberId);

		if (myCoopResultIds.isEmpty()) {
			boolean hasNext = mapTotal > 3;
			return new CoopRankingInitialResponse(
				WeekUtil.getYear(now), WeekUtil.getMonth(now), WeekUtil.getWeekOfMonth(now),
				top3, null, List.of(), null, false,
				hasNext ? 3 : null, hasNext);
		}

		// filtered는 elapsed_time ASC 순서이므로 첫 번째 일치가 최고 기록
		int myMapRankZeroBased = -1;
		CoopRankingData bestData = null;
		for (int i = 0; i < filtered.size(); i++) {
			CoopRankingData d = filtered.get(i);
			if (d != null && myCoopResultIds.contains(d.coopResultId())) {
				bestData = d;
				myMapRankZeroBased = i;
				break;
			}
		}

		if (myMapRankZeroBased == -1) {
			boolean hasNext = mapTotal > 3;
			log.debug(
				"[coop-ranking][initial] member not participated in map. week={}, mapName={}, difficulty={}, memberId={}",
				week, mapName, difficulty, memberId);
			return new CoopRankingInitialResponse(
				WeekUtil.getYear(now), WeekUtil.getMonth(now), WeekUtil.getWeekOfMonth(now),
				top3, null, List.of(), null, false,
				hasNext ? 3 : null, hasNext);
		}

		CoopRankingEntry myRank = toEntry(bestData, myMapRankZeroBased + 1);

		long aroundStart = Math.max(0, myMapRankZeroBased - 2);
		long aroundEnd = Math.min(mapTotal - 1, myMapRankZeroBased + 2);
		List<CoopRankingData> aroundDataList = filtered.subList((int)aroundStart, (int)aroundEnd + 1);
		List<CoopRankingEntry> around = toEntries(aroundDataList, (int)aroundStart + 1);

		boolean hasPrev = aroundStart > 0;
		Integer prevCursor = hasPrev ? (int)aroundStart + 1 : null;
		long nextCursorLong = aroundEnd + 1;
		boolean hasNext = nextCursorLong < mapTotal;

		log.debug("[coop-ranking][initial] week={}, mapName={}, difficulty={}, memberId={}, myMapRank={}",
			week, mapName, difficulty, memberId, myMapRankZeroBased + 1);

		return new CoopRankingInitialResponse(
			WeekUtil.getYear(now), WeekUtil.getMonth(now), WeekUtil.getWeekOfMonth(now),
			top3, myRank, around,
			prevCursor, hasPrev,
			hasNext ? (int)nextCursorLong : null, hasNext);
	}

	@Override
	public CoopRankingScrollResponse getCoopRankingScrollAfter(int afterRank, int size, UUID memberId,
		String mapName, int difficulty) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		List<CoopRankingData> filtered = getFilteredMapData(week, mapName, difficulty);
		long mapTotal = filtered.size();

		// afterRank = 0-indexed 커서 (마지막으로 표시한 항목의 다음 위치)
		int start = afterRank;
		if (start >= mapTotal) {
			log.debug(
				"[coop-ranking][scrollAfter] out of range. week={}, mapName={}, difficulty={}, afterRank={}, mapTotal={}",
				week, mapName, difficulty, afterRank, mapTotal);
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}

		int end = (int)Math.min((long)start + size - 1, mapTotal - 1);
		List<CoopRankingData> page = filtered.subList(start, end + 1);

		List<CoopRankingEntry> rankings = toEntries(page, start + 1);

		boolean hasPrev = afterRank > 0;
		Integer prevCursor = hasPrev ? start + 1 : null;
		long nextCursorLong = start + page.size();
		boolean hasNext = nextCursorLong < mapTotal;

		return new CoopRankingScrollResponse(
			rankings, prevCursor, hasPrev,
			hasNext ? (int)nextCursorLong : null, hasNext);
	}

	@Override
	public CoopRankingScrollResponse getCoopRankingScrollBefore(int beforeRank, int size, UUID memberId,
		String mapName, int difficulty) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		List<CoopRankingData> filtered = getFilteredMapData(week, mapName, difficulty);
		long mapTotal = filtered.size();

		long endIdx = Math.min(mapTotal - 1, (long)beforeRank - 2);
		if (endIdx < 0) {
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}
		long startIdx = Math.max(0, endIdx - size);

		List<CoopRankingData> rawSlice = filtered.subList((int)startIdx, (int)endIdx + 1);
		boolean hasPrev = rawSlice.size() > size;
		List<CoopRankingData> pageData = hasPrev ? rawSlice.subList(1, rawSlice.size()) : rawSlice;
		int pageStartRank = hasPrev ? (int)startIdx + 2 : (int)startIdx + 1;

		List<CoopRankingEntry> rankings = toEntries(pageData, pageStartRank);

		Integer prevCursor = hasPrev ? pageStartRank : null;
		long nextCursorLong = endIdx + 1;
		boolean hasNext = nextCursorLong < mapTotal;

		return new CoopRankingScrollResponse(
			rankings, prevCursor, hasPrev,
			hasNext ? (int)nextCursorLong : null, hasNext);
	}

	@Override
	public void registerCoopRanking(CoopRankingData data) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		coopRankingRedisRepository.register(week, data);
		log.info("[coop-ranking][register] week={}, coopResultId={}, elapsedTime={}",
			week, data.coopResultId(), data.elapsedTime());
	}

	// ── 과거주 (DB) ────────────────────────────────────────────────────────────

	@Override
	@Transactional(readOnly = true)
	public CoopRankingInitialResponse getCoopRankingHistory(int year, int month, int week, int size,
		UUID memberId, String mapName, int difficulty) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		long total = coopRankingRepository.countByWeekAndMapNameAndDifficulty(weekKey, mapName, difficulty);
		List<CoopRanking> top3Raw = coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			weekKey, mapName, difficulty, 0, 3);

		CoopRanking myRankEntity = coopRankingRepository
			.findMyCoopRankingByMemberIdAndWeekAndMapNameAndDifficulty(memberId, weekKey, mapName, difficulty)
			.orElse(null);

		if (myRankEntity == null) {
			Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(top3Raw);
			Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());
			List<CoopRankingEntry> top3 = toEntriesWithStartRank(top3Raw, memberMap, nicknameMap, 1);
			boolean hasNext = total > 3;
			return new CoopRankingInitialResponse(
				year, month, week,
				top3, null, List.of(),
				null, false,
				hasNext ? 3 : null, hasNext);
		}

		// globalRank보다 낮은(더 좋은) 기록 수 = 내 앞에 있는 팀 수 → display rank 계산
		long countBefore = coopRankingRepository.countByWeekAndMapNameAndDifficultyAndRankLt(
			weekKey, mapName, difficulty, myRankEntity.getRank());
		int myDisplayRank = (int)(countBefore + 1);

		int aroundMinDisplayRank = Math.max(1, myDisplayRank - 2);
		int aroundMaxDisplayRank = Math.min((int)total, myDisplayRank + 2);
		long aroundOffset = aroundMinDisplayRank - 1;
		int aroundLimit = aroundMaxDisplayRank - aroundMinDisplayRank + 1;

		List<CoopRanking> aroundRaw = coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			weekKey, mapName, difficulty, aroundOffset, aroundLimit);

		// 배치 멤버 조회: top3 + around + myRankEntity (중복 제거)
		List<CoopRanking> allRankings = new ArrayList<>(top3Raw);
		Set<UUID> fetchedIds = top3Raw.stream().map(CoopRanking::getCoopResultId).collect(Collectors.toSet());
		for (CoopRanking r : aroundRaw) {
			if (fetchedIds.add(r.getCoopResultId())) {
				allRankings.add(r);
			}
		}
		if (fetchedIds.add(myRankEntity.getCoopResultId())) {
			allRankings.add(myRankEntity);
		}

		Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(allRankings);
		Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());

		List<CoopRankingEntry> top3 = toEntriesWithStartRank(top3Raw, memberMap, nicknameMap, 1);
		CoopRankingEntry myRank = toEntryWithDisplayRank(myRankEntity, myDisplayRank, memberMap, nicknameMap);
		List<CoopRankingEntry> around = toEntriesWithStartRank(aroundRaw, memberMap, nicknameMap, aroundMinDisplayRank);

		boolean hasPrev = aroundMinDisplayRank > 1;
		Integer prevCursor = hasPrev ? aroundMinDisplayRank : null;
		boolean hasNext = (long)aroundMaxDisplayRank < total;
		Integer nextCursor = hasNext ? aroundMaxDisplayRank : null;

		return new CoopRankingInitialResponse(
			year, month, week,
			top3, myRank, around,
			prevCursor, hasPrev, nextCursor, hasNext);
	}

	@Override
	@Transactional(readOnly = true)
	public CoopRankingScrollResponse getCoopRankingHistoryScrollAfter(int year, int month, int week,
		int afterRank, int size, UUID memberId, String mapName, int difficulty) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		// afterRank = 0-indexed 커서, 다음 페이지는 offset=afterRank부터
		List<CoopRanking> raw = coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			weekKey, mapName, difficulty, afterRank, size + 1);

		if (raw.isEmpty()) {
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasNext = raw.size() > size;
		List<CoopRanking> page = hasNext ? raw.subList(0, size) : raw;
		int pageStartRank = afterRank + 1;

		Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(page);
		Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());
		List<CoopRankingEntry> rankings = toEntriesWithStartRank(page, memberMap, nicknameMap, pageStartRank);

		boolean hasPrev = afterRank > 0;
		Integer prevCursor = hasPrev ? pageStartRank : null;
		int lastDisplayRank = pageStartRank + page.size() - 1;
		Integer nextCursor = hasNext ? lastDisplayRank : null;

		return new CoopRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
	}

	@Override
	@Transactional(readOnly = true)
	public CoopRankingScrollResponse getCoopRankingHistoryScrollBefore(int year, int month, int week,
		int beforeRank, int size, UUID memberId, String mapName, int difficulty) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		long total = coopRankingRepository.countByWeekAndMapNameAndDifficulty(weekKey, mapName, difficulty);

		// endDisplayRank: 이 페이지에서 보여줄 마지막 display rank (1-indexed)
		int endDisplayRank = (int)Math.min(total, beforeRank - 1);
		if (endDisplayRank <= 0) {
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}

		// DESC 기준으로 endDisplayRank보다 낮은 순위(= 더 늦은 기록)를 skip
		long descOffset = total - endDisplayRank;
		List<CoopRanking> raw = coopRankingRepository.findByWeekAndMapNameAndDifficultyDescWithOffset(
			weekKey, mapName, difficulty, descOffset, size + 1);

		if (raw.isEmpty()) {
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasPrev = raw.size() > size;
		List<CoopRanking> page = new ArrayList<>(hasPrev ? raw.subList(0, size) : raw);
		Collections.reverse(page); // DESC → ASC 복원

		int pageStartRank = endDisplayRank - page.size() + 1;

		Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(page);
		Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());
		List<CoopRankingEntry> rankings = toEntriesWithStartRank(page, memberMap, nicknameMap, pageStartRank);

		Integer prevCursor = hasPrev ? pageStartRank : null;
		boolean hasNext = (long)endDisplayRank < total;
		Integer nextCursor = hasNext ? endDisplayRank : null;

		return new CoopRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
	}

	// ── private helpers ────────────────────────────────────────────────────────

	// Redis에서 전체 데이터를 가져와 mapName+difficulty로 필터링 (elapsed_time ASC 순서 유지)
	private List<CoopRankingData> getFilteredMapData(String week, String mapName, int difficulty) {
		long total = coopRankingRedisRepository.getTotalCount(week);
		if (total == 0) {
			return List.of();
		}
		List<String> allLexStrings = coopRankingRedisRepository.getRangeByRank(week, 0, total - 1);
		List<String> allCoopResultIds = allLexStrings.stream()
			.map(RankingKeyUtil::parseCoopResultIdFromLexString)
			.toList();
		List<CoopRankingData> allData = coopRankingRedisRepository.getDataBatch(week, allCoopResultIds);
		return allData.stream()
			.filter(d -> d != null && mapName.equals(d.mapName()) && d.difficulty() == difficulty)
			.toList();
	}

	// Redis CoopRankingData 리스트 → CoopRankingEntry 리스트 (startRank부터 순차 rank 부여)
	private List<CoopRankingEntry> toEntries(List<CoopRankingData> dataList, int startRank) {
		if (dataList.isEmpty()) {
			return List.of();
		}
		List<UUID> allMemberIds = dataList.stream()
			.filter(Objects::nonNull)
			.flatMap(d -> d.memberIds().stream())
			.map(UUID::fromString)
			.distinct()
			.toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(allMemberIds);

		List<CoopRankingEntry> result = new ArrayList<>(dataList.size());
		for (int i = 0; i < dataList.size(); i++) {
			CoopRankingData data = dataList.get(i);
			if (data == null) {
				log.warn("[coop-ranking][toEntries] orphan entry at rank {}, skipping", startRank + i);
				continue;
			}
			result.add(toEntryWithNicknames(data, startRank + i, nicknameMap));
		}
		return result;
	}

	// Redis CoopRankingData 단건 → CoopRankingEntry
	private CoopRankingEntry toEntry(CoopRankingData data, int rank) {
		List<UUID> memberUuids = data.memberIds().stream().map(UUID::fromString).toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);
		return toEntryWithNicknames(data, rank, nicknameMap);
	}

	private CoopRankingEntry toEntryWithNicknames(CoopRankingData data, int rank, Map<UUID, String> nicknameMap) {
		List<CoopRankingMemberDto> members = data.memberIds().stream()
			.map(id -> {
				UUID uuid = UUID.fromString(id);
				String nickname = nicknameMap.getOrDefault(uuid, "[Unknown]");
				return new CoopRankingMemberDto(uuid, nickname);
			})
			.sorted((a, b) -> KOREAN_COLLATOR.compare(a.nickname(), b.nickname()))
			.collect(Collectors.toList());

		return new CoopRankingEntry(
			rank, data.teamName(), data.mapName(), data.difficulty(),
			data.elapsedTime(), data.totalWrongTypeCount(), data.totalWrongOrderCount(),
			members);
	}

	// DB CoopRanking 리스트 → CoopRankingEntry 리스트 (startRank부터 순차 맵별 rank 부여)
	private List<CoopRankingEntry> toEntriesWithStartRank(List<CoopRanking> rankings,
		Map<UUID, List<CoopResultMember>> memberMap, Map<UUID, String> nicknameMap, int startRank) {
		List<CoopRankingEntry> result = new ArrayList<>(rankings.size());
		for (int i = 0; i < rankings.size(); i++) {
			result.add(toEntryWithDisplayRank(rankings.get(i), startRank + i, memberMap, nicknameMap));
		}
		return result;
	}

	// DB CoopRanking 단건 → CoopRankingEntry (displayRank를 직접 지정)
	private CoopRankingEntry toEntryWithDisplayRank(CoopRanking ranking, int displayRank,
		Map<UUID, List<CoopResultMember>> memberMap, Map<UUID, String> nicknameMap) {
		List<CoopRankingMemberDto> members = memberMap
			.getOrDefault(ranking.getCoopResultId(), List.of())
			.stream()
			.map(m -> new CoopRankingMemberDto(
				m.getMemberId(),
				nicknameMap.getOrDefault(m.getMemberId(), "[Unknown]")))
			.sorted(Comparator.comparing(CoopRankingMemberDto::nickname))
			.toList();

		return new CoopRankingEntry(
			displayRank,
			ranking.getTeamName(), ranking.getMapName(), ranking.getDifficulty(),
			ranking.getElapsedTime(), ranking.getTotalWrongTypeCount(), ranking.getTotalWrongOrderCount(),
			members);
	}

	private Map<UUID, List<CoopResultMember>> fetchMemberMap(List<CoopRanking> rankings) {
		List<UUID> coopResultIds = rankings.stream().map(CoopRanking::getCoopResultId).distinct().toList();
		return coopResultMemberRepository.findAllByCoopResultIdIn(coopResultIds)
			.stream()
			.collect(Collectors.groupingBy(CoopResultMember::getCoopResultId));
	}

	private Map<UUID, String> fetchNicknameMap(Collection<List<CoopResultMember>> memberLists) {
		List<UUID> memberIds = memberLists.stream()
			.flatMap(List::stream)
			.map(CoopResultMember::getMemberId)
			.distinct()
			.toList();
		return memberService.getNicknamesByIds(memberIds);
	}
}
