package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.coop.entity.CoopCommandSetItem;

public interface CoopCommandSetItemJpaRepository extends JpaRepository<CoopCommandSetItem, UUID> {

	List<CoopCommandSetItem> findByCoopMapIdAndRoundOrderBySequenceAsc(UUID coopMapId, int round);
}
