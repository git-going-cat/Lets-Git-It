package com.gitcat.letsgitit.domain.member.service;

import org.springframework.security.core.userdetails.UserDetailsService;

// Spring Security의 UserDetailsService를 상속받는 인터페이스
// UserDetailsService 자체가 이미 인터페이스라 메서드 추가 없이 상속만 해도 됨
// 나중에 member 관련 커스텀 메서드가 생기면 여기에 추가
public interface CustomUserDetailsService extends UserDetailsService {}
