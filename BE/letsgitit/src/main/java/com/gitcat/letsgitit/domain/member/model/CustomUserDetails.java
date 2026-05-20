package com.gitcat.letsgitit.domain.member.model;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.gitcat.letsgitit.domain.member.entity.Member;

import lombok.Getter;

@Getter
public class CustomUserDetails implements UserDetails {

	private final UUID memberId;
	private final String email;
	private final String password;
	private final String nickname;

	public static CustomUserDetails from(Member member) {
		return new CustomUserDetails(
			member.getId(),
			member.getEmail(),
			member.getPassword() != null ? member.getPassword() : "",
			member.getNickname() != null ? member.getNickname() : "");
	}

	private CustomUserDetails(UUID memberId, String email, String password, String nickname) {
		this.memberId = memberId;
		this.email = email;
		this.password = password;
		this.nickname = nickname;
	}

	// Spring Security가 인증 시 사용하는 식별자 — email로 설정
	@Override
	public String getUsername() {
		return email;
	}

	@Override
	public String getPassword() {
		return password;
	}

	// 현재 역할 구분 없음
	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return Collections.emptyList();
	}

	// 아래 4개는 현재 사용 안 함 — 필요 시 Member 엔티티 필드 연동
	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		return true;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	@Override
	public boolean isEnabled() {
		return true;
	}
}
