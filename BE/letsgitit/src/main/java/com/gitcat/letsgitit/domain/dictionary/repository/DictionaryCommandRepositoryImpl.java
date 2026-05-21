package com.gitcat.letsgitit.domain.dictionary.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommand;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class DictionaryCommandRepositoryImpl implements DictionaryCommandRepository {

	private final DictionaryCommandJpaRepository dictionaryCommandJpaRepository;

	@Override
	public List<DictionaryCommand> findAllWithOptions() {
		return dictionaryCommandJpaRepository.findAllWithOptions();
	}
}
