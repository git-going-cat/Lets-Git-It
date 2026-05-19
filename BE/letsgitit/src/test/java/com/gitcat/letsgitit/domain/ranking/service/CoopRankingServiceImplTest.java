package com.gitcat.letsgitit.domain.ranking.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gitcat.letsgitit.domain.coop.entity.CoopResultMember;
import com.gitcat.letsgitit.domain.coop.repository.CoopResultMemberRepository;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRepository;

@ExtendWith(MockitoExtension.class)
class CoopRankingServiceImplTest {

	@Mock
	private CoopRankingRedisRepository coopRankingRedisRepository;

	@Mock
	private CoopRankingRepository coopRankingRepository;

	@Mock
	private CoopResultMemberRepository coopResultMemberRepository;

	@Mock
	private MemberService memberService;

	@InjectMocks
	private CoopRankingServiceImpl coopRankingService;

	private UUID memberId;

	private static final int YEAR = 2026;
	private static final int MONTH = 5;
	private static final int WEEK = 1;
	private static final String WEEK_KEY = "2026-05-1";
	private static final String MAP_NAME = "Git Forest";
	private static final int DIFFICULTY = 1;

	@BeforeEach
	void setUp() {
		memberId = UUID.randomUUID();
	}

	// ── Redis 이번주 ─────────────────────────────────────────────────────────────

	@Nested
	class getCoopRanking_초기_응답 {

		// 전체 데이터 10개(모두 MAP_NAME/DIFFICULTY) 중 내 기록이 index 8(rank 9)에 있는 경우
		@Test
		void top3와_내_순위와_주변_순위를_반환한다() {
			// given
			int totalCount = 10;
			List<String> ids = newIds(totalCount);
			String myId = ids.get(8); // index 8 → rank 9

			List<String> lexStrings = makeLexStrings(ids);
			List<CoopRankingData> dataList = makeDataList(ids, MAP_NAME, DIFFICULTY);

			UUID member1 = UUID.randomUUID();
			List<String> memberIds = List.of(member1.toString());
			// 내 데이터의 memberIds도 동일하게 설정
			dataList.set(8, new CoopRankingData(myId, "my team", MAP_NAME, DIFFICULTY,
				9000, 1, 1, 900L, memberIds));

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn((long)totalCount);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(9L))).willReturn(lexStrings);
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(dataList);
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId)))
				.willReturn(Set.of(myId));
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(member1, "player1"));

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId, MAP_NAME, DIFFICULTY);

			// then
			assertThat(response.top3()).hasSize(3);
			assertThat(response.top3().get(0).rank()).isEqualTo(1);
			assertThat(response.top3().get(2).rank()).isEqualTo(3);

			assertThat(response.myRank()).isNotNull();
			assertThat(response.myRank().rank()).isEqualTo(9); // index 8 + 1

			// aroundStart = max(0, 8-2)=6, aroundEnd = min(9, 8+2)=10→9
			assertThat(response.around()).hasSize(4); // index 6~9
			assertThat(response.around().get(0).rank()).isEqualTo(7);

			assertThat(response.hasPrev()).isTrue();
			assertThat(response.prevCursor()).isEqualTo(7); // aroundStart+1
			assertThat(response.hasNext()).isFalse(); // aroundEnd+1=10 == total
			assertThat(response.nextCursor()).isNull();
		}

		@Test
		void 맵에_데이터가_없으면_myRank가_null이고_around가_비어있다() {
			// given — total=0 → filtered 비어있음
			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(0L);
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId)))
				.willReturn(Set.of());

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId, MAP_NAME, DIFFICULTY);

			// then
			assertThat(response.myRank()).isNull();
			assertThat(response.around()).isEmpty();
			assertThat(response.hasNext()).isFalse();
		}

		@Test
		void 이번주_참여_기록이_없으면_myRank가_null이다() {
			// given — 맵에 5개 데이터, 내 기록 없음
			int totalCount = 5;
			List<String> ids = newIds(totalCount);
			List<String> lexStrings = makeLexStrings(ids);
			List<CoopRankingData> dataList = makeDataList(ids, MAP_NAME, DIFFICULTY);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn((long)totalCount);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(4L))).willReturn(lexStrings);
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(dataList);
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId)))
				.willReturn(Set.of());
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId, MAP_NAME, DIFFICULTY);

			// then
			assertThat(response.myRank()).isNull();
			assertThat(response.around()).isEmpty();
			assertThat(response.hasPrev()).isFalse();
			assertThat(response.prevCursor()).isNull();
			// mapTotal=5 > 3 → hasNext=true, nextCursor=3
			assertThat(response.hasNext()).isTrue();
			assertThat(response.nextCursor()).isEqualTo(3);
		}

		@Test
		void 내가_1위면_prevCursor가_null이다() {
			// given — 내 기록이 index 0
			int totalCount = 5;
			List<String> ids = newIds(totalCount);
			String myId = ids.get(0);

			UUID member1 = UUID.randomUUID();
			List<CoopRankingData> dataList = makeDataList(ids, MAP_NAME, DIFFICULTY);
			dataList.set(0, new CoopRankingData(myId, "my team", MAP_NAME, DIFFICULTY,
				1000, 0, 0, 100L, List.of(member1.toString())));

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn((long)totalCount);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(4L)))
				.willReturn(makeLexStrings(ids));
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(dataList);
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId)))
				.willReturn(Set.of(myId));
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(member1, "me"));

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId, MAP_NAME, DIFFICULTY);

			// then
			assertThat(response.myRank().rank()).isEqualTo(1);
			assertThat(response.hasPrev()).isFalse();
			assertThat(response.prevCursor()).isNull();
		}
	}

	@Nested
	class getCoopRankingScrollAfter_아래_방향_스크롤 {

		@Test
		void afterRank_이후_size개를_반환한다() {
			// given — total=10, afterRank=3, size=2 → index 3~4 (rank 4, 5)
			int totalCount = 10;
			List<String> ids = newIds(totalCount);
			List<CoopRankingData> dataList = makeDataList(ids, MAP_NAME, DIFFICULTY);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn((long)totalCount);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(9L)))
				.willReturn(makeLexStrings(ids));
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(dataList);
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollAfter(3, 2, memberId, MAP_NAME,
				DIFFICULTY);

			// then
			assertThat(response.rankings()).hasSize(2);
			assertThat(response.rankings().get(0).rank()).isEqualTo(4); // start+1=4
			assertThat(response.rankings().get(1).rank()).isEqualTo(5);
			assertThat(response.hasPrev()).isTrue();
			assertThat(response.prevCursor()).isEqualTo(4);
			// nextCursor = 3 + 2 = 5
			assertThat(response.hasNext()).isTrue();
			assertThat(response.nextCursor()).isEqualTo(5);
		}

		@Test
		void 마지막_페이지면_nextCursor가_null이다() {
			// given — total=5, afterRank=3 → index 3~4 (rank 4,5), 이후 없음
			int totalCount = 5;
			List<String> ids = newIds(totalCount);
			List<CoopRankingData> dataList = makeDataList(ids, MAP_NAME, DIFFICULTY);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn((long)totalCount);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(4L)))
				.willReturn(makeLexStrings(ids));
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(dataList);
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollAfter(3, 20, memberId, MAP_NAME,
				DIFFICULTY);

			// then — index 3~4 = 2개, 5 < 5 = false
			assertThat(response.rankings()).hasSize(2);
			assertThat(response.rankings().get(0).rank()).isEqualTo(4);
			assertThat(response.hasNext()).isFalse();
			assertThat(response.nextCursor()).isNull();
		}
	}

	@Nested
	class getCoopRankingScrollBefore_위_방향_스크롤 {

		@Test
		void beforeRank_이전_항목을_반환한다() {
			// given — total=10, beforeRank=6, size=3
			// endIdx=min(9,4)=4, startIdx=max(0,4-3)=1
			// rawSlice = filtered[1..4] = 4개 → hasPrev=true
			// pageData = rawSlice[1..4] = 3개, pageStartRank = 1+2 = 3
			int totalCount = 10;
			List<String> ids = newIds(totalCount);
			List<CoopRankingData> dataList = makeDataList(ids, MAP_NAME, DIFFICULTY);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn((long)totalCount);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(9L)))
				.willReturn(makeLexStrings(ids));
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(dataList);
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollBefore(6, 3, memberId, MAP_NAME,
				DIFFICULTY);

			// then
			assertThat(response.rankings()).hasSize(3);
			assertThat(response.rankings().get(0).rank()).isEqualTo(3); // pageStartRank
			assertThat(response.hasPrev()).isTrue();
			assertThat(response.prevCursor()).isEqualTo(3);
			// nextCursorLong = endIdx+1 = 5
			assertThat(response.hasNext()).isTrue();
			assertThat(response.nextCursor()).isEqualTo(5);
		}

		@Test
		void beforeRank가_1이면_빈_응답을_반환한다() {
			// given — endIdx = min(total-1, -1) = -1 → 즉시 empty 반환
			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(10L);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(9L)))
				.willReturn(makeLexStrings(newIds(10)));
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList()))
				.willReturn(makeDataList(newIds(10), MAP_NAME, DIFFICULTY));

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollBefore(1, 5, memberId, MAP_NAME,
				DIFFICULTY);

			// then
			assertThat(response.rankings()).isEmpty();
			assertThat(response.hasPrev()).isFalse();
			assertThat(response.hasNext()).isFalse();
		}
	}

	@Nested
	class registerCoopRanking_랭킹_등록 {

		@Test
		void repository의_register를_호출한다() {
			// given
			CoopRankingData data = new CoopRankingData(
				UUID.randomUUID().toString(), "test team", MAP_NAME, DIFFICULTY,
				60000, 2, 3, 1000000L,
				List.of(UUID.randomUUID().toString(), UUID.randomUUID().toString()));

			// when
			coopRankingService.registerCoopRanking(data);

			// then
			then(coopRankingRedisRepository).should().register(anyString(), eq(data));
		}

		@Test
		void 멤버_닉네임은_가나다순으로_정렬된다() {
			// given — top3에 1개 entry, 4명 멤버, 가나다 역순으로 제공
			String coopResultId = UUID.randomUUID().toString();
			UUID m1 = UUID.randomUUID(), m2 = UUID.randomUUID(),
				m3 = UUID.randomUUID(), m4 = UUID.randomUUID();
			List<String> memberIds = List.of(m1.toString(), m2.toString(), m3.toString(), m4.toString());
			CoopRankingData data = new CoopRankingData(coopResultId, "team", MAP_NAME, DIFFICULTY,
				60000, 1, 2, 1000000L, memberIds);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(1L);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(0L)))
				.willReturn(List.of("000060000:0001:0002:1000000:" + coopResultId));
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(List.of(data));
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId))).willReturn(Set.of());
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(
				m1, "찬호", m2, "가영", m3, "민수", m4, "다은"));

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId, MAP_NAME, DIFFICULTY);

			// then — 가나다순: 가영, 다은, 민수, 찬호
			assertThat(response.top3()).hasSize(1);
			List<String> nicknames = response.top3().get(0).members().stream()
				.map(m -> m.nickname())
				.toList();
			assertThat(nicknames).containsExactly("가영", "다은", "민수", "찬호");
		}
	}

	// ── DB 과거주 초기 조회 ─────────────────────────────────────────────────────

	@Test
	void 초기_조회_시_top3와_내_팀_순위와_주변_순위를_반환한다() {
		// given — total=10, myEntity globalRank=5, countBefore=4 → displayRank=5
		UUID r1 = UUID.randomUUID(), r2 = UUID.randomUUID(), r3 = UUID.randomUUID();
		UUID r4 = UUID.randomUUID(), r5 = UUID.randomUUID();

		List<CoopRanking> top3Raw = List.of(
			ranking(r1, "team1", 1000, 1), ranking(r2, "team2", 2000, 2), ranking(r3, "team3", 3000, 3));

		CoopRanking myEntity = ranking(r4, "my team", 5000, 5); // globalRank=5 → displayRank=5
		List<CoopRanking> aroundRaw = List.of(
			ranking(r3, "team3", 3000, 3), ranking(UUID.randomUUID(), "team4", 4000, 4),
			ranking(r4, "my team", 5000, 5), ranking(r5, "team6", 6000, 6),
			ranking(UUID.randomUUID(), "team7", 7000, 7));

		UUID member1 = UUID.randomUUID();

		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(10L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 0L, 3)).willReturn(top3Raw);
		given(coopRankingRepository.findMyCoopRankingByMemberIdAndWeekAndMapNameAndDifficulty(
			memberId, WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(Optional.of(myEntity));
		// countBefore=4 → displayRank=5, aroundMin=3, aroundMax=7, offset=2, limit=5
		given(coopRankingRepository.countByWeekAndMapNameAndDifficultyAndRankLt(
			WEEK_KEY, MAP_NAME, DIFFICULTY, myEntity.getRank())).willReturn(4L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 2L, 5)).willReturn(aroundRaw);
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList()))
			.willReturn(List.of(member(r1, member1)));
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(member1, "player1"));

		// when
		CoopRankingInitialResponse response = coopRankingService.getCoopRankingHistory(YEAR, MONTH, WEEK, 20, memberId,
			MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.top3()).hasSize(3);
		assertThat(response.top3().get(0).rank()).isEqualTo(1); // startRank=1
		assertThat(response.top3().get(0).teamName()).isEqualTo("team1");

		assertThat(response.myRank()).isNotNull();
		assertThat(response.myRank().rank()).isEqualTo(5); // displayRank = countBefore+1 = 5
		assertThat(response.myRank().teamName()).isEqualTo("my team");

		assertThat(response.around()).hasSize(5);
		assertThat(response.around().get(0).rank()).isEqualTo(3); // aroundMinDisplayRank=3
		assertThat(response.around().get(4).rank()).isEqualTo(7);

		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(3); // aroundMinDisplayRank
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(7); // aroundMaxDisplayRank
	}

	@Test
	void 초기_조회_시_해당_맵_기록이_없으면_myRank가_null이다() {
		// given
		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(0L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 0L, 3)).willReturn(List.of());
		given(coopRankingRepository.findMyCoopRankingByMemberIdAndWeekAndMapNameAndDifficulty(
			memberId, WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(Optional.empty());
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList())).willReturn(List.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingInitialResponse response = coopRankingService.getCoopRankingHistory(YEAR, MONTH, WEEK, 20, memberId,
			MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.myRank()).isNull();
		assertThat(response.around()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
	}

	@Test
	void 초기_조회_시_내_기록이_없어도_top3_이후_데이터가_있으면_nextCursor가_3이다() {
		// given — total=10, 내 기록 없음
		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(10L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 0L, 3)).willReturn(List.of());
		given(coopRankingRepository.findMyCoopRankingByMemberIdAndWeekAndMapNameAndDifficulty(
			memberId, WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(Optional.empty());
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList())).willReturn(List.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingInitialResponse response = coopRankingService.getCoopRankingHistory(YEAR, MONTH, WEEK, 20, memberId,
			MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.myRank()).isNull();
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(3);
	}

	@Test
	void 초기_조회_시_내_팀이_1위면_prevCursor가_null이다() {
		// given — countBefore=0 → displayRank=1, aroundMinDisplayRank=1 → hasPrev=false
		UUID r1 = UUID.randomUUID();
		CoopRanking myEntity = ranking(r1, "git masters", 61000, 1);
		List<CoopRanking> aroundRaw = List.of(
			ranking(r1, "git masters", 61000, 1),
			ranking(UUID.randomUUID(), "team2", 75000, 2),
			ranking(UUID.randomUUID(), "team3", 83000, 3));

		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(10L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 0L, 3)).willReturn(List.of());
		given(coopRankingRepository.findMyCoopRankingByMemberIdAndWeekAndMapNameAndDifficulty(
			memberId, WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(Optional.of(myEntity));
		given(coopRankingRepository.countByWeekAndMapNameAndDifficultyAndRankLt(
			WEEK_KEY, MAP_NAME, DIFFICULTY, myEntity.getRank())).willReturn(0L); // 아무도 내 앞에 없음
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 0L, 3)).willReturn(aroundRaw);
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList())).willReturn(List.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingInitialResponse response = coopRankingService.getCoopRankingHistory(YEAR, MONTH, WEEK, 20, memberId,
			MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.myRank().rank()).isEqualTo(1);
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
	}

	@Test
	void 초기_조회_시_마지막_순위이면_nextCursor가_null이다() {
		// given — total=10, countBefore=9 → displayRank=10, aroundMaxDisplayRank=10=total → hasNext=false
		UUID r10 = UUID.randomUUID();
		CoopRanking myEntity = ranking(r10, "last team", 200000, 15); // globalRank=15

		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(10L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 0L, 3)).willReturn(List.of());
		given(coopRankingRepository.findMyCoopRankingByMemberIdAndWeekAndMapNameAndDifficulty(
			memberId, WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(Optional.of(myEntity));
		given(coopRankingRepository.countByWeekAndMapNameAndDifficultyAndRankLt(
			WEEK_KEY, MAP_NAME, DIFFICULTY, myEntity.getRank())).willReturn(9L); // displayRank=10
		// aroundMin=8, aroundMax=10, offset=7, limit=3
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 7L, 3)).willReturn(List.of(
				ranking(UUID.randomUUID(), "team8", 180000, 13),
				ranking(UUID.randomUUID(), "team9", 190000, 14),
				ranking(r10, "last team", 200000, 15)));
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList())).willReturn(List.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingInitialResponse response = coopRankingService.getCoopRankingHistory(YEAR, MONTH, WEEK, 20, memberId,
			MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.myRank().rank()).isEqualTo(10);
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(8); // aroundMinDisplayRank
	}

	// ── DB 과거주 아래 스크롤 ────────────────────────────────────────────────────

	@Test
	void 아래_스크롤_조회_시_afterRank_이후_항목을_반환한다() {
		// given — afterRank=3, size=1 → offset=3, limit=2
		UUID r4 = UUID.randomUUID(), r5 = UUID.randomUUID();
		List<CoopRanking> raw = List.of(
			ranking(r4, "team4", 91000, 4),
			ranking(r5, "team5", 102000, 5)); // 2개 → hasNext=true, page=첫 1개

		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 3L, 2)).willReturn(raw);
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList()))
			.willReturn(List.of(member(r4, UUID.randomUUID())));
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingScrollResponse response = coopRankingService
			.getCoopRankingHistoryScrollAfter(YEAR, MONTH, WEEK, 3, 1, memberId, MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.rankings()).hasSize(1);
		assertThat(response.rankings().get(0).rank()).isEqualTo(4); // pageStartRank = afterRank+1 = 4
		assertThat(response.rankings().get(0).teamName()).isEqualTo("team4");
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(4); // lastDisplayRank = 4
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(4);
	}

	@Test
	void 아래_스크롤_조회_시_마지막_페이지면_nextCursor가_null이다() {
		// given — afterRank=8, size=20 → offset=8, limit=21 → 2개 반환 → hasNext=false
		List<CoopRanking> raw = List.of(
			ranking(UUID.randomUUID(), "team9", 190000, 9),
			ranking(UUID.randomUUID(), "team10", 200000, 10));

		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 8L, 21)).willReturn(raw);
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList())).willReturn(List.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingScrollResponse response = coopRankingService
			.getCoopRankingHistoryScrollAfter(YEAR, MONTH, WEEK, 8, 20, memberId, MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.hasNext()).isFalse();
		assertThat(response.nextCursor()).isNull();
		assertThat(response.rankings()).hasSize(2);
		assertThat(response.rankings().get(0).rank()).isEqualTo(9); // pageStartRank=9
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(9);
	}

	@Test
	void 아래_스크롤_조회_시_결과가_없으면_빈_응답을_반환한다() {
		// given
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyAscWithOffset(
			anyString(), anyString(), anyInt(), anyLong(), anyInt())).willReturn(List.of());

		// when
		CoopRankingScrollResponse response = coopRankingService
			.getCoopRankingHistoryScrollAfter(YEAR, MONTH, WEEK, 99, 20, memberId, MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.rankings()).isEmpty();
		assertThat(response.hasNext()).isFalse();
		assertThat(response.hasPrev()).isFalse();
	}

	// ── DB 과거주 위 스크롤 ─────────────────────────────────────────────────────

	@Test
	void 위_스크롤_조회_시_beforeRank_이전_항목을_반환한다() {
		// given — beforeRank=6, size=3, total=10
		// endDisplayRank=5, descOffset=10-5=5, limit=4
		// [r5,r4,r3,r2] → hasPrev=true, page=[r5,r4,r3] → reversed [r3,r4,r5]
		// pageStartRank = 5-3+1 = 3
		UUID r5 = UUID.randomUUID(), r4 = UUID.randomUUID(),
			r3 = UUID.randomUUID(), r2 = UUID.randomUUID();
		List<CoopRanking> raw = List.of(
			ranking(r5, "team5", 102000, 5),
			ranking(r4, "team4", 91000, 4),
			ranking(r3, "team3", 83000, 3),
			ranking(r2, "team2", 75000, 2));

		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(10L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyDescWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 5L, 4)).willReturn(raw);
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList())).willReturn(List.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingScrollResponse response = coopRankingService
			.getCoopRankingHistoryScrollBefore(YEAR, MONTH, WEEK, 6, 3, memberId, MAP_NAME, DIFFICULTY);

		// then — DESC → reverse → ASC 순서로 반환
		assertThat(response.rankings()).hasSize(3);
		assertThat(response.rankings().get(0).rank()).isEqualTo(3); // pageStartRank
		assertThat(response.rankings().get(2).rank()).isEqualTo(5);
		assertThat(response.hasPrev()).isTrue();
		assertThat(response.prevCursor()).isEqualTo(3);
		// hasNext = endDisplayRank(5) < total(10) = true, nextCursor=5
		assertThat(response.hasNext()).isTrue();
		assertThat(response.nextCursor()).isEqualTo(5);
	}

	@Test
	void 위_스크롤_조회_시_더_이상_위_항목이_없으면_hasPrev가_false이다() {
		// given — beforeRank=4, size=5, total=10
		// endDisplayRank=3, descOffset=7, limit=6
		// [r3,r2,r1] (3개) → hasPrev=false, reversed [r1,r2,r3], pageStartRank=3-3+1=1
		List<CoopRanking> raw = List.of(
			ranking(UUID.randomUUID(), "team3", 83000, 3),
			ranking(UUID.randomUUID(), "team2", 75000, 2),
			ranking(UUID.randomUUID(), "team1", 61000, 1));

		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(10L);
		given(coopRankingRepository.findByWeekAndMapNameAndDifficultyDescWithOffset(
			WEEK_KEY, MAP_NAME, DIFFICULTY, 7L, 6)).willReturn(raw);
		given(coopResultMemberRepository.findAllByCoopResultIdIn(anyList())).willReturn(List.of());
		given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());

		// when
		CoopRankingScrollResponse response = coopRankingService
			.getCoopRankingHistoryScrollBefore(YEAR, MONTH, WEEK, 4, 5, memberId, MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.rankings()).hasSize(3);
		assertThat(response.rankings().get(0).rank()).isEqualTo(1);
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.prevCursor()).isNull();
		// hasNext = endDisplayRank(3) < total(10) = true
		assertThat(response.nextCursor()).isEqualTo(3);
		assertThat(response.hasNext()).isTrue();
	}

	@Test
	void 위_스크롤_조회_시_beforeRank가_1이면_빈_응답을_반환한다() {
		// given — endDisplayRank = min(total, 0) = 0 → 즉시 빈 응답
		given(coopRankingRepository.countByWeekAndMapNameAndDifficulty(WEEK_KEY, MAP_NAME, DIFFICULTY)).willReturn(10L);

		// when
		CoopRankingScrollResponse response = coopRankingService
			.getCoopRankingHistoryScrollBefore(YEAR, MONTH, WEEK, 1, 5, memberId, MAP_NAME, DIFFICULTY);

		// then
		assertThat(response.rankings()).isEmpty();
		assertThat(response.hasPrev()).isFalse();
		assertThat(response.hasNext()).isFalse();
	}

	// ── 헬퍼 메서드 ──────────────────────────────────────────────────────────────

	private static CoopRanking ranking(UUID coopResultId, String teamName, int elapsedTime, int rank) {
		return CoopRanking.of(coopResultId, MAP_NAME, DIFFICULTY, teamName, rank,
			elapsedTime, 0, 0, WEEK_KEY);
	}

	private static CoopResultMember member(UUID coopResultId, UUID memberId) {
		return CoopResultMember.of(coopResultId, memberId, 0, 0);
	}

	private static List<String> newIds(int count) {
		List<String> ids = new ArrayList<>();
		for (int i = 0; i < count; i++) {
			ids.add(UUID.randomUUID().toString());
		}
		return ids;
	}

	private static List<String> makeLexStrings(List<String> ids) {
		List<String> result = new ArrayList<>();
		for (int i = 0; i < ids.size(); i++) {
			result.add(String.format("%09d:0000:0000:%07d:%s", (i + 1) * 1000, i + 1, ids.get(i)));
		}
		return result;
	}

	private static List<CoopRankingData> makeDataList(List<String> ids, String mapName, int difficulty) {
		List<CoopRankingData> list = new ArrayList<>();
		for (int i = 0; i < ids.size(); i++) {
			list.add(new CoopRankingData(ids.get(i), "team" + (i + 1), mapName, difficulty,
				(i + 1) * 1000, 0, 0, i + 1L, List.of(UUID.randomUUID().toString())));
		}
		return list;
	}
}
