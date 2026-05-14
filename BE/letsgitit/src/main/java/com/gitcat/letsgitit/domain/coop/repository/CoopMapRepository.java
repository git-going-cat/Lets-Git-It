package com.gitcat.letsgitit.domain.coop.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.coop.entity.CoopMap;

public interface CoopMapRepository extends JpaRepository<CoopMap, UUID> {

}
