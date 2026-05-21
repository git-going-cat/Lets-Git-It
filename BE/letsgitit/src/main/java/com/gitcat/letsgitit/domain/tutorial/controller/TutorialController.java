package com.gitcat.letsgitit.domain.tutorial.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.domain.tutorial.dto.response.TutorialResponse;
import com.gitcat.letsgitit.domain.tutorial.service.TutorialService;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/tutorial")
public class TutorialController implements TutorialControllerDocs {

	private final TutorialService tutorialService;

	@Override
	@GetMapping
	public ResponseEntity<?> getTutorial() {
		TutorialResponse response = tutorialService.getTutorial();
		return ApiResponse.ok("튜토리얼 조회 성공", response);
	}
}
