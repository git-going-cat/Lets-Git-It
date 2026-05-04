package com.gitcat.letsgitit.domain.single.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.single.entity.SingleCommandSet;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleCommandSetJpaRepository extends JpaRepository<SingleCommandSet, UUID> {

	List<SingleCommandSet> findAllByDifficulty(Difficulty difficulty);
}
