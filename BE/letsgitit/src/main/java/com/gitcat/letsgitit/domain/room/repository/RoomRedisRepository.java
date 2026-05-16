package com.gitcat.letsgitit.domain.room.repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.global.enums.GameMode;

public interface RoomRedisRepository {

	// ── 방 생성/코드 관련 ─────────────────────────────────────────────────────

	Long generateRoomId();

	boolean reserveRoomCode(String roomCode);

	void confirmRoomCode(String roomCode, String roomId);

	void deleteRoomCode(String roomCode);

	// ── 방 정보 Hash (room:{roomId}:info) ────────────────────────────────────

	void saveRoomInfo(String roomId, Map<String, Object> roomInfo);

	void updateRoomInfo(String roomId, Map<String, Object> roomInfo);

	Optional<Map<Object, Object>> getRoomInfo(String roomId);

	// ── 멤버 Hash (room:{roomId}:members) ────────────────────────────────────

	boolean saveMemberIfNotInAnyRoom(String roomId, String memberId, Map<String, Object> memberInfo);

	void saveMember(String roomId, String memberId, Map<String, Object> memberInfo);

	Map<Object, Object> getMembers(String roomId);

	long getMembersCount(String roomId);

	// ── 방 목록 ZSet (room:list:{MODE}) ──────────────────────────────────────

	void addRoomToList(GameMode mode, String roomId, double score);

	// ── 방 삭제 (생성 실패 롤백용) ───────────────────────────────────────────

	void deleteRoom(Long roomId);

	// ── room:list ZSet에서 전체 roomId 조회 후 각 room:{id}:info Hash를 읽어 반환

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

	// 특정 플레이어가 현재 참여 중인 방 조회
	Optional<Long> findJoinedRoomId(String playerId);

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

	// room:{roomId}:password:verified:{memberId} String 존재 여부 조회 — 비밀방 입장 가능 여부 확인
	boolean isPasswordVerified(String memberId, Long roomId);

	// room:{roomId}:info Hash의 roomState 필드 단건 조회
	String findRoomStateById(Long roomId);

	// room:{roomId}:info Hash의 mode 필드 단건 조회
	String findModeById(Long roomId);

	// room:{roomId}:members Hash에서 hostId를 제외한 isReady=true 멤버 수 반환
	long countReadyNonHostMembers(Long roomId, String hostId);

	// room:{roomId}:info Hash의 roomState 필드 갱신
	void updateRoomState(Long roomId, String state);

	// room:{roomId}:info Hash에 gameSessionId 필드 저장
	void saveGameSessionId(Long roomId, String gameSessionId);

	// room:{roomId}:info Hash의 selectedMapId 필드 단건 조회 — 협력 모드 맵 식별용
	String findSelectedMapId(Long roomId);

	// room:{roomId}:members Hash의 특정 playerId 의 isReady 필드를 갱신
	void updateMemberIsReady(String roomId, String memberId, boolean isReady);

	// room:{roomId}:members Hash의 특정 playerId 의 isHost=true, isReady=true 갱신 — 방장 위임 시 호출
	void updateMemberToHost(String roomId, String memberId);

	// room:{roomId}:members Hash의 특정 playerId 의 isHost=false, isReady=false 갱신 — 이전 방장 해제 시 호출
	void updateMemberFromHost(String roomId, String memberId);
}
