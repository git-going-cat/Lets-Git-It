package com.gitcat.letsgitit.domain.room.controller;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.domain.room.dto.request.CreateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.CreateCoopRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.PasswordVerifyRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateCoopRoomInfoRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateContributionRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateCoopRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinContributionRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinCoopRoomResponse;
import com.gitcat.letsgitit.domain.room.service.ContributionRoomService;
import com.gitcat.letsgitit.domain.room.service.CoopRoomService;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.global.enums.RoomMode;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController implements RoomControllerDocs {

	private final RoomService roomService;
	private final ContributionRoomService contributionRoomService;
	private final CoopRoomService coopRoomService;

	@Override
	@PostMapping("/contribution")
	public ResponseEntity<?> createContributionRoom(@AuthenticationPrincipal
	CustomUserDetails userDetails, @Valid @RequestBody
	CreateContributionRoomRequest request) {
		UUID memberId = userDetails.getMemberId();

		CreateContributionRoomResponse response = contributionRoomService.createContributionRoom(memberId, request);

		return ApiResponse.create("기여도 뺏기 모드 방 생성 성공", response);
	}

	@Override
	@PostMapping("/coop")
	public ResponseEntity<?> createCoopRoom(@AuthenticationPrincipal
	CustomUserDetails userDetails, @Valid @RequestBody
	CreateCoopRoomRequest request) {
		UUID memberId = userDetails.getMemberId();
		CreateCoopRoomResponse response = coopRoomService.createCoopRoom(memberId, request);
		return ApiResponse.create("협력 모드 방 생성 성공", response);
	}

	@Override
	@GetMapping
	public ResponseEntity<?> getRooms(
		@RequestParam(required = false, defaultValue = "ALL")
		RoomMode mode) {
		return ApiResponse.ok("방 목록 조회 성공", roomService.getRooms(mode));
	}

	@Override
	@GetMapping("/coop/maps")
	public ResponseEntity<?> getCoopMaps() {
		return ApiResponse.ok("맵 목록 조회 성공", roomService.getCoopMaps());
	}

	@Override
	@GetMapping("/search")
	public ResponseEntity<?> searchRoom(
		@RequestParam
		String code) {
		return ApiResponse.ok("방 코드로 검색 성공", roomService.searchByCode(code));
	}

	@Override
	@PostMapping("/{roomId}/password/verify")
	public ResponseEntity<?> verifyRoomPassword(
		@PathVariable
		Long roomId,
		@RequestBody @Valid
		PasswordVerifyRequest request,
		@AuthenticationPrincipal
		CustomUserDetails userDetails) {
		roomService.verifyRoomPassword(roomId, request.password(), userDetails.getMemberId());
		return ApiResponse.ok("비밀번호 확인 성공");
	}

	@Override
	@PostMapping("/{roomId}/contribution/join")
	public ResponseEntity<?> joinContributionRoom(@AuthenticationPrincipal
	CustomUserDetails userDetails, @PathVariable
	Long roomId) {
		UUID memberId = userDetails.getMemberId();
		JoinContributionRoomResponse response = contributionRoomService.joinContributionRoom(memberId, roomId);
		return ApiResponse.ok("기여도 뺏기 방 입장 성공", response);
	}

	@Override
	@PostMapping("/{roomId}/coop/join")
	public ResponseEntity<?> joinCoopRoom(@AuthenticationPrincipal
	CustomUserDetails userDetails, @PathVariable
	Long roomId) {
		UUID memberId = userDetails.getMemberId();
		JoinCoopRoomResponse response = coopRoomService.joinCoopRoom(memberId, roomId);
		return ApiResponse.ok("방 입장 성공", response);
	}

	@Override
	@DeleteMapping("/{roomId}/leave")
	public ResponseEntity<?> leaveRoom(
		@PathVariable
		Long roomId,
		@AuthenticationPrincipal
		CustomUserDetails userDetails) {
		roomService.leaveRoom(roomId, userDetails.getMemberId());
		return ApiResponse.ok("방 나가기 성공");
	}

	@Override
	@PatchMapping("/{roomId}/contribution")
	public ResponseEntity<?> updateContributionRoom(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@PathVariable
		Long roomId,
		@RequestBody @Valid
		UpdateContributionRoomRequest request) {
		UUID memberId = userDetails.getMemberId();
		contributionRoomService.updateContributionRoomInfo(memberId, roomId, request);
		return ApiResponse.ok("방 정보 수정 성공");
	}

	@Override
	@PatchMapping("/{roomId}/coop")
	public ResponseEntity<?> updateCoopRoom(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@PathVariable
		Long roomId,
		@RequestBody @Valid
		UpdateCoopRoomInfoRequest request) {
		UUID memberId = userDetails.getMemberId();
		coopRoomService.updateCoopRoomInfo(memberId, roomId, request);
		return ApiResponse.ok("방 정보 수정 성공");
	}

	@Override
	@DeleteMapping("/{roomId}/members/{playerId}")
	public ResponseEntity<?> kickMember(
		@PathVariable
		Long roomId,
		@PathVariable
		String playerId,
		@AuthenticationPrincipal
		CustomUserDetails userDetails) {
		roomService.kickMember(roomId, userDetails.getMemberId(), playerId);
		return ApiResponse.ok("추방 성공");
	}

	@Override
	@GetMapping("/{roomId}/contribution/state")
	public ResponseEntity<?> getContributionRoomState(@AuthenticationPrincipal
	CustomUserDetails userDetails,
		@PathVariable
		Long roomId) {
		UUID memberId = userDetails.getMemberId();
		ContributionRoomInfoResponse response = contributionRoomService.getContributionRoomInfo(memberId, roomId);
		return ApiResponse.ok("방 상태 조회 성공", response);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/{roomId}/coop/state")
	public ResponseEntity<?> getCoopRoomState(@AuthenticationPrincipal
	CustomUserDetails userDetails,
		@PathVariable
		Long roomId) {
		UUID memberId = userDetails.getMemberId();
		CoopRoomInfoResponse response = coopRoomService.getCoopRoomInfo(memberId, roomId);
		return ApiResponse.ok("방 상태 조회 성공", response);
	}
}
