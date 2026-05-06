package com.gitcat.letsgitit.domain.dictionary.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.domain.dictionary.dto.response.DictionaryCommandResponse;
import com.gitcat.letsgitit.domain.dictionary.service.DictionaryService;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/dictionary")
public class DictionaryController implements DictionaryControllerDocs {

	private final DictionaryService dictionaryService;

	@Override
	@GetMapping("/commands")
	public ResponseEntity<?> getCommands() {
		DictionaryCommandResponse response = dictionaryService.getCommands();
		return ApiResponse.ok("도감 조회 성공", response);
	}
}
