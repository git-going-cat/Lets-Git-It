package com.gitcat.letsgitit.domain.member.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsServiceImpl implements CustomUserDetailsService {

	private final MemberRepository memberRepository;

	@Override
	public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
		Member member = memberRepository.findByEmail(email)
			.orElseThrow(() -> new BusinessException(ErrorCode.AUTH_MEMBER_NOT_FOUND));

		// User.builder() → CustomUserDetails.from()으로 변경
		// memberId를 담아야 필터에서 Redis AT 조회 가능
		return CustomUserDetails.from(member);
	}
}
