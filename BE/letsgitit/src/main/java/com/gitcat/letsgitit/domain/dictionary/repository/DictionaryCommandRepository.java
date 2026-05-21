package com.gitcat.letsgitit.domain.dictionary.repository;

import java.util.List;

import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommand;

public interface DictionaryCommandRepository {

	List<DictionaryCommand> findAllWithOptions();
}
