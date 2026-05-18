package com.gitcat.letsgitit.domain.competitive.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DataIntegrityViolationException;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionRankingCache;
import com.gitcat.letsgitit.domain.competitive.entity.ContributionResult;
import com.gitcat.letsgitit.domain.competitive.entity.ContributionResultMember;
import com.gitcat.letsgitit.domain.competitive.repository.ContributionResultMemberRepository;
import com.gitcat.letsgitit.domain.competitive.repository.ContributionResultRepository;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.record.service.RecordService;

class ContributionResultSaveServiceImplTest {

	private static final Long ROOM_ID = 42L;
	private static final UUID GAME_SESSION_ID = UUID.randomUUID();
	private static final UUID PLAYER_ID = UUID.randomUUID();
	private static final UUID OTHER_PLAYER_ID = UUID.randomUUID();
	private static final long START_AT = System.currentTimeMillis() - 60_000L;

	@Mock
	private ContributionResultRepository contributionResultRepository;

	@Mock
	private ContributionResultMemberRepository contributionResultMemberRepository;

	@Mock
	private MemberService memberService;

	@Mock
	private RecordService recordService;

	private ContributionResultSaveServiceImpl service;

	@BeforeEach
	void setUp() {
		MockitoAnnotations.openMocks(this);
		service = new ContributionResultSaveServiceImpl(
			contributionResultRepository,
			contributionResultMemberRepository,
			memberService,
			recordService);
	}

	@Test
	void 정상_종료_rankings로_결과와_플레이어별_결과를_저장한다() {
		// given
		when(contributionResultRepository.existsBySessionId(GAME_SESSION_ID.toString())).thenReturn(false);
		when(contributionResultRepository.save(any(ContributionResult.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		// when
		service.saveCompletedResult(ROOM_ID, GAME_SESSION_ID, rankings(), START_AT);

		// then
		ArgumentCaptor<ContributionResult> resultCaptor = ArgumentCaptor.forClass(ContributionResult.class);
		verify(contributionResultRepository).save(resultCaptor.capture());
		assertThat(resultCaptor.getValue().getRoomId()).isEqualTo(ROOM_ID);
		assertThat(resultCaptor.getValue().getSessionId()).isEqualTo(GAME_SESSION_ID.toString());
		assertThat(resultCaptor.getValue().getPlayedAt()).isNotNull();

		ArgumentCaptor<List<ContributionResultMember>> membersCaptor = ArgumentCaptor.captor();
		verify(contributionResultMemberRepository).saveAll(membersCaptor.capture());
		assertThat(membersCaptor.getValue()).hasSize(2);
	}

	@Test
	void CAT은_결과_멤버에_저장하지_않는다() {
		// given
		when(contributionResultRepository.existsBySessionId(GAME_SESSION_ID.toString())).thenReturn(false);
		when(contributionResultRepository.save(any(ContributionResult.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		// when
		service.saveCompletedResult(ROOM_ID, GAME_SESSION_ID, rankings(), START_AT);

		// then
		ArgumentCaptor<List<ContributionResultMember>> membersCaptor = ArgumentCaptor.captor();
		verify(contributionResultMemberRepository).saveAll(membersCaptor.capture());
		assertThat(membersCaptor.getValue())
			.extracting(ContributionResultMember::getMemberId)
			.containsExactlyInAnyOrder(PLAYER_ID, OTHER_PLAYER_ID);
	}

	@Test
	void 같은_sessionId가_이미_저장되어_있으면_중복_저장하지_않는다() {
		// given
		when(contributionResultRepository.existsBySessionId(GAME_SESSION_ID.toString())).thenReturn(true);

		// when
		service.saveCompletedResult(ROOM_ID, GAME_SESSION_ID, rankings(), START_AT);

		// then
		verify(contributionResultRepository, never()).save(any());
		verify(contributionResultMemberRepository, never()).saveAll(any());
	}

	@Test
	void 플레이어_contribution이_정확히_매핑된다() {
		// given
		when(contributionResultRepository.existsBySessionId(GAME_SESSION_ID.toString())).thenReturn(false);
		when(contributionResultRepository.save(any(ContributionResult.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		// when
		service.saveCompletedResult(ROOM_ID, GAME_SESSION_ID, rankings(), START_AT);

		// then
		ArgumentCaptor<List<ContributionResultMember>> membersCaptor = ArgumentCaptor.captor();
		verify(contributionResultMemberRepository).saveAll(membersCaptor.capture());
		assertThat(membersCaptor.getValue())
			.anySatisfy(member -> {
				assertThat(member.getMemberId()).isEqualTo(PLAYER_ID);
				assertThat(member.getContribution()).isEqualTo(60);
			})
			.anySatisfy(member -> {
				assertThat(member.getMemberId()).isEqualTo(OTHER_PLAYER_ID);
				assertThat(member.getContribution()).isEqualTo(20);
			});
	}

	@Test
	void 실제_플레이어에게_플레이_시간_누적_및_최고_기록_갱신을_호출한다() {
		// given
		when(contributionResultRepository.existsBySessionId(GAME_SESSION_ID.toString())).thenReturn(false);
		when(contributionResultRepository.save(any(ContributionResult.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		// when
		service.saveCompletedResult(ROOM_ID, GAME_SESSION_ID, rankings(), START_AT);

		// then — CAT 제외 실제 플레이어(2명)에게만 호출
		verify(memberService, times(2)).addPlayTime(any(UUID.class), anyInt());
		verify(memberService).addPlayTime(eq(PLAYER_ID), anyInt());
		verify(memberService).addPlayTime(eq(OTHER_PLAYER_ID), anyInt());

		verify(recordService, times(2)).updateContributionBestRecord(any(UUID.class), anyInt(), anyInt());
		verify(recordService).updateContributionBestRecord(eq(PLAYER_ID), eq(60), eq(1));
		verify(recordService).updateContributionBestRecord(eq(OTHER_PLAYER_ID), eq(20), eq(2));
	}

	@Test
	void DB_unique_충돌이_발생해도_idempotent하게_처리한다() {
		// given
		when(contributionResultRepository.existsBySessionId(GAME_SESSION_ID.toString()))
			.thenReturn(false, true);
		when(contributionResultRepository.save(any(ContributionResult.class)))
			.thenThrow(new DataIntegrityViolationException("duplicate session"));

		// when
		service.saveCompletedResult(ROOM_ID, GAME_SESSION_ID, rankings(), START_AT);

		// then
		verify(contributionResultMemberRepository, never()).saveAll(any());
	}

	@Test
	void sessionId_중복이_아닌_무결성_예외는_다시_던진다() {
		// given
		when(contributionResultRepository.existsBySessionId(GAME_SESSION_ID.toString()))
			.thenReturn(false, false);
		when(contributionResultRepository.save(any(ContributionResult.class)))
			.thenThrow(new DataIntegrityViolationException("constraint violation"));

		// when & then
		assertThatThrownBy(() -> service.saveCompletedResult(ROOM_ID, GAME_SESSION_ID, rankings(), START_AT))
			.isInstanceOf(DataIntegrityViolationException.class);
		verify(contributionResultMemberRepository, never()).saveAll(any());
	}

	private List<ContributionRankingCache> rankings() {
		return List.of(
			new ContributionRankingCache(1, PLAYER_ID, "dobby", 60, false),
			new ContributionRankingCache(2, null, "[CAT]", 20, false),
			new ContributionRankingCache(2, OTHER_PLAYER_ID, "alice", 20, false));
	}
}
