package com.gitcat.letsgitit.domain.member.controller;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/members")
public class MemberController implements MemberControllerDocs {

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/me/tutorial")
	public ResponseEntity<?> completeTutorial() {
		return ApiResponse.ok("튜토리얼 완료");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/me")
	public ResponseEntity<?> getMyInfo() {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("nickname", "dobby");
		data.put("authType", "LOCAL");
		data.put("email", "user@example.com");
		data.put("totalPlayTime", 37200);
		data.put("characterHair", "hair_01");
		data.put("characterHairColor", "color_black");
		data.put("characterBody", "body_default");
		data.put("characterEye", "eye_01");
		data.put("characterOutfit", "outfit_01");
		data.put("characterOutfitColor", "color_white");
		data.put("records", List.of(
			Map.of("mode", "SINGLE_EASY", "bestScore", 9500, "bestRank", 12),
			Map.of("mode", "SINGLE_NORMAL", "bestScore", 7200, "bestRank", 45),
			Map.of("mode", "SINGLE_HARD", "bestScore", 5100, "bestRank", 103),
			Map.of("mode", "CONTRIBUTION_RUN", "totalContribution", 88000, "bestRank", 7),
			Map.of("mode", "TIME_ATTACK", "totalCount", 10500, "bestRank", 3),
			Map.of("mode", "COOP", "bestClearTime", 61000, "bestRank", 2)));
		return ApiResponse.ok("내 정보 조회 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PatchMapping("/me/character")
	public ResponseEntity<?> saveCharacter(@RequestBody
	Map<String, Object> body) {
		return ApiResponse.ok("캐릭터 에셋 저장 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/me/nickname")
	public ResponseEntity<?> saveNickname(@RequestBody
	Map<String, Object> body) {
		String nickname = (String)body.getOrDefault("nickname", "");
		if ("taken".equals(nickname)) {
			throw new BusinessException(NICKNAME_DUPLICATED);
		}
		if ("a".equals(nickname)) {
			throw new BusinessException(NICKNAME_INVALID);
		}
		return ApiResponse.ok("닉네임 저장 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PatchMapping("/me/nickname")
	public ResponseEntity<?> updateNickname(@RequestBody
	Map<String, Object> body) {
		String nickname = (String)body.getOrDefault("nickname", "");
		if ("taken".equals(nickname)) {
			throw new BusinessException(NICKNAME_DUPLICATED);
		}
		return ApiResponse.ok("닉네임 변경 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/nickname/check")
	public ResponseEntity<?> checkNickname(@RequestParam
	String nickname) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("isAvailable", true);
		return ApiResponse.ok("닉네임 중복 확인 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@DeleteMapping("/me")
	public ResponseEntity<?> withdraw() {
		return ApiResponse.ok("회원탈퇴 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PatchMapping("/me/password")
	public ResponseEntity<?> changePassword(@RequestBody
	Map<String, Object> body) {
		String newPassword = (String)body.getOrDefault("newPassword", "");
		if ("weak".equals(newPassword)) {
			throw new BusinessException(INVALID_PASSWORD_FORMAT);
		}
		if ("samepass".equals(newPassword)) {
			throw new BusinessException(SAME_AS_CURRENT_PASSWORD);
		}
		return ApiResponse.ok("비밀번호 변경 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/me/password/verify")
	public ResponseEntity<?> verifyPassword(@RequestBody
	Map<String, Object> body) {
		String password = (String)body.getOrDefault("password", "");
		if ("wrongpass".equals(password)) {
			throw new BusinessException(PASSWORD_MISMATCH);
		}
		if ("oauth".equals(password)) {
			throw new BusinessException(OAUTH_ACCOUNT);
		}
		return ApiResponse.ok("비밀번호 검증 성공");
	}
}
