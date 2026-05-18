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
	private final CoopRankingRepository coopRankingRepository;
	private final CoopResultMemberRepository coopResultMemberRepository;

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

	/**
	 * 과거주 협력 랭킹 초기 진입 조회
	 * - top3: 화면 상단 3팀 고정 노출
	 * - myRank: 로그인 사용자가 속한 팀 중 해당 주차 최고 순위 팀 (없으면 null)
	 * - around: 내 팀 순위 기준 ±2 범위
	 * - members: 각 팀의 팀원 목록, 닉네임 가나다순 정렬
	 */
	@Override
	@Transactional(readOnly = true)
	public CoopRankingInitialResponse getCoopRankingHistory(int year, int month, int week, int size, UUID memberId) {
		// year/month/week → DB 저장 형식 "YYYY-MM-W" 변환 (예: "2025-04-3")
		String weekKey = WeekUtil.getWeek(year, month, week);

		List<CoopRanking> top3Raw = coopRankingRepository.findTop3ByWeek(weekKey);
		long total = coopRankingRepository.countByWeek(weekKey);

		// coop_ranking ↔ coop_result_member 조인으로 사용자가 속한 팀의 최고 순위 조회
		CoopRanking myRankEntity = coopRankingRepository
			.findMyCoopRankingByMemberIdAndWeek(memberId, weekKey)
			.orElse(null);

		if (myRankEntity == null) {
			// 해당 주차에 참여 기록이 없으면 top3 + 첫 스크롤 커서만 반환
			Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(top3Raw);
			Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());
			List<CoopRankingEntry> top3 = toEntries(top3Raw, memberMap, nicknameMap);

			boolean hasNext = total > 3;
			return new CoopRankingInitialResponse(
				year, month, week,
				top3,
				null, // myRank 없음
				List.of(), // around 없음
				null, false,
				hasNext ? 3 : null,
				hasNext);
		}

		// around 범위 계산: 내 팀 순위 ±2, 1 미만 및 전체 초과 방지
		int aroundMinRank = Math.max(1, myRankEntity.getRank() - 2);
		int aroundMaxRank = Math.min((int)total, myRankEntity.getRank() + 2);

		List<CoopRanking> aroundRaw = coopRankingRepository.findAroundByWeekAndRank(weekKey, aroundMinRank,
			aroundMaxRank);

		// top3 + around + myRank 의 coopResultId를 한 번에 배치 조회 (N+1 방지)
		List<CoopRanking> allRankings = new ArrayList<>();
		allRankings.addAll(top3Raw);
		allRankings.addAll(aroundRaw);
		if (aroundRaw.stream().noneMatch(r -> r.getCoopResultId().equals(myRankEntity.getCoopResultId()))) {
			// myRankEntity가 around 범위 밖인 경우(경계 근처)에도 멤버 조회 포함
			allRankings.add(myRankEntity);
		}
		Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(allRankings);
		Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());

		List<CoopRankingEntry> top3 = toEntries(top3Raw, memberMap, nicknameMap);
		CoopRankingEntry myRank = toEntry(myRankEntity, memberMap, nicknameMap);
		List<CoopRankingEntry> around = toEntries(aroundRaw, memberMap, nicknameMap);

		// around의 첫 순위가 1이면 위로 더 없음 → prevCursor null
		boolean hasPrev = aroundMinRank > 1;
		Integer prevCursor = hasPrev ? aroundMinRank : null;
		// around의 마지막 순위가 전체 끝이면 아래로 더 없음 → nextCursor null
		boolean hasNext = aroundMaxRank < total;
		Integer nextCursor = hasNext ? aroundMaxRank : null;

		return new CoopRankingInitialResponse(
			year, month, week,
			top3, myRank, around,
			prevCursor, hasPrev,
			nextCursor, hasNext);
	}

	/**
	 * 아래 방향 스크롤: afterRank 초과 데이터를 rank ASC로 조회
	 * - size+1개 fetch로 hasNext 판단
	 */
	@Override
	@Transactional(readOnly = true)
	public CoopRankingScrollResponse getCoopRankingHistoryScrollAfter(int year, int month, int week, int afterRank,
		int size, UUID memberId) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		// size+1개 요청: size개는 현재 페이지, 1개 초과 시 hasNext=true
		List<CoopRanking> raw = coopRankingRepository.findScrollResult(weekKey, afterRank, size + 1);

		if (raw.isEmpty()) {
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasNext = raw.size() > size;
		List<CoopRanking> page = hasNext ? raw.subList(0, size) : raw;

		Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(page);
		Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());
		List<CoopRankingEntry> rankings = toEntries(page, memberMap, nicknameMap);

		boolean hasPrev = afterRank > 0; // afterRank가 0이면 이미 최상단
		Integer prevCursor = hasPrev ? page.get(0).getRank() : null;
		Integer nextCursor = hasNext ? page.get(page.size() - 1).getRank() : null;

		return new CoopRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
	}

	/**
	 * 위 방향 스크롤: beforeRank 미만 데이터를 rank DESC로 조회 후 오름차순 복원
	 * - DSL이 DESC로 반환하므로 Collections.reverse로 오름차순 복원
	 */
	@Override
	@Transactional(readOnly = true)
	public CoopRankingScrollResponse getCoopRankingHistoryScrollBefore(int year, int month, int week, int beforeRank,
		int size, UUID memberId) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		// hasNext 판단을 위해 total 조회 (현재 페이지 마지막 순위와 비교)
		long total = coopRankingRepository.countByWeek(weekKey);

		// DSL에서 rank DESC + size+1 fetch → hasPrev 판단용 1개 초과분 포함
		List<CoopRanking> raw = coopRankingRepository.findScrollResultBefore(weekKey, beforeRank, size);

		if (raw.isEmpty()) {
			return new CoopRankingScrollResponse(List.of(), null, false, null, false);
		}

		boolean hasPrev = raw.size() > size;
		// DSL이 DESC로 반환했으므로 화면 표시를 위해 오름차순(ASC)으로 뒤집기
		List<CoopRanking> page = new ArrayList<>(hasPrev ? raw.subList(0, size) : raw);
		Collections.reverse(page);

		Map<UUID, List<CoopResultMember>> memberMap = fetchMemberMap(page);
		Map<UUID, String> nicknameMap = fetchNicknameMap(memberMap.values());
		List<CoopRankingEntry> rankings = toEntries(page, memberMap, nicknameMap);

		Integer prevCursor = hasPrev ? page.get(0).getRank() : null;
		// 현재 페이지 마지막 순위가 전체 끝 미만이면 아래 방향 데이터 존재
		int lastRank = page.get(page.size() - 1).getRank();
		boolean hasNext = (long)lastRank < total;
		Integer nextCursor = hasNext ? lastRank : null;

		return new CoopRankingScrollResponse(rankings, prevCursor, hasPrev, nextCursor, hasNext);
	}

	// CoopRanking 리스트 → CoopRankingEntry DTO 리스트 변환
	private List<CoopRankingEntry> toEntries(List<CoopRanking> rankings,
		Map<UUID, List<CoopResultMember>> memberMap,
		Map<UUID, String> nicknameMap) {
		return rankings.stream()
			.map(r -> toEntry(r, memberMap, nicknameMap))
			.toList();
	}

	// CoopRanking 단건 → CoopRankingEntry DTO 변환
	// members는 닉네임 가나다순 정렬
	private CoopRankingEntry toEntry(CoopRanking ranking,
		Map<UUID, List<CoopResultMember>> memberMap,
		Map<UUID, String> nicknameMap) {
		List<CoopRankingMemberDto> members = memberMap
			.getOrDefault(ranking.getCoopResultId(), List.of())
			.stream()
			.map(m -> new CoopRankingMemberDto(
				m.getMemberId(),
				nicknameMap.getOrDefault(m.getMemberId(), "[Unknown]")))
			.sorted(Comparator.comparing(CoopRankingMemberDto::nickname))
			.toList();

		return new CoopRankingEntry(
			ranking.getRank(),
			ranking.getTeamName(),
			ranking.getMapName(),
			ranking.getDifficulty(),
			ranking.getElapsedTime(),
			ranking.getTotalWrongTypeCount(),
			ranking.getTotalWrongOrderCount(),
			members);
	}

	// CoopRanking 리스트의 coopResultId로 CoopResultMember를 배치 조회 후 coopResultId 기준으로 그룹핑
	private Map<UUID, List<CoopResultMember>> fetchMemberMap(List<CoopRanking> rankings) {
		List<UUID> coopResultIds = rankings.stream().map(CoopRanking::getCoopResultId).distinct().toList();
		return coopResultMemberRepository.findAllByCoopResultIdIn(coopResultIds)
			.stream()
			.collect(Collectors.groupingBy(CoopResultMember::getCoopResultId));
	}

	// CoopResultMember 컬렉션에서 memberId를 수집해 닉네임 배치 조회
	private Map<UUID, String> fetchNicknameMap(Collection<List<CoopResultMember>> memberLists) {
		List<UUID> memberIds = memberLists.stream()
			.flatMap(List::stream)
			.map(CoopResultMember::getMemberId)
			.distinct()
			.toList();
		return memberService.getNicknamesByIds(memberIds);
	}
}
