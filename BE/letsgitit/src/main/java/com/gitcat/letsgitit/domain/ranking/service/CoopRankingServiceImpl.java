package com.gitcat.letsgitit.domain.ranking.service;

import java.text.Collator;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingEntry;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingMemberDto;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRedisRepository;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoopRankingServiceImpl implements CoopRankingService {

	private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");
	private static final Collator KOREAN_COLLATOR = Collator.getInstance(Locale.KOREAN);

	/**
	 * myRank 선택 Comparator
	 * - 1순위: elapsedTime ASC (최고 기록)
	 * - 2순위: difficulty DESC (난이도 높은 것)
	 * - 3순위: registeredAt DESC (최근 기록)
	 */
	private static final Comparator<CoopRankingData> MY_RANK_COMPARATOR = Comparator
		.comparingInt(CoopRankingData::elapsedTime)
		.thenComparing(CoopRankingData::difficulty, Comparator.reverseOrder())
		.thenComparing(CoopRankingData::registeredAt, Comparator.reverseOrder());

	private final CoopRankingRedisRepository coopRankingRedisRepository;
	private final MemberService memberService;

	@Override
	public CoopRankingInitialResponse getCoopRanking(UUID memberId) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		long total = coopRankingRedisRepository.getTotalCount(week);
		log.debug("[coop-ranking][initial] week={}, memberId={}, total={}", week, memberId, total);

		// top3 조회
		List<String> top3LexStrings = coopRankingRedisRepository.getTopEntries(week, 3);
		List<CoopRankingData> top3DataList = lexStringsToDataList(week, top3LexStrings);
		List<CoopRankingEntry> top3 = toEntries(top3DataList, 1);

		// myRank 조회
		Set<String> myCoopResultIds = coopRankingRedisRepository.getMemberCoopResultIds(week, memberId);

		if (myCoopResultIds.isEmpty()) {
			// 이번 주 참여 기록 없음
			boolean hasNext = total > 3;
			log.debug("[coop-ranking][initial] member not participated. week={}, memberId={}", week, memberId);
			return new CoopRankingInitialResponse(
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

		// 내가 참여한 팀들 중 최고 기록 선택
		List<CoopRankingData> myDataList = coopRankingRedisRepository.getDataBatch(week,
			new ArrayList<>(myCoopResultIds));
		CoopRankingData bestData = myDataList.stream()
			.filter(Objects::nonNull)
			.min(MY_RANK_COMPARATOR)
			.orElse(null);

		if (bestData == null) {
			boolean hasNext = total > 3;
			log.warn(
				"[coop-ranking][initial] my rank candidate missing. week={}, memberId={}, coopResultCount={}, total={}",
				week, memberId, myCoopResultIds.size(), total);
			return new CoopRankingInitialResponse(
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

		// myRank 순위 조회
		String myLexString = coopRankingRedisRepository.getLexString(week, bestData.coopResultId());
		Long myRankZeroBased = coopRankingRedisRepository.getRankByLexString(week, myLexString);

		if (myRankZeroBased == null) {
			boolean hasNext = total > 3;
			log.warn("[coop-ranking][initial] lexString not found in ZSet. week={}, coopResultId={}",
				week, bestData.coopResultId());
			return new CoopRankingInitialResponse(
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

		CoopRankingEntry myRank = toEntry(bestData, (int)(myRankZeroBased + 1));

		// around 조회 (myRank ± 2)
		long aroundStart = Math.max(0, myRankZeroBased - 2);
		long aroundEnd = Math.min(total - 1, myRankZeroBased + 2);

		List<String> aroundLexStrings = coopRankingRedisRepository.getRangeByRank(week, aroundStart, aroundEnd);
		List<CoopRankingData> aroundDataList = lexStringsToDataList(week, aroundLexStrings);
		List<CoopRankingEntry> around = toEntries(aroundDataList, (int)aroundStart + 1);

		boolean hasPrev = aroundStart > 0;
		Integer prevCursor = hasPrev ? (int)aroundStart + 1 : null;
		long nextCursorLong = aroundEnd + 1;
		boolean hasNext = nextCursorLong < total;

		log.debug("[coop-ranking][initial] week={}, memberId={}, myRank={}, aroundStart={}, aroundEnd={}",
			week, memberId, myRankZeroBased + 1, aroundStart, aroundEnd);

		return new CoopRankingInitialResponse(
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
	public CoopRankingScrollResponse getCoopRankingScrollAfter(int afterRank, int size, UUID memberId) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		long total = coopRankingRedisRepository.getTotalCount(week);

		long start = afterRank;
		long end = afterRank + (long)size - 1;
		log.debug("[coop-ranking][scrollAfter] week={}, memberId={}, afterRank={}, size={}, start={}, end={}, total={}",
			week, memberId, afterRank, size, start, end, total);

		List<String> lexStrings = coopRankingRedisRepository.getRangeByRank(week, start, end);
		List<CoopRankingData> dataList = lexStringsToDataList(week, lexStrings);
		List<CoopRankingEntry> rankings = toEntries(dataList, (int)start + 1);

		boolean hasPrev = !lexStrings.isEmpty() && afterRank > 0;
		Integer prevCursor = hasPrev ? (int)start + 1 : null;
		long nextCursorLong = start + lexStrings.size();
		boolean hasNext = nextCursorLong < total;

		return new CoopRankingScrollResponse(
			rankings,
			prevCursor, hasPrev,
			hasNext ? (int)nextCursorLong : null,
			hasNext);
	}

	@Override
	public CoopRankingScrollResponse getCoopRankingScrollBefore(int beforeRank, int size, UUID memberId) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		long total = coopRankingRedisRepository.getTotalCount(week);

		long endIdx = Math.min(total - 1, (long)beforeRank - 2);
		log.debug("[coop-ranking][scrollBefore] week={}, memberId={}, beforeRank={}, size={}, endIdx={}, total={}",
			week, memberId, beforeRank, size, endIdx, total);

		if (endIdx < 0) {
			log.debug(
				"[coop-ranking][scrollBefore] empty before boundary. week={}, memberId={}, beforeRank={}, size={}",
				week, memberId, beforeRank, size);
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}
		long startIdx = Math.max(0, endIdx - size);

		List<String> lexStrings = coopRankingRedisRepository.getRangeByRank(week, startIdx, endIdx);

		if (lexStrings.isEmpty()) {
			log.debug(
				"[coop-ranking][scrollBefore] empty page. week={}, memberId={}, beforeRank={}, size={}, startIdx={}, endIdx={}",
				week, memberId, beforeRank, size, startIdx, endIdx);
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasPrev = lexStrings.size() > size;
		List<String> pageLexStrings = hasPrev ? lexStrings.subList(1, lexStrings.size()) : lexStrings;

		List<CoopRankingData> dataList = lexStringsToDataList(week, pageLexStrings);
		int pageStartRank = hasPrev ? (int)startIdx + 2 : (int)startIdx + 1;
		List<CoopRankingEntry> rankings = toEntries(dataList, pageStartRank);

		Integer prevCursor = hasPrev ? pageStartRank : null;
		long nextCursorLong = endIdx + 1;
		boolean hasNext = nextCursorLong < total;

		return new CoopRankingScrollResponse(
			rankings,
			prevCursor, hasPrev,
			hasNext ? (int)nextCursorLong : null,
			hasNext);
	}

	@Override
	public void registerCoopRanking(CoopRankingData data) {
		LocalDate now = LocalDate.now(KOREA_ZONE_ID);
		String week = WeekUtil.getWeek(now);

		coopRankingRedisRepository.register(week, data);
		log.info("[coop-ranking][register] week={}, coopResultId={}, elapsedTime={}",
			week, data.coopResultId(), data.elapsedTime());
	}

	// ── private helper methods ──────────────────────────────────────────────────

	private List<CoopRankingData> lexStringsToDataList(String week, List<String> lexStrings) {
		if (lexStrings.isEmpty()) {
			return List.of();
		}
		List<String> coopResultIds = lexStrings.stream()
			.map(RankingKeyUtil::parseCoopResultIdFromLexString)
			.toList();
		return coopRankingRedisRepository.getDataBatch(week, coopResultIds);
	}

	private List<CoopRankingEntry> toEntries(List<CoopRankingData> dataList, int startRank) {
		if (dataList.isEmpty()) {
			return List.of();
		}

		// null 항목 제외하고 닉네임 조회 (null은 orphan 엔트리)
		List<UUID> allMemberIds = dataList.stream()
			.filter(Objects::nonNull)
			.flatMap(d -> d.memberIds().stream())
			.map(UUID::fromString)
			.distinct()
			.toList();

		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(allMemberIds);

		// i를 ZSet 위치 기준으로 유지해 rank = startRank + i가 실제 순위와 일치하도록 보존
		List<CoopRankingEntry> result = new ArrayList<>(dataList.size());
		for (int i = 0; i < dataList.size(); i++) {
			CoopRankingData data = dataList.get(i);
			if (data == null) {
				log.warn("[coop-ranking] orphan entry at rank {}, skipping", startRank + i);
				continue;
			}
			result.add(toEntryWithNicknames(data, startRank + i, nicknameMap));
		}
		return result;
	}

	private CoopRankingEntry toEntry(CoopRankingData data, int rank) {
		List<UUID> memberUuids = data.memberIds().stream()
			.map(UUID::fromString)
			.toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);
		return toEntryWithNicknames(data, rank, nicknameMap);
	}

	private CoopRankingEntry toEntryWithNicknames(CoopRankingData data, int rank, Map<UUID, String> nicknameMap) {
		// members 목록 생성 (닉네임 가나다순 정렬)
		List<CoopRankingMemberDto> members = data.memberIds().stream()
			.map(id -> {
				UUID uuid = UUID.fromString(id);
				String nickname = nicknameMap.getOrDefault(uuid, "[Unknown]");
				return new CoopRankingMemberDto(uuid, nickname);
			})
			.sorted((a, b) -> KOREAN_COLLATOR.compare(a.nickname(), b.nickname()))
			.collect(Collectors.toList());

		return new CoopRankingEntry(
			rank,
			data.teamName(),
			data.mapName(),
			data.difficulty(),
			data.elapsedTime(),
			data.totalWrongTypeCount(),
			data.totalWrongOrderCount(),
			members);
	}
}
