package com.gitcat.letsgitit.domain.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
	}

	@Test
	void 초기_랭킹_조회_시_이번주_기록이_없으면_myRank와_around가_null과_빈_리스트로_반환된다() {
		// given
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
		given(singleRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
		given(singleRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(null);
		given(singleRankingRedisRepository.getScore(anyString(), eq(memberId))).willReturn(null);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking(Difficulty.NORMAL, 20, memberId);

		// then
		assertThat(response.myRank()).isNull();
		assertThat(response.around()).isEmpty();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.hasNext()).isFalse();
	}

	@Test
	void 초기_랭킹_조회_시_내가_1위면_around_시작이_1위부터다() {
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
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking(Difficulty.NORMAL, 20, memberId);

		// then
		assertThat(response.around().get(0).rank()).isEqualTo(1);
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
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking(Difficulty.NORMAL, 20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
	}

	// ───────────────────────────────────────────
	// getSingleRankingScroll — 무한 스크롤
	// ───────────────────────────────────────────

	@Test
	void 스크롤_조회_시_cursor_이후_size개를_반환한다() {
		// given — cursor=44, size=20
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 6900),
			new RankEntry(UUID.randomUUID().toString(), 6800));
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(200L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(44L), eq(63L))).willReturn(raw);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScroll(Difficulty.NORMAL, 44, 20,
			memberId);

		// then
		assertThat(response.rankings()).hasSize(2);
		assertThat(response.rankings().get(0).rank()).isEqualTo(45);
		assertThat(response.rankings().get(1).rank()).isEqualTo(46);
	}

	@Test
	void 스크롤_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — 전체 50명, cursor=45 → 남은 5개
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 500),
			new RankEntry(UUID.randomUUID().toString(), 400),
			new RankEntry(UUID.randomUUID().toString(), 300),
			new RankEntry(UUID.randomUUID().toString(), 200),
			new RankEntry(UUID.randomUUID().toString(), 100));
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(45L), eq(64L))).willReturn(raw);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScroll(Difficulty.NORMAL, 45, 20,
			memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.rankings()).hasSize(5);
	}

	@Test
	void 스크롤_조회_시_다음_페이지가_있으면_nextCursor가_반환된다() {
		// given — 전체 100명, cursor=0, size=20
		List<RankEntry> raw = new java.util.ArrayList<>();
		for (int i = 0; i < 20; i++) {
			raw.add(new RankEntry(UUID.randomUUID().toString(), 9000 - i * 100));
		}
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(19L))).willReturn(raw);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScroll(Difficulty.NORMAL, 0, 20,
			memberId);

		// then
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(20);
	}

	// ───────────────────────────────────────────
	// getSingleRankingHistory — 과거 주 초기 응답
	// ───────────────────────────────────────────

	@Test
	void 과거_랭킹_초기_조회_시_top3와_내_순위와_주변_순위를_반환한다() {
		// given
		UUID id1 = UUID.randomUUID();
		List<SingleRanking> top3 = List.of(
			SingleRanking.of(id1, Difficulty.NORMAL, 9800, 1, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 9200, 2, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 8700, 3, "2025-04-3"));

		SingleRanking myEntity = SingleRanking.of(memberId, Difficulty.NORMAL, 7200, 42, "2025-04-3");

		List<SingleRanking> around = List.of(
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7400, 40, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7300, 41, "2025-04-3"),
			SingleRanking.of(memberId, Difficulty.NORMAL, 7200, 42, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7100, 43, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 7000, 44, "2025-04-3"));

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
		assertThat(response.nextCursor()).isNull();
		assertThat(response.hasNext()).isFalse();
	}

	@Test
	void 과거_랭킹_초기_조회_시_내가_1위면_around_시작이_1위부터다() {
		// given — aroundMinRank = max(1, 1-2) = 1
		SingleRanking myEntity = SingleRanking.of(memberId, Difficulty.NORMAL, 9800, 1, "2025-04-3");

		List<SingleRanking> around = List.of(
			SingleRanking.of(memberId, Difficulty.NORMAL, 9800, 1, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 9200, 2, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 8700, 3, "2025-04-3"));

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
	}

	@Test
	void 과거_랭킹_초기_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — 전체 50명, 내 rank=50 → aroundMaxRank=50=total → hasNext=false
		SingleRanking myEntity = SingleRanking.of(memberId, Difficulty.NORMAL, 1000, 50, "2025-04-3");

		List<SingleRanking> around = List.of(
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 1200, 48, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 1100, 49, "2025-04-3"),
			SingleRanking.of(memberId, Difficulty.NORMAL, 1000, 50, "2025-04-3"));

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
	}

	// ───────────────────────────────────────────
	// getSingleRankingHistoryScroll — 과거 주 스크롤
	// ───────────────────────────────────────────

	@Test
	void 과거_랭킹_스크롤_조회_시_cursor_이후_항목을_반환한다() {
		// given — cursor=44, size=1 → findScrollResult(size+1=2) → 2개 반환 → hasNext=true, page=첫 1개
		UUID user5Id = UUID.randomUUID();
		List<SingleRanking> raw = List.of(
			SingleRanking.of(user5Id, Difficulty.NORMAL, 6900, 45, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 6800, 46, "2025-04-3"));

		given(singleRankingRepository.findScrollResult(any(), anyString(), eq(44), eq(2))).willReturn(raw);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(user5Id, "user5"));

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScroll(Difficulty.NORMAL,
			2025, 4, 3, 44, 1, memberId);

		// then
		assertThat(response.rankings()).hasSize(1);
		assertThat(response.rankings().get(0).rank()).isEqualTo(45);
		assertThat(response.rankings().get(0).nickname()).isEqualTo("user5");
		assertThat(response.nextCursor()).isEqualTo(45);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 과거_랭킹_스크롤_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — cursor=48, size=20 → findScrollResult(size+1=21) → 2개 반환 → 2 < 20 → hasNext=false
		List<SingleRanking> raw = List.of(
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 200, 49, "2025-04-3"),
			SingleRanking.of(UUID.randomUUID(), Difficulty.NORMAL, 100, 50, "2025-04-3"));

		given(singleRankingRepository.findScrollResult(any(), anyString(), eq(48), eq(21))).willReturn(raw);
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScroll(Difficulty.NORMAL,
			2025, 4, 3, 48, 20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.rankings()).hasSize(2);
	}

	@Test
	void 과거_랭킹_스크롤_조회_시_결과가_없으면_빈_응답을_반환한다() {
		// given
		given(singleRankingRepository.findScrollResult(any(), anyString(), anyInt(), anyInt()))
			.willReturn(List.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingHistoryScroll(Difficulty.NORMAL,
			2025, 4, 3, 99, 20, memberId);

		// then
		assertThat(response.rankings()).isEmpty();
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
	}
}
