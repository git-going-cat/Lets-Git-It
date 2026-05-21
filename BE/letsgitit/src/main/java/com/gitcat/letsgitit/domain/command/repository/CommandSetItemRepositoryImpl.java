package com.gitcat.letsgitit.domain.command.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSetItem;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CommandSetItemRepositoryImpl implements CommandSetItemRepository {

	private final CompetitiveCommandSetItemJpaRepository jpaRepository;

	@Override
	public List<CompetitiveCommandSetItem> findAllByCommandSetId(UUID commandSetId) {
		return jpaRepository.findAllByCompetitiveCommandSetIdOrderBySequenceAsc(commandSetId);
	}
}
