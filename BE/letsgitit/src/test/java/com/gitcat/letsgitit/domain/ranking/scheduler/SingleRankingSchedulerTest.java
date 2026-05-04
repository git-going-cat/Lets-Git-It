package com.gitcat.letsgitit.domain.ranking.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
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

import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRepository;

@ExtendWith(MockitoExtension.class)
class SingleRankingSchedulerTest {

	@Mock
	private SingleRankingRedisRepository singleRankingRedisRepository;

	@Mock
	private SingleRankingRepository singleRankingRepository;

	@InjectMocks
	private SingleRankingScheduler scheduler;

	@BeforeEach
	void setUp() {
		TransactionSynchronizationManager.initSynchronization();
	}

	@AfterEach
	void tearDown() {
		TransactionSynchronizationManager.clearSynchronization();
	}

	@Test
	void 정산_시_Redis_데이터를_RDB에_저장하고_키를_삭제한다() {
		// given — EASY/HARD는 비어있고 NORMAL만 데이터 있음
		UUID id1 = UUID.randomUUID(), id2 = UUID.randomUUID(), id3 = UUID.randomUUID();
		List<RankEntry> normalEntries = List.of(
			new RankEntry(id1.toString(), 9800),
			new RankEntry(id2.toString(), 9200),
			new RankEntry(id3.toString(), 8700));

		given(singleRankingRedisRepository.getTotalCount(anyString()))
			.willReturn(0L) // EASY
			.willReturn(3L) // NORMAL
			.willReturn(0L); // HARD
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(0L), anyLong()))
			.willReturn(normalEntries);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList()))
			.willReturn(Map.of());

		// when
		scheduler.settleSingleRanking();
		TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());

		// then — NORMAL만 saveAll 1회, deleteKey 2회 (ZSet 키 + grade 키)
		verify(singleRankingRepository, times(1)).saveAll(anyList());
		verify(singleRankingRedisRepository, times(2)).deleteKey(anyString());
	}

	@Test
	void 정산_시_rank는_Redis_순서_기반으로_1부터_순서대로_부여된다() {
		// given — EASY에만 3개 데이터 (내림차순 정렬 가정)
		UUID id1 = UUID.randomUUID(), id2 = UUID.randomUUID(), id3 = UUID.randomUUID();
		List<RankEntry> entries = List.of(
			new RankEntry(id1.toString(), 9800), // 1위
			new RankEntry(id2.toString(), 9200), // 2위
			new RankEntry(id3.toString(), 8700)); // 3위

		given(singleRankingRedisRepository.getTotalCount(anyString()))
			.willReturn(3L) // EASY
			.willReturn(0L) // NORMAL
			.willReturn(0L); // HARD
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(0L), anyLong()))
			.willReturn(entries);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList()))
			.willReturn(Map.of());

		ArgumentCaptor<List<SingleRanking>> captor = ArgumentCaptor.forClass(List.class);

		// when
		scheduler.settleSingleRanking();

		// then
		verify(singleRankingRepository).saveAll(captor.capture());
		List<SingleRanking> saved = captor.getValue();

		assertThat(saved).hasSize(3);
		assertThat(saved.get(0).getRank()).isEqualTo(1);
		assertThat(saved.get(1).getRank()).isEqualTo(2);
		assertThat(saved.get(2).getRank()).isEqualTo(3);
	}

	@Test
	void 정산_시_score가_올바르게_반올림되어_저장된다() {
		// given — score 9800.6 → 9801로 저장
		UUID id1 = UUID.randomUUID();
		List<RankEntry> entries = List.of(new RankEntry(id1.toString(), 9800.6));

		given(singleRankingRedisRepository.getTotalCount(anyString()))
			.willReturn(1L) // EASY
			.willReturn(0L) // NORMAL
			.willReturn(0L); // HARD
		given(singleRankingRedisRepository.getRangeByRank(anyString(), eq(0L), anyLong()))
			.willReturn(entries);
		given(singleRankingRedisRepository.getGrades(anyString(), anyList()))
			.willReturn(Map.of());

		ArgumentCaptor<List<SingleRanking>> captor = ArgumentCaptor.forClass(List.class);

		// when
		scheduler.settleSingleRanking();

		// then
		verify(singleRankingRepository).saveAll(captor.capture());
		assertThat(captor.getValue().get(0).getScore()).isEqualTo(9801);
	}

	@Test
	void 정산_시_모든_난이도가_비어있으면_저장이_발생하지_않는다() {
		// given — 3개 난이도 모두 빈 ZSet
		given(singleRankingRedisRepository.getTotalCount(anyString())).willReturn(0L);

		// when
		scheduler.settleSingleRanking();

		// then
		verify(singleRankingRepository, never()).saveAll(anyList());
		verify(singleRankingRedisRepository, never()).deleteKey(anyString());
	}
}
