package com.gitcat.letsgitit.domain.single.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.single.entity.SingleCommandSet;
import com.gitcat.letsgitit.domain.single.entity.SingleCommandSetItem;
import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SingleCommandSetRepositoryImpl implements SingleCommandSetRepository {

	private final SingleCommandSetJpaRepository singleCommandSetJpaRepository;
	private final SingleCommandSetItemJpaRepository singleCommandSetItemJpaRepository;

	@Override
	public List<SingleCommandSet> findAllByDifficulty(Difficulty difficulty) {
		return singleCommandSetJpaRepository.findAllByDifficulty(difficulty);
	}

	@Override
	public List<SingleCommandSetItem> findAllBySingleCommandSetIdOrderBySequenceAsc(UUID singleCommandSetId) {
		return singleCommandSetItemJpaRepository.findAllBySingleCommandSetIdOrderBySequenceAsc(singleCommandSetId);
	}
}
