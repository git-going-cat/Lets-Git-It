package com.gitcat.letsgitit.domain.single.controller;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.domain.single.dto.request.SingleSessionStartRequest;
import com.gitcat.letsgitit.domain.single.dto.response.SingleSessionStartResponse;
import com.gitcat.letsgitit.domain.single.service.SingleService;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/single")
public class SingleController implements SingleControllerDocs {

	private final SingleService singleService;

	@Override
	@PostMapping("/sessions")
	public ResponseEntity<?> startSession(
		@AuthenticationPrincipal
		CustomUserDetails userDetails, @Valid @RequestBody
		SingleSessionStartRequest request) {
		UUID memberId = userDetails.getMemberId();

		SingleSessionStartResponse response = singleService.startSession(memberId, request);
		return ApiResponse.ok("싱글 게임 세션 생성 성공", response);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/sessions/{sessionId}/result")
	public ResponseEntity<?> saveResult(
		@PathVariable
		String sessionId,
		@RequestBody
		Map<String, Object> body) {
		if ("NOTFOUND".equals(sessionId)) {
			throw new BusinessException(SESSION_NOT_FOUND);
		}
		if ("EXPIRED".equals(sessionId)) {
			throw new BusinessException(SESSION_EXPIRED);
		}
		if ("FINISHED".equals(sessionId)) {
			throw new BusinessException(ALREADY_FINISHED);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("isNewRecord", true);
		return ApiResponse.ok("게임 결과 저장 성공", data);
	}
}
