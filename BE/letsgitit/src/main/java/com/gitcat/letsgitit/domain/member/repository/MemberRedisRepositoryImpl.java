package com.gitcat.letsgitit.domain.member.repository;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("!test")
public class MemberRedisRepositoryImpl implements MemberRedisRepository {

	// 비밀번호 검증 완료 상태 유지 시간
	// 너무 길면 토큰 탈취 후 Redis 키만으로 변경 가능한 위험, 5분으로 제한
	private static final long PASSWORD_VERIFIED_TTL_MINUTES = 5;

	private final StringRedisTemplate authStringRedisTemplate;

	// 비밀번호 검증 상태는 인증(auth) 관련 데이터이므로
	// game/ranking Redis가 아닌 auth Redis에 저장
	public MemberRedisRepositoryImpl(
		@Qualifier("authStringRedisTemplate")
		StringRedisTemplate authStringRedisTemplate) {
		this.authStringRedisTemplate = authStringRedisTemplate;
	}

	// 예시: "member:password:verified:550e8400-e29b-41d4-a716-446655440000"
	private String passwordVerifiedKey(String memberId) {
		return "member:password:verified:" + memberId;
	}

	@Override
	public void savePasswordVerified(String memberId) {
		authStringRedisTemplate.opsForValue()
			.set(passwordVerifiedKey(memberId), "true",
				PASSWORD_VERIFIED_TTL_MINUTES, TimeUnit.MINUTES);
	}

	@Override
	public boolean isPasswordVerified(String memberId) {
		return Boolean.TRUE.equals(
			authStringRedisTemplate.hasKey(passwordVerifiedKey(memberId)));
	}

	@Override
	public void deletePasswordVerified(String memberId) {
		authStringRedisTemplate.delete(passwordVerifiedKey(memberId));
	}
}
