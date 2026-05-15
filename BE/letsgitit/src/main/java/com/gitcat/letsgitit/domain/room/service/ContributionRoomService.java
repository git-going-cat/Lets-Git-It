package com.gitcat.letsgitit.domain.room.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.room.dto.request.CreateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateContributionRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinContributionRoomResponse;

public interface ContributionRoomService {

	CreateContributionRoomResponse createContributionRoom(UUID memberId, CreateContributionRoomRequest request);

	JoinContributionRoomResponse joinContributionRoom(UUID memberId, Long roomId);

	void updateContributionRoomInfo(UUID memberId, Long roomId, UpdateContributionRoomRequest request);

	ContributionRoomInfoResponse getContributionRoomInfo(UUID memberId, Long roomId);
}
