package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.coop.entity.CoopMap;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CoopMapRepositoryImpl implements CoopMapRepository {

	private final CoopMapJpaRepository coopMapJpaRepository;

	@Override
	public List<CoopMap> findAll() {
		return coopMapJpaRepository.findAll();
	}

	@Override
	public Optional<CoopMap> findById(UUID mapId) {
		return coopMapJpaRepository.findById(mapId);
	}
}
