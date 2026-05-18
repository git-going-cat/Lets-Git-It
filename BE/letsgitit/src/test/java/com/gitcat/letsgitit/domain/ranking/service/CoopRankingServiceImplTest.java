package com.gitcat.letsgitit.domain.ranking.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRedisRepository;

@ExtendWith(MockitoExtension.class)
class CoopRankingServiceImplTest {

	@Mock
	private CoopRankingRedisRepository coopRankingRedisRepository;

	@Mock
	private MemberService memberService;

	@InjectMocks
	private CoopRankingServiceImpl coopRankingService;

	private UUID memberId;

	@BeforeEach
	void setUp() {
		memberId = UUID.randomUUID();
	}

	@Nested
	class getCoopRanking_초기_응답 {

		@Test
		void top3와_내_순위와_주변_순위를_반환한다() {
			// given
			String coopResultId1 = UUID.randomUUID().toString();
			String coopResultId2 = UUID.randomUUID().toString();
			String coopResultId3 = UUID.randomUUID().toString();
			String myCoopResultId = UUID.randomUUID().toString();

			UUID member1 = UUID.randomUUID();
			UUID member2 = UUID.randomUUID();
			UUID member3 = UUID.randomUUID();
			UUID member4 = UUID.randomUUID();

			List<String> memberIds = List.of(
				member1.toString(), member2.toString(), member3.toString(), member4.toString());

			List<String> top3LexStrings = List.of(
				"000061000:0001:0002:1000000:" + coopResultId1,
				"000065000:0002:0003:1000001:" + coopResultId2,
				"000070000:0003:0004:1000002:" + coopResultId3);

			CoopRankingData data1 = new CoopRankingData(coopResultId1, "team1", "기초 브랜치", 3,
				61000, 1, 2, 1000000L, memberIds);
			CoopRankingData data2 = new CoopRankingData(coopResultId2, "team2", "merge 실전", 2,
				65000, 2, 3, 1000001L, memberIds);
			CoopRankingData data3 = new CoopRankingData(coopResultId3, "team3", "rebase 입문", 1,
				70000, 3, 4, 1000002L, memberIds);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
			given(coopRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(top3LexStrings);
			given(coopRankingRedisRepository.getDataBatch(anyString(),
				eq(List.of(coopResultId1, coopResultId2, coopResultId3))))
				.willReturn(List.of(data1, data2, data3));

			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId)))
				.willReturn(Set.of(myCoopResultId));

			CoopRankingData myData = new CoopRankingData(myCoopResultId, "my team", "기초 브랜치", 3,
				80000, 5, 6, 1000010L,
				List.of(memberId.toString(), member2.toString(), member3.toString(), member4.toString()));
			given(coopRankingRedisRepository.getDataBatch(anyString(), eq(List.of(myCoopResultId))))
				.willReturn(List.of(myData));

			String myLexString = "000080000:0005:0006:1000010:" + myCoopResultId;
			given(coopRankingRedisRepository.getLexString(anyString(), eq(myCoopResultId))).willReturn(myLexString);
			given(coopRankingRedisRepository.getRankByLexString(anyString(), eq(myLexString))).willReturn(9L); // 10위

			String aroundId1 = UUID.randomUUID().toString();
			String aroundId2 = UUID.randomUUID().toString();
			String aroundId3 = UUID.randomUUID().toString();
			String aroundId4 = UUID.randomUUID().toString();

			List<String> aroundLexStrings = List.of(
				"000078000:0004:0005:1000008:" + aroundId1,
				"000079000:0004:0006:1000009:" + aroundId2,
				myLexString,
				"000081000:0005:0007:1000011:" + aroundId3,
				"000082000:0006:0008:1000012:" + aroundId4);

			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(7L), eq(11L))).willReturn(aroundLexStrings);

			CoopRankingData aroundData1 = new CoopRankingData(aroundId1, "around1", "map1", 2, 78000, 4, 5, 1000008L,
				memberIds);
			CoopRankingData aroundData2 = new CoopRankingData(aroundId2, "around2", "map2", 2, 79000, 4, 6, 1000009L,
				memberIds);
			CoopRankingData aroundData3 = new CoopRankingData(aroundId3, "around3", "map3", 2, 81000, 5, 7, 1000011L,
				memberIds);
			CoopRankingData aroundData4 = new CoopRankingData(aroundId4, "around4", "map4", 2, 82000, 6, 8, 1000012L,
				memberIds);

			given(coopRankingRedisRepository.getDataBatch(anyString(),
				eq(List.of(aroundId1, aroundId2, myCoopResultId, aroundId3, aroundId4))))
				.willReturn(List.of(aroundData1, aroundData2, myData, aroundData3, aroundData4));

			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(
				member1, "alice", member2, "bob", member3, "charlie", member4, "dobby", memberId, "me"));

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId);

			// then
			assertThat(response.top3()).hasSize(3);
			assertThat(response.top3().get(0).rank()).isEqualTo(1);
			assertThat(response.top3().get(0).teamName()).isEqualTo("team1");
			assertThat(response.top3().get(0).elapsedTime()).isEqualTo(61000);

			assertThat(response.myRank()).isNotNull();
			assertThat(response.myRank().rank()).isEqualTo(10);
			assertThat(response.myRank().teamName()).isEqualTo("my team");

			assertThat(response.around()).hasSize(5);
			assertThat(response.around().get(0).rank()).isEqualTo(8);
			assertThat(response.around().get(2).rank()).isEqualTo(10); // myRank

			assertThat(response.hasPrev()).isTrue();
			assertThat(response.prevCursor()).isEqualTo(8);
			assertThat(response.hasNext()).isTrue();
			assertThat(response.nextCursor()).isEqualTo(12);
		}

		@Test
		void 이번주_참여_기록이_없으면_myRank가_null이다() {
			// given
			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
			given(coopRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of());
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId))).willReturn(Set.of());

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId);

			// then
			assertThat(response.myRank()).isNull();
			assertThat(response.around()).isEmpty();
			assertThat(response.hasPrev()).isFalse();
			assertThat(response.prevCursor()).isNull();
			assertThat(response.nextCursor()).isEqualTo(3);
			assertThat(response.hasNext()).isTrue();
		}

		@Test
		void 내가_1위면_prevCursor가_null이다() {
			// given
			String myCoopResultId = UUID.randomUUID().toString();
			UUID member1 = UUID.randomUUID();
			List<String> memberIds = List.of(memberId.toString(), member1.toString());

			String myLexString = "000050000:0000:0000:1000000:" + myCoopResultId;
			CoopRankingData myData = new CoopRankingData(myCoopResultId, "my team", "map", 3,
				50000, 0, 0, 1000000L, memberIds);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(10L);
			given(coopRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(List.of(myLexString));
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId)))
				.willReturn(Set.of(myCoopResultId));
			given(coopRankingRedisRepository.getDataBatch(anyString(), eq(List.of(myCoopResultId))))
				.willReturn(List.of(myData));
			given(coopRankingRedisRepository.getLexString(anyString(), eq(myCoopResultId))).willReturn(myLexString);
			given(coopRankingRedisRepository.getRankByLexString(anyString(), eq(myLexString))).willReturn(0L); // 1위
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(2L)))
				.willReturn(List.of(myLexString));
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(memberId, "me", member1, "friend"));

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId);

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
			// given
			String coopResultId1 = UUID.randomUUID().toString();
			String coopResultId2 = UUID.randomUUID().toString();
			UUID member1 = UUID.randomUUID();
			List<String> memberIds = List.of(member1.toString());

			List<String> lexStrings = List.of(
				"000070000:0002:0003:1000000:" + coopResultId1,
				"000071000:0002:0004:1000001:" + coopResultId2);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(200L);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(17L), eq(36L))).willReturn(lexStrings);
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(List.of(
				new CoopRankingData(coopResultId1, "team1", "map1", 2, 70000, 2, 3, 1000000L, memberIds),
				new CoopRankingData(coopResultId2, "team2", "map2", 2, 71000, 2, 4, 1000001L, memberIds)));
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(member1, "player1"));

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollAfter(17, 20, memberId);

			// then
			assertThat(response.rankings()).hasSize(2);
			assertThat(response.rankings().get(0).rank()).isEqualTo(18);
			assertThat(response.rankings().get(1).rank()).isEqualTo(19);
			assertThat(response.prevCursor()).isEqualTo(18);
			assertThat(response.hasPrev()).isTrue();
		}

		@Test
		void 마지막_페이지면_nextCursor가_null이다() {
			// given
			String coopResultId = UUID.randomUUID().toString();
			UUID member1 = UUID.randomUUID();
			List<String> memberIds = List.of(member1.toString());

			List<String> lexStrings = List.of("000090000:0005:0006:1000000:" + coopResultId);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(50L);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(49L), eq(68L))).willReturn(lexStrings);
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(List.of(
				new CoopRankingData(coopResultId, "last team", "map", 1, 90000, 5, 6, 1000000L, memberIds)));
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(member1, "player"));

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollAfter(49, 20, memberId);

			// then
			assertThat(response.hasNext()).isFalse();
			assertThat(response.nextCursor()).isNull();
			assertThat(response.rankings()).hasSize(1);
			assertThat(response.rankings().get(0).rank()).isEqualTo(50);
		}
	}

	@Nested
	class getCoopRankingScrollBefore_위_방향_스크롤 {

		@Test
		void beforeRank_이전_항목을_반환한다() {
			// given
			UUID member1 = UUID.randomUUID();
			List<String> memberIds = List.of(member1.toString());

			// beforeRank=10, size=5 → endIdx=8, startIdx=3 → 6개 조회 (hasPrev 판별용)
			// 6개가 반환되면 hasPrev=true (6 > 5), pageLexStrings는 index 1~5 (5개)
			String prevIndicatorId = UUID.randomUUID().toString();
			String coopResultId1 = UUID.randomUUID().toString();
			String coopResultId2 = UUID.randomUUID().toString();
			String coopResultId3 = UUID.randomUUID().toString();
			String coopResultId4 = UUID.randomUUID().toString();
			String coopResultId5 = UUID.randomUUID().toString();

			List<String> lexStrings = List.of(
				"000060000:0001:0001:1000000:" + prevIndicatorId, // hasPrev indicator (will be skipped)
				"000061000:0001:0002:1000001:" + coopResultId1,
				"000062000:0001:0003:1000002:" + coopResultId2,
				"000063000:0001:0004:1000003:" + coopResultId3,
				"000064000:0002:0001:1000004:" + coopResultId4,
				"000065000:0002:0002:1000005:" + coopResultId5);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);
			given(coopRankingRedisRepository.getRangeByRank(anyString(), eq(3L), eq(8L))).willReturn(lexStrings);
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(List.of(
				new CoopRankingData(coopResultId1, "team1", "map1", 2, 61000, 1, 2, 1000001L, memberIds),
				new CoopRankingData(coopResultId2, "team2", "map2", 2, 62000, 1, 3, 1000002L, memberIds),
				new CoopRankingData(coopResultId3, "team3", "map3", 2, 63000, 1, 4, 1000003L, memberIds),
				new CoopRankingData(coopResultId4, "team4", "map4", 2, 64000, 2, 1, 1000004L, memberIds),
				new CoopRankingData(coopResultId5, "team5", "map5", 2, 65000, 2, 2, 1000005L, memberIds)));
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(member1, "player"));

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollBefore(10, 5, memberId);

			// then
			assertThat(response.rankings()).hasSize(5);
			assertThat(response.rankings().get(0).rank()).isEqualTo(5); // pageStartRank = startIdx+2 = 5
			assertThat(response.hasPrev()).isTrue();
			assertThat(response.prevCursor()).isEqualTo(5);
			assertThat(response.hasNext()).isTrue();
			assertThat(response.nextCursor()).isEqualTo(9); // endIdx + 1 = 9
		}

		@Test
		void beforeRank가_1이면_빈_응답을_반환한다() {
			// given
			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(100L);

			// when
			CoopRankingScrollResponse response = coopRankingService.getCoopRankingScrollBefore(1, 5, memberId);

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
				UUID.randomUUID().toString(),
				"test team",
				"test map",
				3,
				60000,
				2,
				3,
				1000000L,
				List.of(UUID.randomUUID().toString(), UUID.randomUUID().toString()));

			// when
			coopRankingService.registerCoopRanking(data);

			// then
			then(coopRankingRedisRepository).should().register(anyString(), eq(data));
		}

		@Test
		void 멤버_닉네임은_가나다순으로_정렬된다() {
			// given
			String coopResultId = UUID.randomUUID().toString();
			UUID member1 = UUID.randomUUID();
			UUID member2 = UUID.randomUUID();
			UUID member3 = UUID.randomUUID();
			UUID member4 = UUID.randomUUID();

			List<String> memberIds = List.of(
				member1.toString(), member2.toString(), member3.toString(), member4.toString());

			List<String> lexStrings = List.of("000060000:0001:0002:1000000:" + coopResultId);
			CoopRankingData data = new CoopRankingData(coopResultId, "team", "map", 3,
				60000, 1, 2, 1000000L, memberIds);

			given(coopRankingRedisRepository.getTotalCount(anyString())).willReturn(1L);
			given(coopRankingRedisRepository.getTopEntries(anyString(), eq(3))).willReturn(lexStrings);
			given(coopRankingRedisRepository.getDataBatch(anyString(), anyList())).willReturn(List.of(data));
			given(coopRankingRedisRepository.getMemberCoopResultIds(anyString(), eq(memberId))).willReturn(Set.of());

			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of(
				member1, "찬호",
				member2, "가영",
				member3, "민수",
				member4, "다은"));

			// when
			CoopRankingInitialResponse response = coopRankingService.getCoopRanking(memberId);

			// then
			assertThat(response.top3()).hasSize(1);
			List<String> nicknames = response.top3().get(0).members().stream()
				.map(m -> m.nickname())
				.toList();
			// 가나다순: 가영, 다은, 민수, 찬호
			assertThat(nicknames).containsExactly("가영", "다은", "민수", "찬호");
		}
	}
}
