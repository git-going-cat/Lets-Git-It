package com.gitcat.letsgitit.domain.command.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSet;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CommandSetRepositoryImpl implements CommandSetRepository {

	private final CompetitiveCommandSetJpaRepository jpaRepository;

	@Override
	public List<CompetitiveCommandSet> findAllByMode(CompetitiveMode mode) {
		return jpaRepository.findAllByMode(mode);
	}
}
