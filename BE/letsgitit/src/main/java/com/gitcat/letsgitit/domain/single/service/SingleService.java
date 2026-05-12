package com.gitcat.letsgitit.domain.single.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.single.dto.request.SingleResultSaveRequest;
import com.gitcat.letsgitit.domain.single.dto.request.SingleSessionStartRequest;
import com.gitcat.letsgitit.domain.single.dto.response.SingleResultResponse;
import com.gitcat.letsgitit.domain.single.dto.response.SingleSessionStartResponse;

public interface SingleService {

	SingleSessionStartResponse startSession(UUID memberId, SingleSessionStartRequest request);

	SingleResultResponse saveResult(UUID memberId, String sessionId, SingleResultSaveRequest request);

	void terminateSession(UUID memberId, String sessionId);
}
