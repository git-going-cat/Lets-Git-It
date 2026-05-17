package com.gitcat.letsgitit.domain.command.repository;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSetItem;

public interface CommandSetItemRepository {
	List<CompetitiveCommandSetItem> findAllByCommandSetId(UUID commandSetId);
}
