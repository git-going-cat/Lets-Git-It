package com.gitcat.letsgitit.domain.auth.dto.response;

import java.time.LocalDateTime;

import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.entity.enums.OnboardingStatus;

public class AuthResponse {

	// ===================== 이메일 인증 코드 발송 =====================
	public record SendEmailCodeResponse(
		LocalDateTime expiredAt // 인증 코드 만료 시각
	) {
	}

	// ===================== 로그인 응답 =====================
	// refreshToken은 HttpOnly Cookie로만 내려가므로 body에 포함하지 않음
	public record LoginResponse(
		String accessToken,
		boolean isFirstLogin, // nickname이 null이면 최초 로그인으로 판단
		boolean isReactivated,
		String nickname,
		OnboardingStatus onboardingStatus,
		String characterHair,
		String characterHairColor,
		String characterBody,
		String characterEye,
		String characterOutfit,
		String characterOutfitColor) {
		// Member 엔티티 → LoginResponse 변환 팩토리 메서드
		// Controller에서 LoginResponse.from(member, accessToken) 한 줄로 처리 가능
		public static LoginResponse from(Member member, String accessToken, boolean isReactivated) {
			return new LoginResponse(
				accessToken,
				member.getNickname() == null,
				isReactivated,
				member.getNickname(),
				member.getOnboardingStatus(),
				member.getCharacterHair(),
				member.getCharacterHairColor(),
				member.getCharacterBody(),
				member.getCharacterEye(),
				member.getCharacterOutfit(),
				member.getCharacterOutfitColor());
		}
	}

	// ===================== 토큰 재발급 =====================
	public record ReissueResponse(
		String accessToken) {
	}
}
