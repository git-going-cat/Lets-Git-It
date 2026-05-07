package com.gitcat.letsgitit.domain.auth.service;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.member.dto.response.OAuthMemberResponse;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.global.enums.Provider;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

	private final MemberService memberService;

	@Override
	@Transactional
	public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
		// 1. 구글에서 유저 정보 가져오기
		DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
		OAuth2User oAuth2User = delegate.loadUser(userRequest);

		Map<String, Object> attributes = oAuth2User.getAttributes();
		String providerId = (String)attributes.get("sub"); // 구글 고유 ID
		String email = (String)attributes.get("email");

		// 2. 신규면 자동 가입, 기존이면 조회, 재활성화 케이스 처리
		//    로컬 계정과 이메일 충돌 시 BusinessException → OAuth2AuthenticationException으로 변환
		OAuthMemberResponse result;
		try {
			result = memberService.findOrCreateOAuthMember(email, Provider.GOOGLE, providerId);
		} catch (BusinessException e) {
			throw new OAuth2AuthenticationException(
				new OAuth2Error(e.getErrorCode().getCode(), e.getErrorCode().getMessage(), null));
		}

		log.debug("OAuth2 유저 로드 완료. email: {}, provider: GOOGLE", email);

		// 3. memberId, isReactivated를 attributes에 추가
		//    memberId → SuccessHandler에서 Redis 임시코드 저장 시 사용
		//    isReactivated → SuccessHandler에서 Redis에 재활성화 여부 저장 시 사용
		Map<String, Object> augmentedAttributes = new HashMap<>(attributes);
		augmentedAttributes.put("memberId", result.member().getId().toString());
		augmentedAttributes.put("isReactivated", result.isReactivated());

		// 4. Spring Security가 인증 컨텍스트에 저장할 OAuth2User 반환
		//    nameAttributeKey는 application.yml의 user-name-attribute (= "sub")
		return new DefaultOAuth2User(
			Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
			augmentedAttributes,
			"sub");
	}
}
