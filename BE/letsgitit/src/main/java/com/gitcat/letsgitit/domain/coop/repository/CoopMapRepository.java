package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.entity.CoopMap;

public interface CoopMapRepository {

	List<CoopMap> findAll();

	Optional<CoopMap> findById(UUID mapId);
}
