package com.gitcat.letsgitit.domain.member.controller;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.domain.auth.service.AuthService;
import com.gitcat.letsgitit.domain.member.dto.request.ChangePasswordRequest;
import com.gitcat.letsgitit.domain.member.dto.request.NicknameRequest;
import com.gitcat.letsgitit.domain.member.dto.request.SaveCharacterRequest;
import com.gitcat.letsgitit.domain.member.dto.request.VerifyPasswordRequest;
import com.gitcat.letsgitit.domain.member.dto.request.WithdrawRequest;
import com.gitcat.letsgitit.domain.member.dto.response.MemberProfileResponse;
import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/members")
public class MemberController implements MemberControllerDocs {

	private final MemberService memberService;
	private final AuthService authService;

	@Override
	@PostMapping("/me/tutorial")
	public ResponseEntity<?> completeTutorial(@AuthenticationPrincipal
	CustomUserDetails userDetails) {
		UUID memberId = userDetails.getMemberId();

		memberService.endTutorial(memberId);
		return ApiResponse.ok("튜토리얼 완료");
	}

	@Override
	@GetMapping("/me")
	public ResponseEntity<?> getMyInfo(@AuthenticationPrincipal
	CustomUserDetails userDetails) {
		UUID memberId = userDetails.getMemberId();

		MemberProfileResponse response = memberService.getProfile(memberId);
		return ApiResponse.ok("내 정보 조회 성공", response);
	}

	@Override
	@PatchMapping("/me/character")
	public ResponseEntity<?> saveCharacter(@AuthenticationPrincipal
	CustomUserDetails userDetails,
		@Valid @RequestBody
		SaveCharacterRequest request) {
		UUID memberId = userDetails.getMemberId();

		memberService.saveCharacterAssets(memberId, request);
		return ApiResponse.ok("캐릭터 에셋 저장 성공");
	}

	@Override
	@PostMapping("/me/nickname")
	public ResponseEntity<?> saveNickname(@AuthenticationPrincipal
	CustomUserDetails userDetails,
		@Valid @RequestBody
		NicknameRequest request) {
		UUID memberId = userDetails.getMemberId();

		memberService.saveNickname(memberId, request);
		return ApiResponse.ok("닉네임 저장 성공");
	}

	@Override
	@PatchMapping("/me/nickname")
	public ResponseEntity<?> updateNickname(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@Valid @RequestBody
		NicknameRequest request) {
		UUID memberId = userDetails.getMemberId();

		memberService.updateNickname(memberId, request);
		return ApiResponse.ok("닉네임 변경 성공");
	}

	@Override
	@GetMapping("/nickname/check")
	public ResponseEntity<?> checkNickname(
		@RequestParam @NotBlank(message = "닉네임을 입력해주세요.") @Size(min = 2, max = 6, message = "닉네임은 2~6자여야 합니다.") @Pattern(regexp = "^[가-힣a-zA-Z0-9]+$", message = "닉네임은 한글, 영문, 숫자만 사용 가능합니다.")
		String nickname) {
		memberService.validateNicknameDuplicate(nickname);
		return ApiResponse.ok("사용할 수 있는 닉네임");
	}

	// 기존 코드 교체
	@Override
	@DeleteMapping("/withdraw")
	public ResponseEntity<?> withdraw(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@RequestBody
		WithdrawRequest request,
		HttpServletRequest httpRequest,
		HttpServletResponse httpResponse) {

		// Authorization 헤더에서 AT 추출 (AuthController.logout 패턴 동일)
		String bearerToken = httpRequest.getHeader("Authorization");
		if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
			throw new BusinessException(INVALID_TOKEN);
		}

		String accessToken = bearerToken.substring(7);
		UUID memberId = userDetails.getMemberId();

		memberService.withdraw(memberId, request.password());
		authService.logout(accessToken, httpResponse);

		return ApiResponse.ok("회원탈퇴 성공");
	}

	@Override
	@PostMapping("/me/password/verify")
	public ResponseEntity<?> verifyPassword(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@Valid @RequestBody
		VerifyPasswordRequest request) {
		// memberId 기반으로 Redis 키를 저장하므로 userDetails에서 memberId 추출
		memberService.verifyPassword(userDetails.getMemberId(), request.password());
		return ApiResponse.ok("비밀번호 검증 성공");
	}

	@Override
	@PatchMapping("/me/password/reset")
	public ResponseEntity<?> changePassword(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@Valid @RequestBody
		ChangePasswordRequest request) {
		memberService.changePassword(
			userDetails.getMemberId(),
			request.currentPassword(),
			request.newPassword());
		return ApiResponse.ok("비밀번호 변경 성공");
	}
}
