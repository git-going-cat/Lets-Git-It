package com.gitcat.letsgitit.domain.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

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
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository.RankEntry;

@ExtendWith(MockitoExtension.class)
class SingleRankingServiceImplTest {

	@Mock
	private SingleRankingRedisRepository singleRankingRedisRepository;

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
		given(singleRankingRedisRepository.getTotalCount(org.mockito.ArgumentMatchers.anyString())).willReturn(100L);
		given(singleRankingRedisRepository.getTopEntries(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(3))).willReturn(top3Entries);
		given(singleRankingRedisRepository.getRankZeroBased(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(41L); // 1-indexed 42위
		given(singleRankingRedisRepository.getScore(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(7200.0);
		given(singleRankingRedisRepository.getRangeByRank(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(39L), org.mockito.ArgumentMatchers.eq(43L)))
			.willReturn(List.of(
				new RankEntry(UUID.randomUUID().toString(), 7400),
				new RankEntry(UUID.randomUUID().toString(), 7300),
				new RankEntry(memberId.toString(), 7200),
				new RankEntry(UUID.randomUUID().toString(), 7100),
				new RankEntry(UUID.randomUUID().toString(), 7000)));
		given(memberService.getNicknamesByIds(org.mockito.ArgumentMatchers.anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking("NORMAL", 20, memberId);

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
		given(singleRankingRedisRepository.getTotalCount(org.mockito.ArgumentMatchers.anyString())).willReturn(50L);
		given(singleRankingRedisRepository.getTopEntries(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(3))).willReturn(List.of());
		given(singleRankingRedisRepository.getRankZeroBased(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(null);
		given(singleRankingRedisRepository.getScore(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(null);
		given(memberService.getNicknamesByIds(org.mockito.ArgumentMatchers.anyList())).willReturn(Map.of());

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking("NORMAL", 20, memberId);

		// then
		assertThat(response.myRank()).isNull();
		assertThat(response.around()).isEmpty();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.hasNext()).isFalse();
	}

	@Test
	void 초기_랭킹_조회_시_내가_1위면_around_시작이_1위부터다() {
		// given
		given(singleRankingRedisRepository.getTotalCount(org.mockito.ArgumentMatchers.anyString())).willReturn(10L);
		given(singleRankingRedisRepository.getTopEntries(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(3))).willReturn(List.of());
		given(singleRankingRedisRepository.getRankZeroBased(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(0L); // 1위
		given(singleRankingRedisRepository.getScore(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(9800.0);
		given(singleRankingRedisRepository.getRangeByRank(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(0L), org.mockito.ArgumentMatchers.eq(2L)))
			.willReturn(List.of(
				new RankEntry(memberId.toString(), 9800),
				new RankEntry(UUID.randomUUID().toString(), 9200),
				new RankEntry(UUID.randomUUID().toString(), 8700)));
		given(memberService.getNicknamesByIds(org.mockito.ArgumentMatchers.anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking("NORMAL", 20, memberId);

		// then
		assertThat(response.around().get(0).rank()).isEqualTo(1); // 경계 보정 확인
	}

	@Test
	void 초기_랭킹_조회_시_다음_페이지가_없으면_nextCursor가_null이다() {
		// given — 전체 5명, 내가 5위(꼴찌)
		given(singleRankingRedisRepository.getTotalCount(org.mockito.ArgumentMatchers.anyString())).willReturn(5L);
		given(singleRankingRedisRepository.getTopEntries(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(3))).willReturn(List.of());
		given(singleRankingRedisRepository.getRankZeroBased(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(4L); // 5위
		given(singleRankingRedisRepository.getScore(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(memberId))).willReturn(1000.0);
		given(singleRankingRedisRepository.getRangeByRank(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(2L), org.mockito.ArgumentMatchers.eq(4L)))
			.willReturn(List.of(
				new RankEntry(UUID.randomUUID().toString(), 3000),
				new RankEntry(UUID.randomUUID().toString(), 2000),
				new RankEntry(memberId.toString(), 1000)));
		given(memberService.getNicknamesByIds(org.mockito.ArgumentMatchers.anyList())).willReturn(Map.of());
		given(memberService.getNicknameById(memberId)).willReturn("dobby");

		// when
		SingleRankingInitialResponse response = singleRankingService.getSingleRanking("NORMAL", 20, memberId);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
	}

	// ───────────────────────────────────────────
	// getSingleRankingScroll — 무한 스크롤
	// ───────────────────────────────────────────

	@Test
	void 스크롤_조회_시_cursor_이후_size개를_반환한다() {
		// given — cursor=44, size=20 → 45위~64위 조회
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 6900),
			new RankEntry(UUID.randomUUID().toString(), 6800));
		given(singleRankingRedisRepository.getTotalCount(org.mockito.ArgumentMatchers.anyString())).willReturn(200L);
		given(singleRankingRedisRepository.getRangeByRank(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(44L), org.mockito.ArgumentMatchers.eq(63L)))
			.willReturn(raw);
		given(memberService.getNicknamesByIds(org.mockito.ArgumentMatchers.anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScroll("NORMAL", 44, 20, memberId);

		// then
		assertThat(response.rankings()).hasSize(2);
		assertThat(response.rankings().get(0).rank()).isEqualTo(45);
		assertThat(response.rankings().get(1).rank()).isEqualTo(46);
	}

	@Test
	void 스크롤_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — 전체 50명, cursor=45 → 남은 데이터 5개
		List<RankEntry> raw = List.of(
			new RankEntry(UUID.randomUUID().toString(), 500),
			new RankEntry(UUID.randomUUID().toString(), 400),
			new RankEntry(UUID.randomUUID().toString(), 300),
			new RankEntry(UUID.randomUUID().toString(), 200),
			new RankEntry(UUID.randomUUID().toString(), 100));
		given(singleRankingRedisRepository.getTotalCount(org.mockito.ArgumentMatchers.anyString())).willReturn(50L);
		given(singleRankingRedisRepository.getRangeByRank(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(45L), org.mockito.ArgumentMatchers.eq(64L)))
			.willReturn(raw);
		given(memberService.getNicknamesByIds(org.mockito.ArgumentMatchers.anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScroll("NORMAL", 45, 20, memberId);

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
		given(singleRankingRedisRepository.getTotalCount(org.mockito.ArgumentMatchers.anyString())).willReturn(100L);
		given(singleRankingRedisRepository.getRangeByRank(org.mockito.ArgumentMatchers.anyString(),
			org.mockito.ArgumentMatchers.eq(0L), org.mockito.ArgumentMatchers.eq(19L)))
			.willReturn(raw);
		given(memberService.getNicknamesByIds(org.mockito.ArgumentMatchers.anyList())).willReturn(Map.of());

		// when
		SingleRankingScrollResponse response = singleRankingService.getSingleRankingScroll("NORMAL", 0, 20, memberId);

		// then
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(20);
	}
}
