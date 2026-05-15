package com.gitcat.letsgitit.domain.room.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.gitcat.letsgitit.domain.room.dto.RoomCache;

public interface RoomRedisRepository {

	// room:list ZSet에서 전체 roomId 조회 후 각 room:{id}:info Hash를 읽어 반환
	List<RoomCache> findAll();

	// room:{roomId}:info Hash 존재 여부 확인 — 방 존재 검증 시 사용
	boolean existsById(Long roomId);

	// room:{roomId}:info Hash의 password 필드 단건 조회 — 평문 비밀번호 검증 시 사용
	String findPasswordById(Long roomId);

	// room:code:{code} String 역인덱스로 roomId 조회 후 room:{id}:info Hash 반환
	Optional<RoomCache> findByCode(String code);

	// room:{roomId}:info Hash의 hostId 필드 조회 — 방장 권한 검증 시 사용
	String findHostIdById(Long roomId);

	// room:{roomId}:members Hash에 해당 playerId key 존재 여부 확인
	boolean existsMember(Long roomId, String playerId);

	// room:{roomId}:members Hash에서 playerId 제거 + currentPlayers 감소
	void removeMember(Long roomId, String playerId);

	// room:{roomId}:members Hash의 전체 playerId 목록 반환 — 방장 위임 시 다음 방장 선정에 사용
	Set<String> findAllMemberIds(Long roomId);

	// room:{roomId}:info의 hostId 갱신 — 방장 위임 시 호출
	void updateHostId(Long roomId, String newHostId);

	// 방 해체 — room:info, room:members, room:code:{code}, room:list 일괄 삭제
	void dissolveRoom(Long roomId);

	// room:{roomId}:password:verified:{memberId} String 저장 (TTL: 5분) — 비밀방 입장 전 검증 완료 표시
	void savePasswordVerified(String memberId, Long roomId);
}
