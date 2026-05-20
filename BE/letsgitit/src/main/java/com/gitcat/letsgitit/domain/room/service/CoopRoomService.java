package com.gitcat.letsgitit.domain.room.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.room.dto.request.CreateCoopRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateCoopRoomInfoRequest;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateCoopRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinCoopRoomResponse;

public interface CoopRoomService {

	CreateCoopRoomResponse createCoopRoom(UUID memberId, CreateCoopRoomRequest request);

	JoinCoopRoomResponse joinCoopRoom(UUID memberId, Long roomId);

	void updateCoopRoomInfo(UUID memberId, Long roomId, UpdateCoopRoomInfoRequest request);

	CoopRoomInfoResponse getCoopRoomInfo(UUID memberId, Long roomId);
}
