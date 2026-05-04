package com.gitcat.letsgitit.global.jwt;

import java.util.Date;
import javax.crypto.SecretKey;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtProvider {

	@Value("${jwt.secret}")
	private String secretString; // yml에서 주입받은 비밀키 문자열

	@Value("${jwt.access-expiration}")
	private long accessExpiration; // Access Token 만료 시간 (ms)

	@Value("${jwt.refresh-expiration}")
	private long refreshExpiration; // Refresh Token 만료 시간 (ms)

	private SecretKey secretKey; // 실제 서명에 사용하는 키 객체

	// 빈 초기화 시점에 문자열 → SecretKey 변환
	// @PostConstruct: 의존성 주입이 완료된 직후 1회 실행
	@PostConstruct
	public void init() {
		this.secretKey = Keys.hmacShaKeyFor(secretString.getBytes());
	}

	/**
	 * Access Token 생성
	 * - subject: 이 토큰의 주인 (이메일)
	 * - issuedAt: 발급 시각
	 * - expiration: 만료 시각 (발급 시각 + accessExpiration)
	 * - signWith: 비밀키로 서명 → 위변조 감지 가능
	 */
	public String createAccessToken(String email) {
		Date now = new Date();
		return Jwts.builder()
			.subject(email)
			.claim("type", "access") // 토큰 타입 명시 (재발급 API에서 refresh 토큰이 들어오는 것 방지)
			.issuedAt(now)
			.expiration(new Date(now.getTime() + accessExpiration))
			.signWith(secretKey)
			.compact();
	}

	/**
	 * Refresh Token 생성
	 * - Access Token과 구조 동일하지만 만료 시간이 훨씬 긺
	 * - 서버에서는 이 토큰을 Redis에 저장해두고, 재발급 요청 시 비교함
	 */
	public String createRefreshToken(String email) {
		Date now = new Date();
		return Jwts.builder()
			.subject(email)
			.claim("type", "refresh")
			.issuedAt(now)
			.expiration(new Date(now.getTime() + refreshExpiration))
			.signWith(secretKey)
			.compact();
	}

	/**
	 * 토큰에서 이메일(subject) 추출
	 * - 토큰 payload에 담긴 subject 값을 꺼냄
	 * - 이 이메일로 DB에서 유저를 조회함
	 */
	public String getEmail(String token) {
		return parseClaims(token).getSubject();
	}

	/**
	 * 토큰 유효성 검증
	 * - 서명이 맞는지 (위변조 여부)
	 * - 만료되지 않았는지
	 * - 형식이 올바른지
	 * 모두 통과해야 true 반환
	 */
	public boolean validateToken(String token) {
		try {
			parseClaims(token); // 파싱 자체가 검증 역할도 함
			return true;
		} catch (ExpiredJwtException e) {
			// 만료된 토큰 → 재발급 필요
			throw e; // 필터에서 만료 여부를 따로 처리해야 하므로 던짐
		} catch (JwtException | IllegalArgumentException e) {
			// 서명 오류, 형식 오류, 지원하지 않는 토큰, 빈 토큰 등 모든 JWT 예외
			return false;
		}
	}

	/**
	 * 토큰의 남은 만료 시간 (ms) 반환
	 * - 로그아웃 시 블랙리스트 TTL 설정에 사용
	 */
	public long getExpiration(String token) {
		try {
			Date expiration = parseClaims(token).getExpiration();
			return expiration.getTime() - System.currentTimeMillis();
		} catch (ExpiredJwtException e) {
			return -1L; // 이미 만료됐으면 -1 반환
		}
	}

	// JWT 파싱 공통 로직 (내부 전용)
	private Claims parseClaims(String token) {
		return Jwts.parser()
			.verifyWith(secretKey)
			.build()
			.parseSignedClaims(token)
			.getPayload();
	}
}
