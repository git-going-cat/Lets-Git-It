package com.gitcat.letsgitit.domain.single.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.single.entity.SingleCommandSetItem;

public interface SingleCommandSetItemJpaRepository extends JpaRepository<SingleCommandSetItem, UUID> {

	List<SingleCommandSetItem> findAllBySingleCommandSetIdOrderBySequenceAsc(UUID singleCommandSetId);
}
