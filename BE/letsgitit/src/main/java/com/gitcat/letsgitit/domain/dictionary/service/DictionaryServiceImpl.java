package com.gitcat.letsgitit.domain.dictionary.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.dictionary.dto.response.DictionaryCommandResponse;
import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommand;
import com.gitcat.letsgitit.domain.dictionary.repository.DictionaryCommandRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DictionaryServiceImpl implements DictionaryService {

	private final DictionaryCommandRepository dictionaryCommandRepository;

	@Override
	@Transactional(readOnly = true)
	public DictionaryCommandResponse getCommands() {
		List<DictionaryCommand> commands = dictionaryCommandRepository.findAllWithOptions();
		return DictionaryCommandResponse.of(commands);
	}
}
