package com.gitcat.letsgitit.domain.ranking.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.domain.ranking.repository.CompetitiveRankingRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.ContributionRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

@ExtendWith(MockitoExtension.class)
class ContributionRankingSchedulerTest {

	@Mock
	private ContributionRankingRedisRepository contributionRankingRedisRepository;

	@Mock
	private CompetitiveRankingRepository competitiveRankingRepository;

	@InjectMocks
	private ContributionRankingScheduler scheduler;

	@BeforeEach
	void setUp() {
		TransactionSynchronizationManager.initSynchronization();
	}

	@AfterEach
	void tearDown() {
		TransactionSynchronizationManager.clearSynchronization();
	}

	@Test
	void 정산_시_Redis_데이터를_RDB에_저장하고_커밋_후_키를_삭제한다() {
		UUID id1 = UUID.randomUUID();
		UUID id2 = UUID.randomUUID();
		List<RankEntry> entries = List.of(
			new RankEntry(id1.toString(), 1000.0),
			new RankEntry(id2.toString(), 900.0));

		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(2L);
		given(competitiveRankingRepository.countByModeAndWeek(eq(CompetitiveMode.CONTRIBUTION), anyString()))
			.willReturn(0L);
		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(1L))).willReturn(entries);
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList()))
			.willReturn(Map.of(id1, 12000, id2, 11000));
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList()))
			.willReturn(Map.of(id1, 10, id2, 12));

		scheduler.settleContributionRanking();

		verify(competitiveRankingRepository, times(1)).saveAll(anyList());
		verify(contributionRankingRedisRepository, never()).deleteKeys(anyString(), anyString(), anyString(),
			anyString());

		TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());

		verify(contributionRankingRedisRepository, times(1)).deleteKeys(anyString(), anyString(), anyString(),
			anyString());
	}

	@Test
	void 정산_시_rank는_Redis_순서_기반으로_1부터_순서대로_부여된다() {
		UUID id1 = UUID.randomUUID();
		UUID id2 = UUID.randomUUID();
		UUID id3 = UUID.randomUUID();
		List<RankEntry> entries = List.of(
			new RankEntry(id1.toString(), 1000.0),
			new RankEntry(id2.toString(), 950.0),
			new RankEntry(id3.toString(), 900.0));

		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(3L);
		given(competitiveRankingRepository.countByModeAndWeek(eq(CompetitiveMode.CONTRIBUTION), anyString()))
			.willReturn(0L);
		given(contributionRankingRedisRepository.getRangeByRank(anyString(), eq(0L), eq(2L))).willReturn(entries);
		given(contributionRankingRedisRepository.getContributions(anyString(), anyList()))
			.willReturn(Map.of(id1, 12000, id2, 11000, id3, 10000));
		given(contributionRankingRedisRepository.getPlayCounts(anyString(), anyList()))
			.willReturn(Map.of(id1, 10, id2, 11, id3, 12));

		ArgumentCaptor<List<CompetitiveRanking>> captor = ArgumentCaptor.forClass(List.class);

		scheduler.settleContributionRanking();

		verify(competitiveRankingRepository).saveAll(captor.capture());
		List<CompetitiveRanking> saved = captor.getValue();

		assertThat(saved).hasSize(3);
		assertThat(saved.get(0).getRank()).isEqualTo(1);
		assertThat(saved.get(1).getRank()).isEqualTo(2);
		assertThat(saved.get(2).getRank()).isEqualTo(3);
		assertThat(saved.get(0).getScore()).isEqualTo(12000);
		assertThat(saved.get(0).getPlayCount()).isEqualTo(10);
	}

	@Test
	void 이미_정산된_주차면_중복_저장하지_않고_커밋_후_Redis_키만_삭제한다() {
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(5L);
		given(competitiveRankingRepository.countByModeAndWeek(eq(CompetitiveMode.CONTRIBUTION), anyString()))
			.willReturn(1L);

		scheduler.settleContributionRanking();

		verify(competitiveRankingRepository, never()).saveAll(anyList());
		verify(contributionRankingRedisRepository, never()).deleteKeys(anyString(), anyString(), anyString(),
			anyString());

		TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());

		verify(contributionRankingRedisRepository, times(1)).deleteKeys(anyString(), anyString(), anyString(),
			anyString());
	}

	@Test
	void Redis_데이터가_없으면_저장과_삭제가_발생하지_않는다() {
		given(contributionRankingRedisRepository.getTotalCount(anyString())).willReturn(0L);

		scheduler.settleContributionRanking();

		verify(competitiveRankingRepository, never()).saveAll(anyList());
		verify(contributionRankingRedisRepository, never()).deleteKeys(anyString(), anyString(), anyString(),
			anyString());
	}
}
