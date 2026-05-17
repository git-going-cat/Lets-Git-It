package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.coop.entity.CoopCommandSetItem;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CoopCommandSetItemRepositoryImpl implements CoopCommandSetItemRepository {

	private final CoopCommandSetItemJpaRepository jpaRepository;

	@Override
	public List<CoopCommandSetItem> findByMapIdAndRound(UUID coopMapId, int round) {
		return jpaRepository.findByCoopMapIdAndRoundOrderBySequenceAsc(coopMapId, round);
	}
}
