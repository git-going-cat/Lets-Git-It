package com.gitcat.letsgitit.domain.ranking.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
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

import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.CoopRankingRepository;

@ExtendWith(MockitoExtension.class)
class CoopRankingSchedulerTest {

	@Mock
	private CoopRankingRedisRepository coopRankingRedisRepository;

	@Mock
	private CoopRankingRepository coopRankingRepository;

	@InjectMocks
	private CoopRankingScheduler scheduler;

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
		UUID coopResultId1 = UUID.randomUUID();
		UUID coopResultId2 = UUID.randomUUID();
		String week = "2026-05-3";

		List<String> lexStrings = List.of(
			"000061000:0001:0002:0123456:" + coopResultId1,
			"000083000:0003:0005:0123457:" + coopResultId2);

		given(coopRankingRedisRepository.getTotalCount(week)).willReturn(2L);
		given(coopRankingRedisRepository.getAllMemberKeys(week)).willReturn(Set.of("member-1", "member-2"));
		given(coopRankingRepository.countByWeek(week)).willReturn(0L);
		given(coopRankingRedisRepository.getRangeByRank(week, 0L, 1L)).willReturn(lexStrings);
		given(coopRankingRedisRepository.getDataBatch(week,
			List.of(coopResultId1.toString(), coopResultId2.toString()))).willReturn(List.of(
				new CoopRankingData(coopResultId1.toString(), "git masters", "기초 브랜치", 3, 61_000, 1, 2,
					123456L, List.of(UUID.randomUUID().toString(), UUID.randomUUID().toString())),
				new CoopRankingData(coopResultId2.toString(), "merge crew", "rebase 실전", 2, 83_000, 3, 5,
					123457L, List.of(UUID.randomUUID().toString(), UUID.randomUUID().toString()))));

		scheduler.settleCoopRankingManual(week);

		verify(coopRankingRepository, times(1)).saveAll(anyList());
		verify(coopRankingRedisRepository, never()).deleteKeys(anyString(), anyString(), anyString(), anyString());

		TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());

		verify(coopRankingRedisRepository, times(1)).deleteKeys(anyString(), anyString(), anyString(), anyString(),
			anyString(), anyString());
	}

	@Test
	void 정산_시_rank는_Redis_순서_기반으로_1부터_순서대로_부여된다() {
		UUID coopResultId1 = UUID.randomUUID();
		UUID coopResultId2 = UUID.randomUUID();
		UUID coopResultId3 = UUID.randomUUID();
		String week = "2026-05-3";

		List<String> lexStrings = List.of(
			"000061000:0001:0002:0123456:" + coopResultId1,
			"000083000:0003:0005:0123457:" + coopResultId2,
			"000095000:0004:0005:0123458:" + coopResultId3);

		given(coopRankingRedisRepository.getTotalCount(week)).willReturn(3L);
		given(coopRankingRedisRepository.getAllMemberKeys(week)).willReturn(Set.of());
		given(coopRankingRepository.countByWeek(week)).willReturn(0L);
		given(coopRankingRedisRepository.getRangeByRank(week, 0L, 2L)).willReturn(lexStrings);
		given(coopRankingRedisRepository.getDataBatch(week,
			List.of(coopResultId1.toString(), coopResultId2.toString(), coopResultId3.toString()))).willReturn(
				List.of(
					new CoopRankingData(coopResultId1.toString(), "A", "map1", 3, 61_000, 1, 2, 1L, List.of()),
					new CoopRankingData(coopResultId2.toString(), "B", "map2", 2, 83_000, 3, 5, 2L, List.of()),
					new CoopRankingData(coopResultId3.toString(), "C", "map3", 1, 95_000, 4, 5, 3L, List.of())));

		ArgumentCaptor<List<CoopRanking>> captor = ArgumentCaptor.forClass(List.class);

		scheduler.settleCoopRankingManual(week);

		verify(coopRankingRepository).saveAll(captor.capture());
		List<CoopRanking> saved = captor.getValue();

		assertThat(saved).hasSize(3);
		assertThat(saved.get(0).getRank()).isEqualTo(1);
		assertThat(saved.get(1).getRank()).isEqualTo(2);
		assertThat(saved.get(2).getRank()).isEqualTo(3);
		assertThat(saved.get(0).getElapsedTime()).isEqualTo(61_000);
		assertThat(saved.get(0).getTotalWrongOrderCount()).isEqualTo(1);
		assertThat(saved.get(0).getTotalWrongTypeCount()).isEqualTo(2);
	}

	@Test
	void 이미_정산된_주차면_중복_저장하지_않고_커밋_후_Redis_키만_삭제한다() {
		String week = "2026-05-3";

		given(coopRankingRedisRepository.getTotalCount(week)).willReturn(5L);
		given(coopRankingRedisRepository.getAllMemberKeys(week)).willReturn(Set.of("member-1"));
		given(coopRankingRepository.countByWeek(week)).willReturn(1L);

		scheduler.settleCoopRankingManual(week);

		verify(coopRankingRepository, never()).saveAll(anyList());
		verify(coopRankingRedisRepository, never()).deleteKeys(anyString(), anyString(), anyString(), anyString());

		TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());

		verify(coopRankingRedisRepository, times(1)).deleteKeys(anyString(), anyString(), anyString(), anyString(),
			anyString());
	}

	@Test
	void Redis_데이터가_없으면_저장과_삭제가_발생하지_않는다() {
		String week = "2026-05-3";

		given(coopRankingRedisRepository.getTotalCount(week)).willReturn(0L);

		scheduler.settleCoopRankingManual(week);

		verify(coopRankingRepository, never()).saveAll(anyList());
		verify(coopRankingRedisRepository, never()).deleteKeys(anyString());
	}

	@Test
	void 정산_데이터가_누락되면_해당_항목을_건너뛰고_정산을_완료한다() {
		UUID coopResultId = UUID.randomUUID();
		String week = "2026-05-3";
		List<String> lexStrings = List.of("000061000:0001:0002:0123456:" + coopResultId);

		List<CoopRankingData> nullList = new ArrayList<>();
		nullList.add(null); // Hash miss → null 포함 리스트

		given(coopRankingRedisRepository.getTotalCount(week)).willReturn(1L);
		given(coopRankingRedisRepository.getAllMemberKeys(week)).willReturn(Set.of("member-1"));
		given(coopRankingRepository.countByWeek(week)).willReturn(0L);
		given(coopRankingRedisRepository.getRangeByRank(week, 0L, 0L)).willReturn(lexStrings);
		given(coopRankingRedisRepository.getDataBatch(week, List.of(coopResultId.toString())))
			.willReturn(nullList);

		// 예외 없이 정산 완료 — orphan 항목은 skip
		scheduler.settleCoopRankingManual(week);

		verify(coopRankingRepository, times(1)).saveAll(List.of()); // 건너뛴 항목만 있으므로 빈 리스트 저장
		assertThat(TransactionSynchronizationManager.getSynchronizations()).isNotEmpty(); // Redis 삭제 등록됨
	}
}
