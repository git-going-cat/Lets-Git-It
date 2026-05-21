package com.gitcat.letsgitit.domain.single.repository;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.single.entity.SingleCommandSet;
import com.gitcat.letsgitit.domain.single.entity.SingleCommandSetItem;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleCommandSetRepository {

	List<SingleCommandSet> findAllByDifficulty(Difficulty difficulty);

	List<SingleCommandSetItem> findAllBySingleCommandSetIdOrderBySequenceAsc(UUID singleCommandSetId);
}
