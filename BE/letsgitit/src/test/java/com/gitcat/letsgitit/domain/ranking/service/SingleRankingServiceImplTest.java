package com.gitcat.letsgitit.domain.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.*;
import static org.mockito.BDDMockito.given;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRepository;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.global.enums.Difficulty;

@ExtendWith(MockitoExtension.class)
class SingleRankingServiceImplTest {

	@Mock
	private SingleRankingRedisRepository singleRankingRedisRepository;

	@Mock
	private SingleRankingRepository singleRankingRepository;

	@Mock
	private MemberService memberService;

	@InjectMocks
	private SingleRankingServiceImpl singleRankingService;

	private UUID memberId;

	@BeforeEach
	void setUp() {
		memberId = UUID.randomUUID();
	}

	// ───────────────────────────────────────────
	// getSingleRanking — 초기 응답
	// ───────────────────────────────────────────

	@Test
	void 초기_랭킹_조회_시_top3와_내_순위와_주변_순위를_반환한다() {
		// given
		List<RankEntry> top3Entries = List.of(
			new RankEntry(UUID.randomUUID().toString(), 9800),
			new RankEntry(UUID.randomUUID().toString(), 9200),
			new RankEntry(UUID.randomUUID().toString(), 8700));
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
		given(singleRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(top3Entries);
		given(singleRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(41L);
		given(singleRankingRedisRepository.getScore(anyString(), eq(memberId))).willReturn(7200.0);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(39L), eq(43L)))
			.willReturn(List.of(
				new RankEntry(UUID.randomUUID().toString(), 7400),
				new RankEntry(UUID.randomUUID().toString(), 7300),
				new RankEntry(memberId.toString(), 7200),
				new RankEntry(UUID.randomUUID().toString(), 7100),
				new RankEntry(UUID.randomUUID().toString(), 7000)));
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(singleRankingRedisRepository.getGrade(anyString(), any())).willReturn(null);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking(Difficulty.NORMAL, 20, memberId);

		// then
		assertThat(response.top3()).hasSize(3);
		assertThat(response.top3().get(0).rank()).isEqualTo(1);
		assertThat(response.top3().get(0).score()).isEqualTo(9800);

		assertThat(response.myRank()).isNotNull();
		assertThat(response.myRank().rank()).isEqualTo(42);
		assertThat(response.myRank().nickname()).isEqualTo("dobby");
		assertThat(response.myRank().score()).isEqualTo(7200);

		assertThat(response.around()).hasSize(5);
		assertThat(response.around().get(0).rank()).isEqualTo(40);

		// aroundStart=39 > 0 → hasPrev=true, prevCursor=40
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(40);
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(44);
	}

	@Test
	void 초기_랭킹_조회_시_이번주_기록이_없으면_myRank가_null이고_top3이후_스크롤_가능하다() {
		// given
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
		given(singleRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
		given(singleRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(null);
		given(singleRankingRedisRepository.getScore(anyString(), eq(memberId))).willReturn(null);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking(Difficulty.NORMAL, 20, memberId);

		// then
		assertThat(response.myRank()).isNull();
		assertThat(response.around()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
		assertThat(response.nextCursor()).isEqualTo(3);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 초기_랭킹_조회_시_내가_1위면_around_시작이_1위부터이고_prevCursor가_null이다() {
		// given
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(10L);
		given(singleRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
		given(singleRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(0L);
		given(singleRankingRedisRepository.getScore(anyString(), eq(memberId))).willReturn(9800.0);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(2L)))
			.willReturn(List.of(
				new RankEntry(memberId.toString(), 9800),
				new RankEntry(UUID.randomUUID().toString(), 9200),
				new RankEntry(UUID.randomUUID().toString(), 8700)));
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(singleRankingRedisRepository.getGrade(anyString(), any())).willReturn(null);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking(Difficulty.NORMAL, 20, memberId);

		// then
		assertThat(response.around().get(0).rank()).isEqualTo(1);
		// aroundStart=0 → hasPrev=false
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
	}

	@Test
	void 초기_랭킹_조회_시_다음_페이지가_없으면_nextCursor가_null이다() {
		// given — 전체 5명, 내가 5위(꼴찌)
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(5L);
		given(singleRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
		given(singleRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(4L);
		given(singleRankingRedisRepository.getScore(anyString(), eq(memberId))).willReturn(1000.0);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(2L), eq(4L)))
			.willReturn(List.of(
				new RankEntry(UUID.randomUUID().toString(), 3000),
				new RankEntry(UUID.randomUUID().toString(), 2000),
				new RankEntry(memberId.toString(), 1000)));
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(singleRankingRedisRepository.getGrade(anyString(), any())).willReturn(null);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking(Difficulty.NORMAL, 20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		// aroundStart=2 > 0 → hasPrev=true, prevCursor=3
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(3);
	}

	// ───────────────────────────────────────────
	// getSingleRankingScrollAfter — 아래 방향 스크롤
	// ───────────────────────────────────────────

	@Test
	void 아래_스크롤_조회_시_afterRank_이후_size개를_반환한다() {
		// given — afterRank=44, size=20 → start=44, end=63
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 6900),
			new RankEntry(UUID.randomUUID().toString(), 6800));
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(200L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(44L), eq(63L))).willReturn(raw);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScrollAfter(Difficulty.NORMAL, 44,
			20, memberId);

		// then
		assertThat(response.rankings()).hasSize(2);
		assertThat(response.rankings().get(0).rank()).isEqualTo(45);
		assertThat(response.rankings().get(1).rank()).isEqualTo(46);
		// prevCursor = start+1 = 45, hasPrev = afterRank > 0
		assertThat(response.prevCursor()).isEqualTo(45);
		assertThat(response.hasPrev()).isTrue();
	}

	@Test
	void 아래_스크롤_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — 전체 50명, afterRank=45 → 남은 5개
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 500),
			new RankEntry(UUID.randomUUID().toString(), 400),
			new RankEntry(UUID.randomUUID().toString(), 300),
			new RankEntry(UUID.randomUUID().toString(), 200),
			new RankEntry(UUID.randomUUID().toString(), 100));
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(45L), eq(64L))).willReturn(raw);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScrollAfter(Difficulty.NORMAL, 45,
			20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.rankings()).hasSize(5);
		assertThat(response.prevCursor()).isEqualTo(46);
		assertThat(response.hasPrev()).isTrue();
	}

	@Test
	void 아래_스크롤_조회_시_다음_페이지가_있으면_nextCursor가_반환된다() {
		// given — 전체 100명, afterRank=0, size=20 → start=0, end=19
		List<RankEntry> raw = new java.util.ArrayList<>();
		for (int i = 0; i < 20; i++) {
			raw.add(new RankEntry(UUID.randomUUID().toString(), 9000 - i * 100));
		}
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(19L))).willReturn(raw);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScrollAfter(Difficulty.NORMAL, 0,
			20, memberId);

		// then
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(20);
		// afterRank=0 → hasPrev=false (0 이하는 초기 진입)
		assertThat(response.hasPrev()).isFalse();
	}

	// ───────────────────────────────────────────
	// getSingleRankingScrollBefore — 위 방향 스크롤
	// ───────────────────────────────────────────

	@Test
	void 위_스크롤_조회_시_beforeRank_이전_항목을_반환한다() {
		// given — beforeRank=10, size=5
		// endIdx=8, startIdx=max(0,8-5)=3 → ZREVRANGE [3,8] → 6항목 (size+1)
		// hasPrev=true(startIdx=3>0), page=subList(1) → 5항목 [r5~r9]
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 9500), // rank 4
			new RankEntry(UUID.randomUUID().toString(), 9400), // rank 5
			new RankEntry(UUID.randomUUID().toString(), 9300), // rank 6
			new RankEntry(UUID.randomUUID().toString(), 9200), // rank 7
			new RankEntry(UUID.randomUUID().toString(), 9100), // rank 8
			new RankEntry(UUID.randomUUID().toString(), 9000) // rank 9
		);
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(3L), eq(8L))).willReturn(raw);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScrollBefore(Difficulty.NORMAL, 10,
			5, memberId);

		// then
		assertThat(response.rankings()).hasSize(5);
		assertThat(response.rankings().get(0).rank()).isEqualTo(5);
		assertThat(response.rankings().get(4).rank()).isEqualTo(9);
		// hasPrev=true, prevCursor=startIdx+2=5
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(5);
		// nextCursor=endIdx+1=9, hasNext=9<100
		assertThat(response.nextCursor()).isEqualTo(9);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 위_스크롤_조회_시_더_이상_위_항목이_없으면_hasPrev가_false이다() {
		// given — beforeRank=4, size=5
		// endIdx=2, startIdx=max(0,2-5)=0 → ZREVRANGE [0,2] → 3항목
		// hasPrev=false(startIdx=0), page=raw → [r1,r2,r3]
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 9800), // rank 1
			new RankEntry(UUID.randomUUID().toString(), 9700), // rank 2
			new RankEntry(UUID.randomUUID().toString(), 9600) // rank 3
		);
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(2L))).willReturn(raw);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScrollBefore(Difficulty.NORMAL, 4,
			5, memberId);

		// then
		assertThat(response.rankings()).hasSize(3);
		assertThat(response.rankings().get(0).rank()).isEqualTo(1);
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
		assertThat(response.nextCursor()).isEqualTo(3);
	}

	@Test
	void 위_스크롤_조회_시_beforeRank가_1이면_빈_응답을_반환한다() {
		// given — beforeRank=1 → endIdx = min(99,-1) = -1 → 즉시 빈 응답
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScrollBefore(Difficulty.NORMAL, 1,
			5, memberId);

		// then
		assertThat(response.rankings()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.hasNext()).isFalse();
	}

	@Test
	void 위_스크롤_조회_시_stale_cursor가_total을_초과해도_500이_발생하지_않는다() {
		// given — beforeRank=999, size=5, total=10
		// endIdx = min(9, 997) = 9, startIdx = max(0, 9-5) = 4
		// raw = ZREVRANGE [4,9] → 6항목 [r5,r6,r7,r8,r9,r10]
		// hasPrev = raw.size()>size = 6>5 = true, page = [r6~r10]
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 9600), // rank 5
			new RankEntry(UUID.randomUUID().toString(), 9500), // rank 6
			new RankEntry(UUID.randomUUID().toString(), 9400), // rank 7
			new RankEntry(UUID.randomUUID().toString(), 9300), // rank 8
			new RankEntry(UUID.randomUUID().toString(), 9200), // rank 9
			new RankEntry(UUID.randomUUID().toString(), 9100) // rank 10
		);
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(10L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(4L), eq(9L))).willReturn(raw);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when — stale cursor (beforeRank=999)지만 클램핑으로 정상 처리
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScrollBefore(Difficulty.NORMAL, 999,
			5, memberId);

		// then
		assertThat(response.rankings()).hasSize(5);
		assertThat(response.rankings().get(0).rank()).isEqualTo(6);
		assertThat(response.rankings().get(4).rank()).isEqualTo(10);
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(6); // startIdx+2 = 4+2 = 6
		// nextCursor = endIdx+1 = 10, hasNext = 10 < 10 = false (마지막 페이지)
		assertThat(response.nextCursor()).isEqualTo(10);
		assertThat(response.hasNext()).isFalse();
	}

	// ───────────────────────────────────────────
	// getSingleRankingHistory — 과거 주 초기 응답
	// ───────────────────────────────────────────

	@Test
	void 과거_랭킹_초기_조회_시_top3와_내_순위와_주변_순위를_반환한다() {
		// given
		UUID id1 = UUID.randomUUID();
		List<SingleRanking> top3 = List.of(
			SingleRanking.of(id1, Difficulty.NORMAL, 9800, 1, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 9200, 2, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 8700, 3, null, "2025-04-3"));

		SingleRanking myEntity = SingleRanking.of(memberId, Difficulty.NORMAL, 7200, 42, null, "2025-04-3");

		List<SingleRanking> around = List.of(
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7400, 40, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7300, 41, null, "2025-04-3"),
			SingleRanking.of(memberId, Difficulty.NORMAL, 7200, 42, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7100, 43, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7000, 44, null, "2025-04-3"));

		given(singleRankingRepository.findTop3ByDifficultyAndWeek(any(), anyString())).willReturn(top3);
		given(singleRankingRepository.countByDifficultyAndWeek(any(), anyString())).willReturn(100L);
		given(singleRankingRepository.findByMemberIdAndDifficultyAndWeek(eq(memberId), any(), anyString()))
			.willReturn(Optional.of(myEntity));
		given(singleRankingRepository.findAroundByDifficultyAndWeekAndRank(any(), anyString(), eq(40), eq(44)))
			.willReturn(around);
		given(memberService.getNicknamesByIds(anyList()))
			.willReturn(Map.of(id1, "gitmaster", memberId, "dobby"));

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRankingHistory(Difficulty.NORMAL, 2025, 4,
			3, 20, memberId);

		// then
		assertThat(response.top3()).hasSize(3);
		assertThat(response.top3().get(0).rank()).isEqualTo(1);
		assertThat(response.top3().get(0).nickname()).isEqualTo("gitmaster");

		assertThat(response.myRank()).isNotNull();
		assertThat(response.myRank().rank()).isEqualTo(42);
		assertThat(response.myRank().nickname()).isEqualTo("dobby");
		assertThat(response.myRank().score()).isEqualTo(7200);

		assertThat(response.around()).hasSize(5);
		assertThat(response.around().get(0).rank()).isEqualTo(40);
		// aroundMinRank=40 > 1 → hasPrev=true, prevCursor=40
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(40);
		assertThat(response.nextCursor()).isEqualTo(44);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 과거_랭킹_초기_조회_시_해당_주_기록이_없으면_myRank가_null이고_around가_빈_리스트다() {
		// given
		given(singleRankingRepository.findTop3ByDifficultyAndWeek(any(), anyString())).willReturn(List.of());
		given(singleRankingRepository.countByDifficultyAndWeek(any(), anyString())).willReturn(0L);
		given(singleRankingRepository.findByMemberIdAndDifficultyAndWeek(eq(memberId), any(), anyString()))
			.willReturn(Optional.empty());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRankingHistory(Difficulty.NORMAL, 2025, 4,
			3, 20, memberId);

		// then
		assertThat(response.myRank()).isNull();
		assertThat(response.around()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.hasNext()).isFalse();
	}

	@Test
	void 과거_랭킹_초기_조회_시_내가_1위면_around_시작이_1위부터이고_prevCursor가_null이다() {
		// given — aroundMinRank = max(1, 1-2) = 1 → hasPrev=false
		SingleRanking myEntity = SingleRanking.of(memberId, Difficulty.NORMAL, 9800, 1, null, "2025-04-3");

		List<SingleRanking> around = List.of(
			SingleRanking.of(memberId, Difficulty.NORMAL, 9800, 1, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 9200, 2, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 8700, 3, null, "2025-04-3"));

		given(singleRankingRepository.findTop3ByDifficultyAndWeek(any(), anyString())).willReturn(List.of());
		given(singleRankingRepository.countByDifficultyAndWeek(any(), anyString())).willReturn(50L);
		given(singleRankingRepository.findByMemberIdAndDifficultyAndWeek(eq(memberId), any(), anyString()))
			.willReturn(Optional.of(myEntity));
		given(singleRankingRepository.findAroundByDifficultyAndWeekAndRank(any(), anyString(), eq(1), eq(3)))
			.willReturn(around);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRankingHistory(Difficulty.NORMAL, 2025, 4,
			3, 20, memberId);

		// then
		assertThat(response.around().get(0).rank()).isEqualTo(1);
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
	}

	@Test
	void 과거_랭킹_초기_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — 전체 50명, 내 rank=50 → aroundMaxRank=50=total → hasNext=false
		SingleRanking myEntity = SingleRanking.of(memberId, Difficulty.NORMAL, 1000, 50, null, "2025-04-3");

		List<SingleRanking> around = List.of(
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 1200, 48, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 1100, 49, null, "2025-04-3"),
			SingleRanking.of(memberId, Difficulty.NORMAL, 1000, 50, null, "2025-04-3"));

		given(singleRankingRepository.findTop3ByDifficultyAndWeek(any(), anyString())).willReturn(List.of());
		given(singleRankingRepository.countByDifficultyAndWeek(any(), anyString())).willReturn(50L);
		given(singleRankingRepository.findByMemberIdAndDifficultyAndWeek(eq(memberId), any(), anyString()))
			.willReturn(Optional.of(myEntity));
		given(singleRankingRepository.findAroundByDifficultyAndWeekAndRank(any(), anyString(), eq(48), eq(50)))
			.willReturn(around);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRankingHistory(Difficulty.NORMAL, 2025, 4,
			3, 20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		// aroundMinRank=48 > 1 → hasPrev=true, prevCursor=48
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(48);
	}

	// ───────────────────────────────────────────
	// getSingleRankingHistoryScrollAfter — 과거 주 아래 스크롤
	// ───────────────────────────────────────────

	@Test
	void 과거_랭킹_아래_스크롤_조회_시_afterRank_이후_항목을_반환한다() {
		// given — afterRank=44, size=1 → findScrollResult(size+1=2) → 2개 반환 → hasNext=true, page=첫 1개
		UUID user5Id = UUID.randomUUID();
		List<SingleRanking> raw = List.of(
			SingleRanking.of(user5Id, Difficulty.NORMAL, 6900, 45, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 6800, 46, null, "2025-04-3"));

		given(singleRankingRepository.findScrollResult(any(), anyString(), eq(44), eq(2))).willReturn(raw);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(user5Id, "user5"));

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScrollAfter(
			Difficulty.NORMAL,
			2025, 4, 3, 44, 1, memberId);

		// then
		assertThat(response.rankings()).hasSize(1);
		assertThat(response.rankings().get(0).rank()).isEqualTo(45);
		assertThat(response.rankings().get(0).nickname()).isEqualTo("user5");
		assertThat(response.nextCursor()).isEqualTo(45);
		assertThat(response.hasNext()).isTrue();
		// prevCursor = first rank of page = 45, hasPrev = afterRank > 0
		assertThat(response.prevCursor()).isEqualTo(45);
		assertThat(response.hasPrev()).isTrue();
	}

	@Test
	void 과거_랭킹_아래_스크롤_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — afterRank=48, size=20 → findScrollResult(size+1=21) → 2개 반환 → 2 < 20 → hasNext=false
		List<SingleRanking> raw = List.of(
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 200, 49, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 100, 50, null, "2025-04-3"));

		given(singleRankingRepository.findScrollResult(any(), anyString(), eq(48), eq(21))).willReturn(raw);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScrollAfter(
			Difficulty.NORMAL,
			2025, 4, 3, 48, 20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.rankings()).hasSize(2);
		// prevCursor = 49 (first rank), hasPrev = true
		assertThat(response.prevCursor()).isEqualTo(49);
		assertThat(response.hasPrev()).isTrue();
	}

	@Test
	void 과거_랭킹_아래_스크롤_조회_시_결과가_없으면_빈_응답을_반환한다() {
		// given
		given(singleRankingRepository.findScrollResult(any(), anyString(), anyInt(), anyInt()))
			.willReturn(List.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScrollAfter(
			Difficulty.NORMAL,
			2025, 4, 3, 99, 20, memberId);

		// then
		assertThat(response.rankings()).isEmpty();
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
	}

	// ───────────────────────────────────────────
	// getSingleRankingHistoryScrollBefore — 과거 주 위 스크롤
	// ───────────────────────────────────────────

	@Test
	void 과거_랭킹_위_스크롤_조회_시_beforeRank_이전_항목을_반환한다() {
		// given — beforeRank=10, size=5
		// findScrollResultBefore: rank < 10 DESC LIMIT 6 → [r9,r8,r7,r6,r5,r4] (6항목)
		// hasPrev=true(6>5), page=subList(0,5)=[r9,r8,r7,r6,r5] → reversed=[r5,r6,r7,r8,r9]
		UUID id5 = UUID.randomUUID(), id6 = UUID.randomUUID(), id7 = UUID.randomUUID(),
			id8 = UUID.randomUUID(), id9 = UUID.randomUUID(), id4 = UUID.randomUUID();
		List<SingleRanking> raw = List.of(
			SingleRanking.of(id9, Difficulty.NORMAL, 9100, 9, null, "2025-04-3"),
			SingleRanking.of(id8, Difficulty.NORMAL, 9200, 8, null, "2025-04-3"),
			SingleRanking.of(id7, Difficulty.NORMAL, 9300, 7, null, "2025-04-3"),
			SingleRanking.of(id6, Difficulty.NORMAL, 9400, 6, null, "2025-04-3"),
			SingleRanking.of(id5, Difficulty.NORMAL, 9500, 5, null, "2025-04-3"),
			SingleRanking.of(id4, Difficulty.NORMAL, 9600, 4, null, "2025-04-3"));

		given(singleRankingRepository.findScrollResultBefore(any(), anyString(), eq(10), eq(5))).willReturn(raw);
		given(singleRankingRepository.countByDifficultyAndWeek(any(), anyString())).willReturn(20L);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScrollBefore(
			Difficulty.NORMAL, 2025, 4, 3, 10, 5, memberId);

		// then — reversed: [r5, r6, r7, r8, r9]
		assertThat(response.rankings()).hasSize(5);
		assertThat(response.rankings().get(0).rank()).isEqualTo(5);
		assertThat(response.rankings().get(4).rank()).isEqualTo(9);
		// hasPrev=true, prevCursor=5 (first rank after reversal)
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(5);
		// nextCursor=9 (last rank), hasNext = 9 < 20
		assertThat(response.nextCursor()).isEqualTo(9);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 과거_랭킹_위_스크롤_조회_시_더_이상_위_항목이_없으면_hasPrev가_false이다() {
		// given — beforeRank=4, size=5
		// findScrollResultBefore: rank < 4 DESC LIMIT 6 → [r3,r2,r1] (3항목)
		// hasPrev=false(3<=5), page=[r3,r2,r1] → reversed=[r1,r2,r3]
		List<SingleRanking> raw = List.of(
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 9700, 3, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 9800, 2, null, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 9900, 1, null, "2025-04-3"));

		given(singleRankingRepository.findScrollResultBefore(any(), anyString(), eq(4), eq(5))).willReturn(raw);
		given(singleRankingRepository.countByDifficultyAndWeek(any(), anyString())).willReturn(20L);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScrollBefore(
			Difficulty.NORMAL, 2025, 4, 3, 4, 5, memberId);

		// then
		assertThat(response.rankings()).hasSize(3);
		assertThat(response.rankings().get(0).rank()).isEqualTo(1);
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
		assertThat(response.nextCursor()).isEqualTo(3);
	}

	@Test
	void 과거_랭킹_위_스크롤_조회_시_결과가_없으면_빈_응답을_반환한다() {
		// given
		given(singleRankingRepository.findScrollResultBefore(any(), anyString(), anyInt(), anyInt()))
			.willReturn(List.of());
		given(singleRankingRepository.countByDifficultyAndWeek(any(), anyString())).willReturn(0L);

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScrollBefore(
			Difficulty.NORMAL, 2025, 4, 3, 1, 5, memberId);

		// then
		assertThat(response.rankings()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.hasNext()).isFalse();
	}

	// ───────────────────────────────────────────
	// 점수 업데이트 / 현재 주 점수 조회
	// ───────────────────────────────────────────

	@Test
	void 점수_갱신_후_현재_순위를_반환한다() {
		// given
		given(singleRankingRedisRepository.getRankZeroBased(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(4L);

		// when
		int rank = singleRankingService.updateSingleScore(Difficulty.NORMAL, memberId, 7200, Grade.A);

		// then
		assertThat(rank).isEqualTo(5);
		then(singleRankingRedisRepository).should()
			.saveScoreAndGrade(anyString(), anyString(), eq(memberId), eq(7200.0), eq("A"));
	}

	@Test
	void 이번주_내_점수를_조회한다() {
		// given
		given(singleRankingRedisRepository.getScore(anyString(), eq(memberId))).willReturn(7200.0);

		// when
		Integer score = singleRankingService.getCurrentWeekScore(Difficulty.NORMAL, memberId);

		// then
		assertThat(score).isEqualTo(7200);
	}

	@Test
	void 이번주_내_점수가_없으면_null을_반환한다() {
		// given
		given(singleRankingRedisRepository.getScore(anyString(), eq(memberId))).willReturn(null);

		// when
		Integer score = singleRankingService.getCurrentWeekScore(Difficulty.HARD, memberId);

		// then
		assertThat(score).isNull();
	}

	@Test
	void 순위가_없으면_0을_반환한다() {
		// given
		given(singleRankingRedisRepository.getRankZeroBased(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(null);

		// when
		int rank = singleRankingService.updateSingleScore(Difficulty.HARD, memberId, 5000, Grade.B);

		// then
		assertThat(rank).isZero();
	}
}
