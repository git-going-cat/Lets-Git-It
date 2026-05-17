package com.gitcat.letsgitit.domain.command.repository;

import java.util.List;

import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSet;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

public interface CommandSetRepository {
	List<CompetitiveCommandSet> findAllByMode(CompetitiveMode mode);
}
