package com.gitcat.letsgitit.domain.member.repository;

public interface MemberRedisRepository {

	// ===================== 비밀번호 검증 완료 상태 =====================

	// 검증 성공 시 저장 (TTL: 5분)
	// key: member:password:verified:{memberId}
	// email 기반이 아닌 memberId 기반인 이유:
	// changePassword는 JWT → memberId로 사용자를 식별하므로 키도 memberId로 통일
	void savePasswordVerified(String memberId);

	// 검증 완료 여부 확인 — 키 존재 여부로 판단
	boolean isPasswordVerified(String memberId);

	// 변경 완료 후 즉시 삭제 — 같은 키로 재사용 방지
	void deletePasswordVerified(String memberId);
}
