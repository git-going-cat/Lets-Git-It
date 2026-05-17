package com.gitcat.letsgitit.domain.ranking.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.ContributionRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.UpdateContributionRankingResult;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

@ExtendWith(MockitoExtension.class)
class ContributionRankingServiceImplTest {

	@Mock
	private ContributionRankingRedisRepository contributionRankingRedisRepository;

	@Mock
	private MemberService memberService;

	@Mock
	private MeterRegistry meterRegistry;

	@Mock
	private Counter counter;

	@InjectMocks
	private ContributionRankingServiceImpl contributionRankingService;

	private UUID memberId;

	@BeforeEach
	void setUp() {
		memberId = UUID.randomUUID();
	}

	// ───────────────────────────────────────────
	// getContributionRanking — 초기 응답
	// ───────────────────────────────────────────

	@Test
	void 초기_랭킹_조회_시_top3와_내_순위와_주변_순위를_반환한다() {
		// given
		UUID top1 = UUID.randomUUID();
		UUID top2 = UUID.randomUUID();
		UUID top3 = UUID.randomUUID();

		List<RankEntry> top3Entries = List.of(
			rankEntry(top1.toString()),
			rankEntry(top2.toString()),
			rankEntry(top3.toString()));

		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
		given(contributionRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(top3Entries);
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList()))
			.willReturn(Map.of(top1, 12000, top2, 11500, top3, 10900));
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList()))
			.willReturn(Map.of(top1, 10, top2, 9, top3, 11));

		given(contributionRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(14L);
		given(contributionRankingRedisRepository.getContribution(anyString(), eq(memberId))).willReturn(8800);
		given(contributionRankingRedisRepository.getPlayCount(anyString(), eq(memberId))).willReturn(10);

		UUID around1 = UUID.randomUUID();
		UUID around2 = UUID.randomUUID();
		UUID around3 = UUID.randomUUID();
		UUID around4 = UUID.randomUUID();
		List<RankEntry> aroundEntries = List.of(
			rankEntry(around1.toString()),
			rankEntry(around2.toString()),
			rankEntry(memberId.toString()),
			rankEntry(around3.toString()),
			rankEntry(around4.toString()));

		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(12L), eq(16L)))
			.willReturn(aroundEntries);

		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(
			top1, "dobby", top2, "alice", top3, "bob",
			around1, "user1", around2, "user2", memberId, "me", around3, "user3", around4, "user4"));

		// when
		ContributionRankingInitialResponse response = contributionRankingService.getContributionRanking(20, memberId);

		// then
		assertThat(response.top3()).hasSize(3);
		assertThat(response.top3().get(0).rank()).isEqualTo(1);
		assertThat(response.top3().get(0).nickname()).isEqualTo("dobby");
		assertThat(response.top3().get(0).contribution()).isEqualTo(12000);
		assertThat(response.top3().get(0).playCount()).isEqualTo(10);

		assertThat(response.myRank()).isNotNull();
		assertThat(response.myRank().rank()).isEqualTo(15);
		assertThat(response.myRank().contribution()).isEqualTo(8800);
		assertThat(response.myRank().playCount()).isEqualTo(10);

		assertThat(response.around()).hasSize(5);
		assertThat(response.around().get(0).rank()).isEqualTo(13);

		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(13);
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(17);
	}

	@Test
	void 초기_랭킹_조회_시_이번주_기록이_없으면_myRank가_null이다() {
		// given
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
		given(contributionRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
		given(contributionRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(null);
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList())).willReturn(Map.of());
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		ContributionRankingInitialResponse response = contributionRankingService.getContributionRanking(20, memberId);

		// then
		assertThat(response.myRank()).isNull();
		assertThat(response.around()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
		assertThat(response.nextCursor()).isEqualTo(3);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 초기_랭킹_조회_시_내가_1위면_prevCursor가_null이다() {
		// given
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(10L);
		given(contributionRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
		given(contributionRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(0L);
		given(contributionRankingRedisRepository.getContribution(anyString(), eq(memberId))).willReturn(9800);
		given(contributionRankingRedisRepository.getPlayCount(anyString(), eq(memberId))).willReturn(5);
		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(2L)))
			.willReturn(List.of(
				rankEntry(memberId.toString()),
				rankEntry(UUID.randomUUID().toString()),
				rankEntry(UUID.randomUUID().toString())));
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList())).willReturn(Map.of());
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		ContributionRankingInitialResponse response = contributionRankingService.getContributionRanking(20, memberId);

		// then
		assertThat(response.around().get(0).rank()).isEqualTo(1);
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
	}

	@Test
	void 초기_랭킹_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — 전체 5명, 내가 5위(꼴찌)
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(5L);
		given(contributionRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
		given(contributionRankingRedisRepository.getRankZeroBased(anyString(), eq(memberId))).willReturn(4L);
		given(contributionRankingRedisRepository.getContribution(anyString(), eq(memberId))).willReturn(1000);
		given(contributionRankingRedisRepository.getPlayCount(anyString(), eq(memberId))).willReturn(1);
		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(2L), eq(4L)))
			.willReturn(List.of(
				rankEntry(UUID.randomUUID().toString()),
				rankEntry(UUID.randomUUID().toString()),
				rankEntry(memberId.toString())));
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList())).willReturn(Map.of());
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		ContributionRankingInitialResponse response = contributionRankingService.getContributionRanking(20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(3);
	}

	// ───────────────────────────────────────────
	// getContributionRankingScrollAfter — 아래 방향 스크롤
	// ───────────────────────────────────────────

	@Test
	void 아래_스크롤_조회_시_afterRank_이후_size개를_반환한다() {
		// given — afterRank=17, size=20 → start=17, end=36
		List<RankEntry> raw = List.of(
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()));
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(200L);
		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(17L), eq(36L))).willReturn(raw);
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList())).willReturn(Map.of());
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		ContributionRankingScrollResponse response = contributionRankingService.getContributionRankingScrollAfter(17,
			20, memberId);

		// then
		assertThat(response.rankings()).hasSize(2);
		assertThat(response.rankings().get(0).rank()).isEqualTo(18);
		assertThat(response.rankings().get(1).rank()).isEqualTo(19);
		assertThat(response.prevCursor()).isEqualTo(18);
		assertThat(response.hasPrev()).isTrue();
	}

	@Test
	void 아래_스크롤_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — 전체 50명, afterRank=45 → 남은 5개
		List<RankEntry> raw = List.of(
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()));
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(45L), eq(64L))).willReturn(raw);
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList())).willReturn(Map.of());
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		ContributionRankingScrollResponse response = contributionRankingService.getContributionRankingScrollAfter(45,
			20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.rankings()).hasSize(5);
	}

	// ───────────────────────────────────────────
	// getContributionRankingScrollBefore — 위 방향 스크롤
	// ───────────────────────────────────────────

	@Test
	void 위_스크롤_조회_시_beforeRank_이전_항목을_반환한다() {
		// given — beforeRank=10, size=5
		List<RankEntry> raw = List.of(
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()),
			rankEntry(UUID.randomUUID().toString()));
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(3L), eq(8L))).willReturn(raw);
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList())).willReturn(Map.of());
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList())).willReturn(Map.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		ContributionRankingScrollResponse response = contributionRankingService.getContributionRankingScrollBefore(10,
			5, memberId);

		// then
		assertThat(response.rankings()).hasSize(5);
		assertThat(response.rankings().get(0).rank()).isEqualTo(5);
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(5);
		assertThat(response.nextCursor()).isEqualTo(9);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 위_스크롤_조회_시_beforeRank가_1이면_빈_응답을_반환한다() {
		// given
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);

		// when
		ContributionRankingScrollResponse response = contributionRankingService.getContributionRankingScrollBefore(1, 5,
			memberId);

		// then
		assertThat(response.rankings()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.hasNext()).isFalse();
	}

	// ───────────────────────────────────────────
	// updateContributionScore — 점수 업데이트
	// ───────────────────────────────────────────

	@Test
	void 점수_업데이트_시_결과를_반환한다() {
		// given
		UpdateContributionRankingResult expectedResult = new UpdateContributionRankingResult(
			1500, 3, 10, false, false);

		given(contributionRankingRedisRepository.updateScore(
			anyString(), anyString(), anyString(), anyString(),
			eq(memberId), eq(500), anyLong()))
			.willReturn(expectedResult);

		// when
		UpdateContributionRankingResult result = contributionRankingService.updateContributionScore(memberId, 500);

		// then
		assertThat(result.newContribution()).isEqualTo(1500);
		assertThat(result.newPlayCount()).isEqualTo(3);
		assertThat(result.rank()).isEqualTo(10);
		assertThat(result.contributionOverflow()).isFalse();
		assertThat(result.playCountOverflow()).isFalse();
	}

	@Test
	void 점수_업데이트_시_deltaContribution이_0이하면_예외가_발생한다() {
		// when & then
		assertThatThrownBy(() -> contributionRankingService.updateContributionScore(memberId, 0))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(ErrorCode.INVALID_CONTRIBUTION);

		assertThatThrownBy(() -> contributionRankingService.updateContributionScore(memberId, -100))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(ErrorCode.INVALID_CONTRIBUTION);
	}

	@Test
	void 점수_업데이트_시_contribution_overflow가_발생하면_메트릭을_기록한다() {
		// given
		UpdateContributionRankingResult overflowResult = new UpdateContributionRankingResult(
			1_500_000, 5, 1, true, false);

		given(contributionRankingRedisRepository.updateScore(
			anyString(), anyString(), anyString(), anyString(),
			eq(memberId), eq(500000), anyLong()))
			.willReturn(overflowResult);
		given(meterRegistry.counter("ranking.contribution.overflow")).willReturn(counter);

		// when
		UpdateContributionRankingResult result = contributionRankingService.updateContributionScore(memberId, 500000);

		// then
		assertThat(result.contributionOverflow()).isTrue();
		then(meterRegistry).should().counter("ranking.contribution.overflow");
		then(counter).should().increment();
	}

	@Test
	void 점수_업데이트_시_playCount_overflow가_발생하면_메트릭을_기록한다() {
		// given
		UpdateContributionRankingResult overflowResult = new UpdateContributionRankingResult(
			5000, 10001, 1, false, true);

		given(contributionRankingRedisRepository.updateScore(
			anyString(), anyString(), anyString(), anyString(),
			eq(memberId), eq(100), anyLong()))
			.willReturn(overflowResult);
		given(meterRegistry.counter("ranking.playcount.overflow")).willReturn(counter);

		// when
		UpdateContributionRankingResult result = contributionRankingService.updateContributionScore(memberId, 100);

		// then
		assertThat(result.playCountOverflow()).isTrue();
		then(meterRegistry).should().counter("ranking.playcount.overflow");
		then(counter).should().increment();
	}

	private static RankEntry rankEntry(String memberId) {
		return new RankEntry(memberId, 0.0);
	}
}
