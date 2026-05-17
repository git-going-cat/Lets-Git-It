package com.gitcat.letsgitit.domain.coop.repository;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.coop.entity.CoopResult;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CoopResultRepositoryImpl implements CoopResultRepository {

	private final CoopResultJpaRepository jpaRepository;

	@Override
	public CoopResult save(CoopResult coopResult) {
		return jpaRepository.save(coopResult);
	}
}
